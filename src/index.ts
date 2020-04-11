import path = require('path');

import { fs, log, util, selectors, actions, MainPage } from "vortex-api";
import { IExtensionContext, IDiscoveryResult, IGame, IState, ISupportedResult, ProgressDelegate, IInstallResult, IExtensionApi, IProfile, ThunkStore, IDownload } from 'vortex-api/lib/types/api';
import { InstructionType, IInstruction } from 'vortex-api/lib/extensions/mod_management/types/IInstallResult';

import { isGameMod, isSongHash, isSongMod, types, isActiveGame, showTermsNotification, getProfileSetting, getGamePath, findGame, models, toTitleCase, isModelMod, isModelModInstructions } from './util';
import { PROFILE_SETTINGS, ProfileClient } from './profileClient';
import { BeatSaverClient, IMapDetails } from './beatSaverClient';
import { gameMetadata, STEAMAPP_ID } from './meta';
import { BeatModsClient } from './beatModsClient';
import { ModelSaberClient, getCustomFolder, ModelType } from './modelSaberClient';

import BeatModsList from "./BeatModsList";

export const GAME_ID = 'beatsaber'
let GAME_PATH = '';

//This is the main function Vortex will run when detecting the game extension. 
function main(context : IExtensionContext) {
    const getMapPath = (game: IGame): string => {
        return getGamePath(context.api, game, true);
    };
    const getModPath = (game: IGame): string => {
        return getGamePath(context.api, game, false);
    };
    context.once(() => {
        if (isActiveGame(context)) {
        }
        var enableLinks = new ProfileClient(context).getProfileSetting(PROFILE_SETTINGS.EnableOneClick, false);
        log('debug', 'beatvortex: initialising oneclick', { enable: enableLinks});
        if (enableLinks) {
            context.api.registerProtocol('beatsaver', true, (url: string, install:boolean) => handleMapLinkLaunch(context.api, url, install));
            context.api.registerProtocol('modelsaber', true, (url: string, install: boolean) => handleModelLinkLaunch(context.api, url, install));
        }
        context.api.events.on('profile-did-change', (profileId: string) => {
            var newProfile: IProfile = util.getSafe(context.api.store.getState(), ['persistent', 'profiles', profileId], undefined);
            if ((newProfile !== undefined) && newProfile.gameId === GAME_ID) {
                log('debug', 'beatvortex got the profile change event! checking profile.');
                log('debug', `configured profile features: ${JSON.stringify(newProfile.features)}`);
            };
        });
        context.api.events.on('profile-did-change', (profileId: string) => {
            handleProfileChange(context.api, profileId, (profile) => {
                var profileClient = new ProfileClient(context);
                var skipTerms = profileClient.getProfileSetting(profile, PROFILE_SETTINGS.SkipTerms, false);
                if (!skipTerms) {
                    showTermsNotification(context, (dismiss) => {
                        profileClient.setProfileSetting(profile, PROFILE_SETTINGS.SkipTerms, true);
                        dismiss();
                    });
                }
            },
            "terms of use notification");
        });
    });
    context.registerModType('bs-map', 100, gameId => gameId === GAME_ID, getMapPath, (inst) => Promise.resolve(isSongMod(inst)), { mergeMods: false });
    context.registerModType('bs-mod', 90, gameId => gameId === GAME_ID, getModPath, () => Promise.resolve(true), { mergeMods: true});
    context.registerModType('bs-model', 100, gameId => gameId === GAME_ID, getModPath, (inst) => Promise.resolve(isModelModInstructions(inst)), { mergeMods: true});
    context.registerGame({
        ...gameMetadata,
        id: GAME_ID,
        queryPath: findGame,
        setup: (discovery: IDiscoveryResult) => {
            log('debug', 'running beatvortex setup')
            prepareForModding(discovery);
        },
        environment: {
            SteamAPPId: STEAMAPP_ID.toString(),
            gamepath: GAME_PATH
        },
    });
    addModSource(context, { id: 'beatmods', name: 'BeatMods', 'url': 'https://beatmods.com/#/mods'});
    addModSource(context, { id: 'bsaber', name: 'BeastSaber', 'url': 'https://bsaber.com/songs'});
    addModSource(context, { id: 'beatsaver', name: 'BeatSaver', 'url': 'https://beatsaver.com/browse/hot'});
    addModSource(context, { id: 'modelsaber', name: 'ModelSaber', 'url': 'https://modelsaber.com/?pc'});
    
    context.registerInstaller(
        'bs-content', 
        25, 
        testSupportedContent, 
        (files, destinationPath, gameId, progress) => installContent(context.api, files, destinationPath, gameId, progress)
    );

    /* context.registerMainPage('search', 'Browse', BeatModsList, {
        group: 'per-game',
        // visible: () => selectors.activeGameId(context.api.store.getState()) === GAME_ID,
        props: () => ({ api: context.api }),
      }); */

    /*
        For reasons entirely unclear to me, this works correctly, adding the features at startup when calling the `addProfileFeatures` in this module
        Switching to the static `ProfileClient` version will fail to add features. I have no idea why.

    */
    addProfileFeatures(context);

    return true
}

