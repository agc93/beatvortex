import { IInstallResult, IExtensionApi, IProfile, ThunkStore, IDeployedFile, IInstruction } from 'vortex-api/lib/types/api';
import { toInstructions } from "./meta";
import { BeatModsClient } from "./beatModsClient";
import { GAME_ID } from '.';
import path from 'path';
import { log, actions } from 'vortex-api';
import { InstructionType } from 'vortex-api/lib/extensions/mod_management/types/IInstallResult';
import { isSongHash } from './util';
import { BeatSaverClient } from './beatSaverClient';
import { getCustomFolder, ModelType, ModelSaberClient } from './modelSaberClient';

export interface FileInstaller {
    (files: string[], rootPath: string): IInstruction[];
}

export interface ModInstaller {
    (api: IExtensionApi, files: string[], archiveRoot: string, modName: string, installer: FileInstaller) : Promise<IInstallResult>;
}


export function basicInstaller(files: string[], rootPath: string) : IInstruction[] {
    rootPath = rootPath ?? '';
    var instructions = files.map((file: string): IInstruction => {
        return {
            type: 'copy',
            source: file,
            destination: file,
        };
    })
    return instructions;
}

export function modelInstaller(files: string[], rootPath: string) : IInstruction[] {
    var file = files[0];
    var instructions: IInstruction[] = [
        {
            type: 'copy',
            source: file,
            destination: `${getCustomFolder(path.extname(file).replace('.', '') as ModelType)}/${file}`
        }
    ];
    return instructions;
}


export function archiveInstaller(files: string[], rootPath: string) : IInstruction[] {
    let firstType = path.dirname(rootPath);
    let root = path.dirname(firstType);
    log('info', `found good archive root at ${root}`);
    //firstType is the first primitive we found (i.e. Plugins or whatever)
    //root is that directory's parent, which might include more than one primitive
    const filtered = files.filter(file => (((root == "." ? true : (file.indexOf(root) !== -1)) && (!file.endsWith(path.sep)))));
    log('debug', 'filtered non-rooted files', { root: root, candidates: filtered });
    const instructions = filtered.map(file => {
        // log('debug', 'mapping file to instruction', { file: file, root: root });
        const destination = file.substr(firstType.indexOf(path.basename(firstType)));
        return {
            type: 'copy' as InstructionType,
            source: file,
            // I don't think ⬇ conditional is needed, but frankly it works now and I'm afraid to touch it.
            destination: `${root == "." ? file : destination}`
        }
    });
    return instructions;
}

export async function installBeatModsArchive(api: IExtensionApi, files: string[], archiveRoot: string, modName: string, installer: FileInstaller) : Promise<IInstallResult> {
    var client = new BeatModsClient();
    var details = await client.getModByFileName(modName);
    var modAtrributes = {
        allowRating: false,
        downloadGame: GAME_ID,
        fileId: details._id,
        modId: details.name,
        modName: details.name,
        description: details.description,
        author: details.author.username,
        logicalFileName: details.name,
        source: "beatmods",
        version: details.version
        };
    var instructions = installer(files, archiveRoot);
    instructions.push(...toInstructions(modAtrributes));
    var depInstructions : IInstruction[] = details.dependencies.map(d => {
        return {
            type: 'rule',
            rule: {
                type: 'requires',
                reference: {
                    logicalFileName: d.name,
                    versionMatch: `^${d.version}`
                }
            }
        }
    });
    log('debug', 'building dependency instructions', depInstructions);
    instructions.push(...depInstructions);
    return {instructions};
    // api.store.dispatch(actions.setModAttributes(GAME_ID, modName, modAtrributes));
}

export async function installBeatSaverArchive(api: IExtensionApi, files: string[], archiveRoot: string, modName: string, installer: FileInstaller) {
    const instructions = installer(files, archiveRoot);
    if (isSongHash(modName, true)) { //beatsaver.com zip download
        log('debug', 'attempting to get map name from beatsaver.com');
        try {
            var mapDetails = await new BeatSaverClient().getMapDetails(modName);
            var mapName = mapDetails?.name 
                ? `${mapDetails.name} [${mapDetails.key}]`
                : modName;
            log('debug', `fetched map ${modName} as ${mapName}`);
            var mapAtrributes = {
                allowRating: false,
                downloadGame: GAME_ID,
                modId: mapDetails.key,
                modName: mapDetails.name,
                description: mapDetails.description,
                author: mapDetails.metadata.levelAuthorName,
                customFileName: mapName,
                logicalFileName: mapDetails.key,
                // source: "beatsaver",
                uploadedTimestamp: mapDetails.uploaded,
                pictureUrl: `https://beatsaver.com${mapDetails.coverURL}`,
                source: 'beatsaver'
              };
            instructions.push(...toInstructions(mapAtrributes));
        } catch (error) {
            // ignored
        }
    }
    // destination: `Beat Saber_Data/CustomLevels/${targetName}/${file}` // this should be handled by the modtype now.
    
    return {instructions};
}

export async function installModelFile(api: IExtensionApi, files: string[], archiveRoot: string, modName: string, installer: FileInstaller) : Promise<IInstallResult> {
    var file = files[0];
    var instructions = installer(files, archiveRoot);
    var modelClient = new ModelSaberClient();
    var modelDetails = await modelClient.getModelByFileName(file);
    log('info', "beatvortex doesn't currently include metadata for manually installed models!");
    if (modelDetails !== null) {
        log('debug', 'Got details on model from ModelSaber!', modelDetails);
        var modelAttributes = {
            allowRating: false,
            downloadGame: GAME_ID,
            modId: modelDetails.id,
            modNam: modelDetails.name,
            author: modelDetails.author,
            customFileName: modelDetails.name,
            logicalFileName: `model:${modelDetails.id}`,
            uploadedTimestamp: modelDetails.date,
            pictureUrl: modelDetails.thumbnail,
            source: 'modelsaber'
        };
        instructions.push(...toInstructions(modelAttributes));
    }
    return {instructions};
}