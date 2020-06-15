import { IInstallResult, IExtensionApi, IProfile, ThunkStore, IDeployedFile, IInstruction, ISupportedResult, IMod } from 'vortex-api/lib/types/api';
import { toInstructions } from "vortex-ext-common";
import { BeatModsClient } from "./beatModsClient";
import { GAME_ID } from '.';
import path from 'path';
import { log, actions, selectors } from 'vortex-api';
import { InstructionType } from 'vortex-api/lib/extensions/mod_management/types/IInstallResult';
import { BeatSaverClient } from './beatSaverClient';
import { getCustomFolder, ModelType, ModelSaberClient } from './modelSaberClient';
import { PlaylistClient } from "./playlistClient";
import { isSongMod, isModelMod, isGameMod, getCurrentProfile, getModName } from './util';
import { installMaps, IPlaylistEntry } from './playlists';

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

/**
 * Tests a given file list for installation as a Beat Saber map.
 * 
 * @param files - The file list for installation
 * @param gameId - The current game ID.
 */
export async function testMapContent(files: string[], gameId: string): Promise<ISupportedResult> {
    var supported = isSongMod(files) && gameId == GAME_ID;
    return {supported, requiredFiles: []}
}

/**
 * Tests a given file list for installation as a Beat Saber custom model.
 * 
 * @param files - The file list for installation
 * @param gameId - The current game ID.
 */
export async function testModelContent(files: string[], gameId: string): Promise<ISupportedResult> {
    var supported = gameId == GAME_ID && isModelMod(files);
    return {supported, requiredFiles: []};
}

/**
 * Tests a given file list for installation as a Beat Saber plugin mod.
 * 
 * @param files - The file list for installation
 * @param gameId - The current game ID.
 */
export async function testPluginContent(files: string[], gameId: string): Promise<ISupportedResult> {
    var supported = gameId == GAME_ID && isGameMod(files);
    return {supported, requiredFiles: []};
}

/**
 * Basic installer that mirrors the default installation behaviour: installs files to the exact same relative paths.
 * 
 * @param files - The file list for installation.
 * @param rootPath - The (detected) root path of the file list.
 * @param modName - Name of the mod being installed
 * @param enrich - Optional source of attribute metadata
 */
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

/**
 * Basic installer for custom model content (platforms, sabers, notes): installs files prefixed with the correct `Custom` folder name.
 * 
 * @param files - The file list for installation.
 * @param rootPath - The (detected) root path of the file list.
 * @param modName - Name of the mod being installed
 * @param enrich - Optional source of attribute metadata
 */
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

/**
 * Installer that handles "rerooting"/filtering mod files to only plugin files, with destination paths set relative to that "root".
 * 
 * @remarks
 * - This method does not do the *detection* of the archive root, only the path manipulation.
 * 
 * @param files - The file list for installation.
 * @param rootPath - The (detected) root path of the file list.
 * @param modName - Name of the mod being installed
 * @param enrich - Optional source of attribute metadata
 */
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

/**
 * Attribute metadata source for BeatMods archives.
 * 
 * @remarks
 * - See implementation for a note on why gameVersion isn't included.
 * - This currently invokes 1 API request per mod.
 * 
 * @param modName - Name of the mod being installed
 */
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
        version: details.version,
        // gameVersion: details.gameVersion, //we shouldn't do this yet. See below.
        uploadedTimestamp: details.uploadDate
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
    /**
     * The game version problem is caused by https://github.com/bsmg/BeatMods-Website/issues/41.
     * We can't store this game version since BeatMods gives us the wrong version. We *could* find
     * out what the latest version is first, and sepcify a version when we ask for the mod, but 
     * that would *double* the BeatMods requests on *every* install, including the nasty >1MB
     * all versions request.
     */
}

/**
 * Attribute metadata source for BeatSaver archives.
 * 
 * @remarks
 * - This almost certainly doesn't work for Web UI downloads, only OneClick links
 * 
 * @param modName - Name of the mod being installed
 */
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
                mapHash: mapDetails.hash,
                uploadedTimestamp: mapDetails.uploaded,
                pictureUrl: `https://beatsaver.com${mapDetails.coverURL}`,
                source: 'beatsaver',
                difficulties: Object.keys(mapDetails.metadata.difficulties).filter(d => mapDetails.metadata.difficulties[d] == true),
                bpm: mapDetails.metadata.bpm,
                duration: mapDetails.metadata.duration,
                songAuthor: mapDetails.metadata.songAuthorName
              };
            instructions.push(...toInstructions(mapAtrributes));
        } catch (error) {
            // ignored
        }
    }
    return instructions;
    // destination: `Beat Saber_Data/CustomLevels/${targetName}/${file}` // this should be handled by the modtype now.
}