/**
 * Adds a new mod source to Vortex.
 *
 * @remarks
 * This method is a wrapper around the dispatch+action used to register a mod source specific to this game.
 *
 * @param context - The extension context.
 * @param details - The details of the mod source to add to Vortex.
 *
 */
function addModSource(context: IExtensionContext, details: {id: string, name: string, url: string}) {
    context.registerModSource(details.id, details.name, () => {
        context.api.store.dispatch(actions.showURL(details.url));
      }, 
        {
          condition: () => (selectors.activeGameId(context.api.store.getState()) === GAME_ID),
          icon: 'idea'
        }
      );
}

/**
 * Registers the default profile features for BeatVortex.
 *
 * @remarks
 * For reasons entirely unclear to me, this works correctly, adding the features at startup. 
 * Moving this logic into another module (i.e. switching to the static `ProfileClient` call) will fail to add features. 
 * I have no idea why.
 *
 * @param context - The extension context.
 *
 * @beta
 * 
 */
function addProfileFeatures(context: IExtensionContext) {
    context.registerProfileFeature(
        PROFILE_SETTINGS.SkipTerms, 
        'boolean', 
        'savegame', 
        'Skip Terms of Use', 
        "Skips the notification regarding BeatVortex's terms of use", 
        () => selectors.activeGameId(context.api.store.getState()) === GAME_ID);
    context.registerProfileFeature(
        PROFILE_SETTINGS.EnableOneClick,
        'boolean',
        'settings',
        'Enable One-Click Handling',
        'Enables Vortex to handle Mod Assistant One-Click links',
        () => selectors.activeGameId(context.api.store.getState()) === GAME_ID);
    context.registerProfileFeature(
        PROFILE_SETTINGS.AllowUnknown,
        'boolean',
        'settings',
        'Allow Unknown Maps',
        'Enables installing of maps without metadata',
        () => selectors.activeGameId(context.api.store.getState()) === GAME_ID);
}

/**
 * Preps the Beat Saber installation for mod deployment.
 * @remarks
 * Other than crating the Plugins folder (not strictly necessary), this is a basic sanity check only.
 *
 * @param discovery - The details for the discovered game.
 */
function prepareForModding(discovery : IDiscoveryResult) {
    // showTermsDialog();
    GAME_PATH = discovery.path;
    let pluginPath = path.join(discovery.path, 'Plugins')
    return fs.ensureDirWritableAsync(pluginPath, () => Promise.resolve());
}

/**
 * Checks if the given mod files can be installed with this extension.
 * @remarks
 * This will currently only accept maps, model mods and mods with a known primitive directory.
 *
 * @param files - The list of mod files to test against
 * @param gameId - The current game ID to test against. Short-circuits if not beatsaber.
 */
