import { IInstallResult, IExtensionApi, IProfile, ThunkStore, IDeployedFile, IInstruction, ISupportedResult, IMod } from 'vortex-api/lib/types/api';
import { toAttributeInstructions, getModName } from "vortex-ext-common";
import { BeatModsClient } from "./beatModsClient";
import { GAME_ID } from '.';
import path from 'path';
import { log, actions, selectors } from 'vortex-api';
import { InstructionType } from 'vortex-api/lib/extensions/mod_management/types/IInstallResult';
import { BeatSaverClient } from './beatSaverClient';
import { getCustomFolder, ModelType, ModelSaberClient } from './modelSaberClient';
import { PlaylistClient, IPlaylistInfo, PlaylistRef } from "./playlistClient";
import { isSongMod, isModelMod, isGameMod, getCurrentProfile, traceLog } from './util';
import { installMaps, IPlaylistEntry } from './playlists';

export interface ModInstaller {
    (api: IExtensionApi, files: string[], archiveRoot: string, modName: string, enrich: MetadataSource) : Promise<IInstruction[]>;
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
    try {
    instructions.push(...await enrich?.(modName) ?? []);
    } catch (e) {
        log('error', 'error during metadata installation', {err: e});
    }
    return instructions;
}

export async function looseInstaller(files: string[], rootPath: string, modName: string, enrich?: MetadataSource) : Promise<IInstruction[]> {
    rootPath = rootPath ?? '';
    var instructions = files
        .filter(f => path.extname(f).toLowerCase() == '.dll')
        .map((d): IInstruction => {
            return {
                type: 'copy',
                source: d,
                destination: `Plugins/${d}`
            }
        });
    traceLog('mapped loose instructions', {instructions, isArray: Array.isArray(instructions), count: instructions?.length});
    try {
        var meta = await enrich?.(modName) ?? [];
        instructions.push(...meta);
    } catch (e) {
        log('error', 'error during metadata installation', {err: e});
    }
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
    try {
        instructions.push(...await enrich?.(modName) ?? []);
    } catch (e) {
        log('error', 'error during metadata installation', {err: e});
    }
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
    try {
        instructions.push(...await enrich?.(modName) ?? []);
    } catch (e) {
        log('error', 'error during metadata installation', {err: e});
    }
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
    let instructions : IInstruction[] = [];
    var details = await client.getModByFileName(modName);
    if (details != null) {
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
            homepage: details.link,
            // gameVersion: details.gameVersion, //we shouldn't do this yet. See below.
            uploadedTimestamp: details.uploadDate,
            category: details.category
        };
        instructions = toAttributeInstructions(modAtrributes);
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
    }
    return instructions;
    /**
     * The game version problem is caused by https://github.com/bsmg/BeatMods-Website/issues/41.
     * We can't store this game version since BeatMods gives us the wrong version. We *could* find
     * out what the latest version is first, and sepcify a version when we ask for the mod, but 
     * that would *double* the BeatMods requests on *every* install, including the nasty >1MB
     * all versions request.
     * UPDATE: we could probably use the session cache for this, and just populate it if it's not already?
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
                songAuthor: mapDetails.metadata.songAuthorName,
                variants: mapDetails.metadata.characteristics.map(c => c.name)
              };
            instructions.push(...toAttributeInstructions(mapAtrributes));
        } catch (error) {
            log('warn', 'error during map installation', {error});
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
        instructions.push(...toAttributeInstructions(modelAttributes));
    } else {
        log('warn', "beatvortex doesn't currently include metadata for manually installed models!");
    }
    return instructions;
}

export async function installRemotePlaylist(api: IExtensionApi, installUrl: string) {
    var client = new PlaylistClient()
    var ref = client.parseUrl(installUrl);
    var info = await client.getPlaylist(ref.fileName);
    installPlaylist(api, ref, info);
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
export async function installPlaylist(api: IExtensionApi, ref: PlaylistRef, info: IPlaylistInfo) {
    var client = new PlaylistClient();
    var targetPath = await client.saveToFile(api, ref, info);
    var installPath = path.basename(path.dirname(targetPath));
    const vortexMod: IMod = {
        id: installPath,
        state: 'installed',
        type: 'bs-playlist',
        installationPath: installPath,
        attributes: {
            modName: info.playlistTitle,
            name: info.playlistTitle,
            author: info.playlistAuthor,
            pictureUrl: info.image,
            //TODO: this ^^ is actually a really bad idea.
            // playlist images are often literal megabytes of base64'd content that we should be scaling before we put it in attributes
            installTime: new Date(),
            // version: '1.0.0',
            notes: `Installed from ${ref.fileUrl ?? ref.fileName}`,
            source: ref.source,
            playlistFile: ref.fileName
        },
    };
    api.store.dispatch(actions.addMod(GAME_ID, vortexMod));
    const profileId = api.getState().settings.profiles.lastActiveProfile[GAME_ID];
    api.store.dispatch(actions.setModEnabled(profileId, installPath, true));
    api.events.emit('mods-enabled', [ installPath ], true, GAME_ID);
    var sourceName = ref.fileUrl ? new URL(ref.fileUrl).host : path.basename(ref.fileName) ?? 'local file';
    if (info.songs && info.songs.length > 0) {
        api.sendNotification({
            id: `ready-to-install-${installPath}`,
            type: 'success',
            title: api.translate('Playlist installed'),
            message: `Installed ${installPath} playlist from ${sourceName}.`,
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
export async function installPlaylistMaps(api: IExtensionApi, maps: IPlaylistEntry[], playlistName?: string) {
    var installed = api.getState().persistent.mods[GAME_ID];
    var toInstall = maps.filter(plm => !Object.values(installed).some(i => (i.id == plm.key) || (i?.attributes['mapHash'] == plm.hash)));
    var installNot = api.sendNotification({
        type: 'info',
        title: `Now installing ${playlistName ?? 'playlist'}`,
        message: `Installing ${toInstall.length} maps from BeatSaver`,
        noDismiss: true,
        displayMS: 5000
    });
    var profileId = getCurrentProfile(api);
    await installMaps(api, toInstall.map(i => i.hash ?? i.key), (api, modIds) => {
        for (const id of modIds) {
            api.store.dispatch(actions.setModEnabled(profileId, id, true));
        }
        api.events.emit('mods-enabled', modIds, true, GAME_ID);
        api.dismissNotification(installNot);
        api.sendNotification({
            type: 'success',
            title: `${playlistName ?? 'Playlist'} installed`,
            message: `Installed and enabled ${toInstall.length} maps`
        });
    });
    // lol jks we are auto-enabling these now.
}