/**
 * Attribute metadata source for ModelSaber archives/files.
 *
 * @param modName - Name of the mod being installed
 */
export async function installModelSaberFile(modName: string) : Promise<IInstruction[]> {
    let instructions : IInstruction[] = [];
    var modelClient = new ModelSaberClient();
    var modelDetails = await modelClient.getModelByFileName(modName);
    if (modelDetails !== null) {
        log('debug', 'Got details on model from ModelSaber!', modelDetails);
        var modelAttributes = {
            allowRating: false,
            downloadGame: GAME_ID,
            modId: modelDetails.id,
            modName: modelDetails.name,
            author: modelDetails.author,
            customFileName: modelDetails.name,
            logicalFileName: `model:${modelDetails.id}`,
            pictureUrl: modelDetails.thumbnail,
            source: 'modelsaber',
            uploadedTimestamp: new Date(Date.parse(modelDetails.date)).toISOString()
        };
        instructions.push(...toInstructions(modelAttributes));
    } else {
        log('warn', "beatvortex doesn't currently include metadata for manually installed models!");
    }
    return instructions;
}

/**
 * Installs the given playlist as a mod.
 * 
 * @remarks
 * - Unlike mods/maps/models, this actually bypasses the built-in Vortex installation logic.
 * - This directly installs the file into the staging folder, then "manually" adds the mod to Vortex.
 * 
 * @param api The extension API.
 * @param installUrl The playlist URL to install
 */
export async function installPlaylist(api: IExtensionApi, installUrl: string) {
    var client = new PlaylistClient()
    var ref = client.parseUrl(installUrl);
    var u = new URL(ref.fileUrl);
    var info = await client.getPlaylist(ref.fileName);
    var targetPath = await client.saveToFile(api, ref);
    var installPath = path.basename(path.dirname(targetPath));
    var sourceName = getModName(u.host); //i.e. `beatsaver` or `bsaber`
    const vortexMod: IMod = {
        id: installPath,
        state: 'installed',
        type: 'bs-playlist',
        installationPath: installPath,
        attributes: {
            name: info.playlistTitle,
            author: info.playlistAuthor,
            pictureUrl: info.image,
            installTime: new Date(),
            // version: '1.0.0',
            notes: `Installed from ${ref.fileUrl}`,
            source: sourceName,
            playlistFile: ref.fileName
        },
    };
    api.store.dispatch(actions.addMod(GAME_ID, vortexMod));
    const profileId = api.getState().settings.profiles.lastActiveProfile[GAME_ID];
    api.store.dispatch(actions.setModEnabled(profileId, installPath, true));
    api.events.emit('mods-enabled', [ installPath ], true, GAME_ID);
    
    api.sendNotification({
        id: `ready-to-install-${installPath}`,
        type: 'success',
        title: api.translate('Playlist installed'),
        message: `Installed ${installPath} playlist from ${u.host}.`,
        actions: [
          {
            title: 'Install Maps', action: dismiss => {
                installPlaylistMaps(api, info.songs);
                dismiss();
            },
          },
        ],
      });
}

/**
 * Installs all maps from the given list of maps, unless they're already installed.
 * 
 * @remarks
 * - As well as installing the maps (using the Vortex flow), this also force-enables each downloaded map.
 * 
 * @param api - The extension API.
 * @param maps - The set of maps from the installed playlist.
 */
export async function installPlaylistMaps(api: IExtensionApi, maps: IPlaylistEntry[]) {
    var installed = api.getState().persistent.mods[GAME_ID];
    var toInstall = maps.filter(plm => !Object.values(installed).some(i => (i.id == plm.key) || (i?.attributes['mapHash'] == plm.hash)));
    api.sendNotification({
        type: 'info',
        title: "Now installing playlist",
        message: `Installing ${toInstall.length} maps from BeatSaver`,
        noDismiss: true,
        displayMS: 4000
    });
    var profileId = getCurrentProfile(api);
    await installMaps(api, toInstall.map(i => i.hash ?? i.key), (api, modIds) => {
        for (const id of modIds) {
            api.store.dispatch(actions.setModEnabled(profileId, id, true));
        }
        api.events.emit('mods-enabled', modIds, true, GAME_ID);
    });
    // lol jks we are auto-enabling these now.
}