function testSupportedContent(files: string[], gameId: string): Promise<ISupportedResult> {
    log('debug', `files: ${files.length} [${files[0]}]`);
    let supported = (gameId === GAME_ID) &&
        (
            isGameMod(files) || // game mod
            isSongMod(files) || //song
            isModelMod(files)
        );
    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}

/**
 * The main extension installer implementation.
 * @remarks
 * As well as basic installation logic, this method also handles metadata enrichment for known mod sources.
 * Path handling for maps is in the mod type, but is here for models due to performance concerns. This will likely be refactored in future.
 *
 * @param api - The extension API.
 * @param files - The list of mod files for installation
 * @param gameId - The game ID for installation (should only every be GAME_ID)
 * @param progressDelegate - Delegate for reporting progress (not currently used)
 *
 * @returns Install instructions for mapping mod files to output location.
 */
async function installContent(api: IExtensionApi, files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate): Promise<IInstallResult> {
    log('debug', `running beatvortex installer. [${gameId}]`, {files, destinationPath});
    var modName = path.basename(destinationPath).split('.').slice(0, -1).join('.');
    if (BeatModsClient.isBeatModsArchive(destinationPath)) {
        log('info', `${modName} detected as BeatMods archive!`);
        var client = new BeatModsClient();
        var details = await client.getModByFileName(modName);
        var modAtrributes = {
            allowRating: false,
            downloadGame: gameId,
            fileId: details._id,
            modId: details.name,
            modName: details.name,
            description: details.description,
            author: details.author.username,
            logicalFileName: details.name,
            source: "beatmods",
            version: details.version
          };
        api.store.dispatch(actions.setModAttributes(gameId, modName, modAtrributes));
    }
    if (isSongMod(files)) {
        log('info', `installing ${modName} as custom song level`);
        //install song
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
                    downloadGame: gameId,
                    modId: mapDetails.key,
                    modName: mapName,
                    description: mapDetails.description,
                    author: mapDetails.metadata.levelAuthorName,
                    logicalFileName: mapName,
                    // source: "beatsaver",
                    uploadedTimestamp: mapDetails.uploaded,
                    pictureUrl: `https://beatsaver.com${mapDetails.coverURL}`
                  };
                api.store.dispatch(actions.setModAttributes(gameId, modName, mapAtrributes));
            } catch (error) {
                // ignored
            }
        }
        const instructions = files.map((file: any) => {
            return { 
                type: 'copy' as InstructionType,
                source: file,
                // destination: `Beat Saber_Data/CustomLevels/${targetName}/${file}` // this should be handled by the modtype now.
                // destination: `${targetName}/${file}` // this is unnecessary with the new modInfo stuff.
                destination: file
            };
        });
        return Promise.resolve({ instructions : instructions });
    }
    if (isModelMod(files)) {
        log('info', 'installing mod as custom model', {file: files[0]});
        //model saber "mod"
        var file = files[0]
        var modelClient = new ModelSaberClient();
        var modelDetails = await modelClient.getModelByFileName(file);
        if (modelDetails != null) {
            log('debug', 'Got details on model from ModelSaber!', modelDetails);
        }
        log('info', "beatvortex doesn't currently include metadata for manually installed models!");
        var instructions: IInstruction[] = [
            {
                type: 'copy',
                source: file,
                destination: `${getCustomFolder(path.extname(file).replace('.', '') as ModelType)}/${file}`
            }
        ];
        return Promise.resolve({instructions});
    } 
    var firstPrim = files.find(f => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1));
    if (firstPrim !== undefined) {
        let firstType = path.dirname(firstPrim);
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
        return Promise.resolve({ instructions });
    } else {
        log('warn', "Couldn't find primitive root in file list. Falling back to basic installation!");
        var instructions = files.map((file: string): IInstruction => {
            return {
                type: 'copy',
                source: file,
                destination: file,
            };
        })
        return Promise.resolve({instructions});
    }
}


