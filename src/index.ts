import path = require('path');

// external modules
import { fs, log, util, selectors, actions } from "vortex-api";
import { IExtensionContext, IDiscoveryResult, IGame, IState, ISupportedResult, ProgressDelegate, IInstallResult, IExtensionApi, IProfile, ThunkStore, IDeployedFile, IInstruction, ILink } from 'vortex-api/lib/types/api';
import { isGameMod, isSongHash, isSongMod, types, isActiveGame, getGamePath, findGame, isModelMod, isModelModInstructions, getProfile, enableTrace, traceLog, getModName } from './util';
import { ProfileClient } from "vortex-ext-common";

// local modules
import { showPatchDialog, showTermsNotification } from "./notify";
import { isIPAInstalled, isIPAReady, tryRunPatch, tryUndoPatch } from "./ipa";
import { gameMetadata, STEAMAPP_ID, PROFILE_SETTINGS } from './meta';
import { archiveInstaller, basicInstaller, installBeatModsArchive, installBeatSaverArchive, modelInstaller, installModelSaberFile, testMapContent, testModelContent, testPluginContent } from "./install";

// clients
import { BeatSaverClient } from './beatSaverClient';
import { BeatModsClient } from './beatModsClient';
import { ModelSaberClient } from './modelSaberClient';

// components etc
import BeatModsList from "./BeatModsList";
import { OneClickSettings, settingsReducer, ILinkHandling } from "./settings";

export const GAME_ID = 'beatsaber'
let GAME_PATH = '';

export interface DeploymentEventHandler {
    (api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }) : Promise<void>|Promise<boolean>;
}

//This is the main function Vortex will run when detecting the game extension. 
function main(context : IExtensionContext) {
    const getMapPath = (game: IGame): string => {
        return getGamePath(context.api, game, true);
    };
    const getModPath = (game: IGame): string => {
        return getGamePath(context.api, game, false);
    };
    context.once(() => {
        enableTrace();
        if (isActiveGame(context)) {}
        context.api.setStylesheet('bs-beatmods-list', path.join(__dirname, 'beatModsList.scss'))
        
        var state = context.api.getState();
        var enableLinks = util.getSafe(state, ['settings', 'beatvortex', 'enableOCI'], undefined) as ILinkHandling;
        registerProtocols(context.api, enableLinks);
        context.api.onStateChange(['settings', 'beatvortex', 'enableOCI'], (previous : ILinkHandling, current: ILinkHandling) => {
            log('debug', 'got settings change', {current});
            registerProtocols(context.api, current);
        });
        context.api.events.on('profile-did-change', (profileId: string) => {
            handleProfileChange(context.api, profileId, (profile) => {
                log('debug', 'beatvortex got the profile change event! checking profile.');
                traceLog(`configured profile features: ${JSON.stringify(profile.features)}`);
            });
        });
        context.api.events.on('did-deploy', (profileId: string, deployment: { [typeId: string]: IDeployedFile[] }, setTitle: (title: string) => void) => {
            handleDeploymentEvent(context.api, profileId, deployment, handleBSIPADeployment);
            // runDeploymentEvent(context.api, profileId, deployment, handleBSIPADeployment);
        });
        context.api.onAsync('will-purge', async (profileId: string, deployment: {[modType: string]: IDeployedFile[]}) => {
            traceLog('beatvortex got will-purge', { profileId, deploying: Object.keys(deployment)});
            await handleDeploymentEvent(context.api, profileId, deployment, handleBSIPAPurge)
            Promise.resolve();
          });
        context.api.onAsync('did-purge', (profileId: string) => {
            log('debug', 'beatvortex got did-purge', { profileId });
            return Promise.resolve();
        });
        context.api.events.on('profile-did-change', (profileId: string) => {
            handleProfileChange(context.api, profileId, (profile) => {
                var profileClient = new ProfileClient(context.api);
                var skipTerms = profileClient.getProfileSetting(profile, PROFILE_SETTINGS.SkipTerms, false);
                if (!skipTerms) {
                    showTermsNotification(context.api, (dismiss) => {
                        profileClient.setProfileSetting(profile, PROFILE_SETTINGS.SkipTerms, true);
                        dismiss();
                    });
                }
            },
            "terms of use notification");
        });
    });
    context.registerModType('bs-map', 100, gameId => gameId === GAME_ID, getMapPath, (inst) => Promise.resolve(isSongMod(inst)), { mergeMods: false, name: 'Song Map' });
    context.registerModType('bs-mod', 100, gameId => gameId === GAME_ID, getModPath, (inst) => Promise.resolve(isGameMod(inst)), { mergeMods: true, name: 'Plugin' });
    context.registerModType('bs-model', 100, gameId => gameId === GAME_ID, getModPath, (inst) => Promise.resolve(isModelModInstructions(inst)), { mergeMods: true, name: 'Custom Model'});
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
        }
    });
    addModSource(context, { id: 'beatmods', name: 'BeatMods', 'url': 'https://beatmods.com/#/mods'});
    addModSource(context, { id: 'bsaber', name: 'BeastSaber', 'url': 'https://bsaber.com/songs'});
    addModSource(context, { id: 'beatsaver', name: 'BeatSaver', 'url': 'https://beatsaver.com/browse/hot'});
    addModSource(context, { id: 'modelsaber', name: 'ModelSaber', 'url': 'https://modelsaber.com/?pc'});
    
    context.registerInstaller(
        'bs-content', 
        90, 
        testPluginContent, 
        (files, destinationPath, gameId, progress) => installContent(context.api, files, destinationPath, gameId, progress)
    );
    context.registerInstaller(
        'bs-model',
        50,
        testModelContent,
        installModelContent
    );
    context.registerInstaller(
        'bs-map',
        50,
        testMapContent,
        installMapContent
    );
    context.registerMainPage('search', 'BeatMods', BeatModsList, {
        group: 'per-game',
        visible: () => selectors.activeGameId(context.api.store.getState()) === GAME_ID,
        props: () => ({ api: context.api, mods: []}),
      });

      // ⬇ is only commented out because it doesn't work right now :(
      context.registerSettings('Download', OneClickSettings, undefined, undefined, 100);
      context.registerReducer(['settings', 'beatvortex'], settingsReducer);


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
 * Other than creating the CustomLevels folder (not strictly necessary), this is a basic sanity check only.
 *
 * @param discovery - The details for the discovered game.
 */
