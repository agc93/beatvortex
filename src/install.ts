import { IInstallResult, IExtensionApi, IProfile, ThunkStore, IDeployedFile, IInstruction, ISupportedResult } from 'vortex-api/lib/types/api';
import { toInstructions } from "vortex-ext-common";
import { BeatModsClient } from "./beatModsClient";
import { GAME_ID } from '.';
import path from 'path';
import { log, actions } from 'vortex-api';
import { InstructionType } from 'vortex-api/lib/extensions/mod_management/types/IInstallResult';
import { BeatSaverClient } from './beatSaverClient';
import { getCustomFolder, ModelType, ModelSaberClient } from './modelSaberClient';
import { isSongMod, isModelMod, isGameMod } from './util';

// export interface FileInstaller {
//     (api: IExtensionApi, files: string[], rootPath: string, enrich: MetadataSource): IInstruction[];
// }

export interface ModInstaller {
    (api: IExtensionApi, files: string[], archiveRoot: string, modName: string, enrich: MetadataSource) : Promise<IInstruction>;
}

export interface MetadataSource {
    (modName: string) : Promise<IInstruction[]>;
}

export interface ModHandler {
    testContent(files: string[], gameId: string): Promise<ISupportedResult>;
    enrich: MetadataSource;
    installer(files: string[], archiveRoot: string, modName: string, enrich: MetadataSource) : Promise<IInstruction[]>;
};

export async function testMapContent(files: string[], gameId: string): Promise<ISupportedResult> {
    var supported = isSongMod(files) && gameId == GAME_ID;
    return {supported, requiredFiles: []}
}

export async function testModelContent(files: string[], gameId: string): Promise<ISupportedResult> {
    var supported = gameId == GAME_ID && isModelMod(files);
    return {supported, requiredFiles: []};
}

export async function testPluginContent(files: string[], gameId: string): Promise<ISupportedResult> {
    var supported = gameId == GAME_ID && isGameMod(files);
    return {supported, requiredFiles: []};
}


export async function basicInstaller(files: string[], rootPath: string, modName: string, enrich?: MetadataSource) : Promise<IInstruction[]> {
    rootPath = rootPath ?? '';
    var instructions = files.map((file: string): IInstruction => {
        return {
            type: 'copy',
            source: file,
            destination: file,
        };
    });
    instructions.push(...await enrich?.(modName));
    return instructions;
}

export async function modelInstaller(files: string[], rootPath: string, modName: string, enrich: MetadataSource) : Promise<IInstruction[]> {
    var file = files[0];
    var instructions: IInstruction[] = [
        {
            type: 'copy',
            source: file,
            destination: `${getCustomFolder(path.extname(file).replace('.', '') as ModelType)}/${file}`
        }
    ];
    instructions.push(...await enrich?.(modName));
    return instructions;
}


export async function archiveInstaller(files: string[], rootPath: string, modName: string, enrich: MetadataSource) : Promise<IInstruction[]> {
    let firstType = path.dirname(rootPath);
    let root = path.dirname(firstType);
    log('info', `found good archive root at ${root}`);
    //firstType is the first primitive we found (i.e. Plugins or whatever)
    //root is that directory's parent, which might include more than one primitive
    const filtered = files.filter(file => (((root == "." ? true : (file.indexOf(root) !== -1)) && (!file.endsWith(path.sep)))));
    log('debug', 'filtered non-rooted files', { root: root, candidates: filtered });
    let instructions = filtered.map(file => {
        // log('debug', 'mapping file to instruction', { file: file, root: root });
        const destination = file.substr(firstType.indexOf(path.basename(firstType)));
        return {
            type: 'copy' as InstructionType,
            source: file,
            // I don't think ⬇ conditional is needed, but frankly it works now and I'm afraid to touch it.
            destination: `${root == "." ? file : destination}`
        } as IInstruction
    });
    instructions.push(...await enrich?.(modName));
    return instructions;
}

export async function installBeatModsArchive(modName: string) : Promise<IInstruction[]> {
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
    var instructions = toInstructions(modAtrributes);
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
    return instructions;
    // api.store.dispatch(actions.setModAttributes(GAME_ID, modName, modAtrributes));
}

export async function installBeatSaverArchive(modName: string) : Promise<IInstruction[]> {
    let instructions : IInstruction[] = [];
    if (BeatSaverClient.isArchiveName(modName, true)) { //beatsaver.com zip download
        //TODO: this will blow up on web UI archives since they're named weird
        log('debug', 'attempting to get map name from beatsaver.com', {name: modName});
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
    return instructions;
    // destination: `Beat Saber_Data/CustomLevels/${targetName}/${file}` // this should be handled by the modtype now.
}

export async function installModelSaberFile(modName: string) : Promise<IInstruction[]> {
    let instructions : IInstruction[] = [];
    var modelClient = new ModelSaberClient();
    var modelDetails = await modelClient.getModelByFileName(modName);
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
    return instructions;
}