/**
 * Wrapper method to run a callback on profile change.
 *
 * @remarks
 * This method is just a wrapper to ensure that a) Beat Saber is the current game and b) the profile is available for the callback.
 *
 * @param api - The extension API.
 * @param profileId - The *ID* of the newly activated profile
 * @param callback - The callback to invoke on profile change. The newly activated profile is provided to this callback.
 * @param message - An optional message to be put in the debug logs to describe the action being invoked.
 *
 */
function handleProfileChange(api: IExtensionApi, profileId: string, callback: (profile: IProfile) => void, message?: string) {
    var newProfile: IProfile = util.getSafe(api.store.getState(), ['persistent', 'profiles', profileId], undefined);
    if ((newProfile !== undefined) && newProfile.gameId === GAME_ID) {
        log('debug', `beatvortex: activating profile change. Invoking ${message ?? 'callback(s)'}`);
        callback(newProfile);
    };
}

/**
 * Enriches a mod download with basic metadata
 *
 * @remarks
 * - This method only adds *basic* metadata to tide over until installation
 * - Unlike the old setMapModInfo, this should be agnostic to any mod type currently in use.
 *
 * @param store - The application state store.
 * @param id - ID of the *download* being enriched. Not the modId!
 * @param details - The basic metadata to add to the download.
 */
function setDownloadModInfo(store: ThunkStore<any>, id: string, details: {name: string, source: string, id?: string}) {
    // store.dispatch(actions.setDownloadModInfo(id, 'modId', details.key));
    // store.dispatch(actions.setDownloadModInfo(id, 'modName', details.name));
    store.dispatch(actions.setDownloadModInfo(id, 'name', details.name));
    // store.dispatch(actions.setDownloadModInfo(id, 'downloadGame', GAME_ID));
    store.dispatch(actions.setDownloadModInfo(id, 'game', GAME_ID));
    // store.dispatch(actions.setDownloadModInfo(id, 'author', details.metadata.levelAuthorName))
    store.dispatch(actions.setDownloadModInfo(id, 'logicalFileName', details.name));
    store.dispatch(actions.setDownloadModInfo(id, 'source', details.source));
    if (details.id) {
        store.dispatch(actions.setDownloadModInfo(id, 'externalId', details.id));
    }
}

//#region one-click install

/**
 * Handles One-Click install links for maps (i.e. the beatsaver protocol). Adds metadata and triggers the download.
 *
 * @remarks
 * This method, on successful completion, will trigger the 'start-download' event to actually perform the download.
 *
 * @param api - The extension API.
 * @param url - The One-Click (beatsaver) URI to install.
 * @param install - currently unused, should always be true
 */
async function handleMapLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
    log('info', `handling link launch from ${url} (install: ${install})`);
    var client = new BeatSaverClient();
    var re = /\w+:\/\/([a-f0-9]{4}).*/;
    var match = re.exec(url);
    if (!match || match.length != 2) {
        //err
        log('error', 'could not parse URL');
        return;
    }
    var mapKey = match[1];
    log('debug', `fetching details for map ${mapKey}`);
    var details = await client.getMapDetails(mapKey);
    if (details != null) {
        log('debug', `got details from beatsaver API`, details);
        log('info', `downloading ${details.name}`);
        var mapLink = client.buildDownloadLink(details);
        // log('debug', `attempting proxy: ${map}`);
        api.events.emit('start-download', 
            [mapLink], 
            {
                game: 'beatsaber',
                name: details.name
            }, 
            details.name, 
            (err: Error, id?: string) => handleDownloadInstall(api, details, err, id, (api) => setDownloadModInfo(api.store, id, {...details, source: 'beatsaber', id: details.key})), 
            true);
    } else {
        var allowUnknown = getProfileSetting(api.store.getState(), PROFILE_SETTINGS.AllowUnknown);
        if (allowUnknown) {
            api.sendNotification({
                message: `Installing unknown map ${mapKey}. No metadata will be available!`,
                type: 'warning',
            })
            //TODO: handle this
        } else {
            api.showErrorNotification(`Could not fetch details for ${mapKey}!`, `We couldn't get details from BeatSaver for that song. It may have been removed or currently unavailable.`, {allowReport: false});
        }
    }
}