function prepareForModding(discovery : IDiscoveryResult) {
    // showTermsDialog();
    GAME_PATH = discovery.path;
    let mapsPath = path.join(discovery.path, 'Beat Saber_Data', 'CustomLevels');
    return fs.ensureDirWritableAsync(mapsPath, () => Promise.resolve());
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

async function installMapContent(files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate) : Promise<IInstallResult> {
    var modName = getModName(destinationPath);
    log('info', `installing ${modName} as custom song level`);
    //install song
    let instructions : IInstruction[];
    instructions = await basicInstaller(files, null, modName, installBeatSaverArchive);
    return Promise.resolve({instructions});
}

async function installModelContent(files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate) : Promise<IInstallResult> {
    var modName = getModName(destinationPath);
    log('info', 'installing mod as custom model', {file: files[0], name: modName});
    //model saber "mod"
    var instructions = await modelInstaller(files, '.', modName, installModelSaberFile);
    return Promise.resolve({instructions});
}

/**
 * The main extension installer implementation.
 * @remarks
 * As well as basic installation logic, this method also handles metadata enrichment for known mod sources.
 * Path handling for maps is in the mod type, but is here for models due to performance concerns. This will likely be refactored in future.
 *
 * @param api - The extension API.
 * @param files - The list of mod files for installation.
 * @param destinationPath - The installation target path.
 * @param gameId - The game ID for installation (should only every be GAME_ID).
 * @param progressDelegate - Delegate for reporting progress (not currently used).
 *
 * @returns Install instructions for mapping mod files to output location.
 */
async function installContent(api: IExtensionApi, files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate): Promise<IInstallResult> {
    log('debug', `running beatvortex installer. [${gameId}]`, {files, destinationPath});
    var modName = getModName(destinationPath);
    var firstPrim = files.find(f => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1));
    var isValid = firstPrim !== undefined
    if (isValid) {
        log('info', `${modName} detected as mod archive!`);
        var bmInstructions = await archiveInstaller(files, firstPrim, modName, BeatModsClient.isBeatModsArchive(destinationPath) ? installBeatModsArchive : null);
        // var bmInstructions = await installBeatModsArchive(api, files, firstPrim, modName, archiveInstaller);
        return Promise.resolve({instructions: bmInstructions});
    } else {
        log('warn', "Couldn't find primitive root in file list. Falling back to basic installation!");
        return Promise.resolve({instructions: await basicInstaller(files, null, modName)});
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

async function handleDeploymentEvent(api: IExtensionApi, profileId: string, deployment: { [typeId: string]: IDeployedFile[] }, handler: DeploymentEventHandler) : Promise<void> {
    log('debug', 'deployment event caught!', {profileId, mods: deployment['bs-mod']?.length ?? '?', songs: deployment['bs-map']?.length ?? '?'});
    var ev = getProfile(api, profileId);
    if (ev.isBeatSaber) {
        await handler(api, ev.profile, deployment);
    }
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
export function setDownloadModInfo(store: ThunkStore<any>, id: string, details: {name: string, source: string, id?: string}) {
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
        var allowUnknown = new ProfileClient(api.store).getProfileSetting(PROFILE_SETTINGS.AllowUnknown, false);
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
        var allowUnknown = new ProfileClient(api.store).getProfileSetting(PROFILE_SETTINGS.AllowUnknown, false);
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

async function handlePlaylistLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
    log('info', 'handling playlist oneclick install', {url, install});
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
export function handleDownloadInstall(api: IExtensionApi, details: {name: string}, err: Error, id?: string, callback?: (api: IExtensionApi) => void) {
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

//#region Event Handlers

export async function handleBSIPADeployment(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }) : Promise<void> {
    var didIncludeBSIPA = deployment['bs-mod'].some(f => f.source.toLowerCase().indexOf("bsipa") !== -1);
    var alreadyPatched = isIPAReady(api);
    log('debug', 'BSIPA check completed', {didIncludeBSIPA, alreadyPatched});
    if (didIncludeBSIPA && !alreadyPatched) {
        api.sendNotification({
            type: 'warning',
            message: 'BSIPA has been deployed, but not necessarily enabled. Run Patch to attempt auto-patching.',
            title: 'BSIPA Deployed',
            actions: [
                {
                    title: 'More info',
                    action: dismiss => {
                        showPatchDialog(api, true, tryRunPatch, dismiss);
                    }
                },
                {
                    title: 'Patch',
                    action: dismiss => {
                        tryRunPatch(api, dismiss)
                    }
                }
            ]
        });
    }
}

export async function handleBSIPAPurge(api: IExtensionApi, profile: IProfile) : Promise<boolean> {
    var alreadyPatched = isIPAReady(api);
        log('debug', 'BSIPA purge check completed', {alreadyPatched});
        if (alreadyPatched) {
            var result = await showPatchDialog(api, false, tryUndoPatch);
            return result;
        }
}

export function registerProtocols(api: IExtensionApi, enableLinks: ILinkHandling) {
    if (enableLinks != undefined) {
        log('debug', 'beatvortex: initialising oneclick', { enableLinks });
        if (enableLinks?.enableMaps) {
            api.registerProtocol('beatsaver', true, (url: string, install:boolean) => handleMapLinkLaunch(api, url, install));
        }
        else if (enableLinks?.enableMaps === false) {
            api.deregisterProtocol('beatsaver');
        }
        if (enableLinks?.enableModels) {
            api.registerProtocol('modelsaber', true, (url: string, install: boolean) => handleModelLinkLaunch(api, url, install));
        }
        else if (enableLinks?.enableModels === false) {
            api.deregisterProtocol('modelsaber');
        }
    }
}

//#endregion


module.exports = {
    default: main,
};