/**
 * Handles One-Click install links for models (i.e. the modelsaber protocol). Adds metadata and triggers the download.
 * @remarks
 * This method, on successful completion, will trigger the 'start-download' event to actually perform the download.
 *
 * @param api - The extension API.
 * @param url - The One-Click (modelsaber) URI to install.
 * @param install - currently unused, should always be true
 */
async function handleModelLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
    log('info', `handling link launch from ${url} (install: ${install})`);
    var client = new ModelSaberClient();
    if (!client.isModelSaberLink(url)) {
        log('error', 'could not parse URL', url);
        return null;
    }
    log('debug', `fetching details for link`);
    var modelDetails = await client.getModelDetails(url);
    if (modelDetails != null) {
        log('debug', `got details from modelsaber API`, modelDetails);
        log('info', `downloading ${modelDetails.name}`);
        var modelLink = client.buildDownloadLink(modelDetails);
        // log('debug', `attempting proxy: ${map}`);
        api.events.emit('start-download', 
            [modelLink], 
            {
                game: 'beatsaber',
                name: modelDetails.name
            }, 
            modelDetails.name, 
            (err: Error, id?: string) => handleDownloadInstall(api, modelDetails, err, id, (api) => setDownloadModInfo(api.store, id, {...modelDetails, source: 'modelsaber', id: modelDetails.id.toString()})), 
            true);
    } else {
        var allowUnknown = getProfileSetting(api.store.getState(), PROFILE_SETTINGS.AllowUnknown);
        if (allowUnknown) {
            api.sendNotification({
                message: `Installing unknown model ${modelDetails.name}. No metadata will be available!`,
                type: 'warning',
            })
            //TODO: handle this
        } else {
            api.showErrorNotification(`Could not fetch details for ${modelDetails.name}!`, `We couldn't get details from ModelSaber for that link. It may have been removed or currently unavailable.`, {allowReport: false});
        }
    }
}

/**
 * Handler for performing actions *after* the download has been completed.
 * @remarks
 * - contrary to earlier behaviour: this is agnostic to the mod type being installed.
 * - anything specific to the mod type (metadata etc) should be handled in the callback now.
 * 
 * @param api - The extension API.
 * @param details - Basic details for the download (only used for logging).
 * @param err - The error (if any) from the failed download
 * @param id - The ID of the completed download
 * @param callback - A callback to be executed after the download has been completed before the user is notified.
 */
function handleDownloadInstall(api: IExtensionApi, details: {name: string}, err: Error, id?: string, callback?: (api: IExtensionApi) => void) {
    log('debug', `downloaded ${id} (or was it ${err})`);
    if (!err) {
        callback(api);
        api.sendNotification({
            id: `ready-to-install-${id}`,
            type: 'success',
            title: api.translate('Download finished'),
            group: 'download-finished',
            message: details.name,
            actions: [
              {
                title: 'Install All', action: dismiss => {
                  api.events.emit('start-install-download', id, true);
                  dismiss();
                },
              },
            ],
          });
    } else {
        //TODO: need to actually handle this, obviously
        api.showErrorNotification(`Failed to download ${details.name}!`, `Error encountered during download and install: ${err.name}\n${err.message}`, {allowReport: false});
    }
}

//#endregion


module.exports = {
    default: main,
};

//#region Deprecated

// previous revisions (see Git history) included quiet a few extra methods that have been essentially superseded by new code.
// in particular, client classes and more generic revisions (i.e. setDownloadModInfo) have replaced quite a bit of old logic.

//#endregion

//#region Mod List


  

//#endregion