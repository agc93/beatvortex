import path = require('path');

// external modules
import { fs, log, util, selectors, actions } from "vortex-api";
import { IExtensionContext, IDiscoveryResult, IGame, IState, ISupportedResult, ProgressDelegate, IInstallResult, IExtensionApi, IProfile, ThunkStore, IDeployedFile, IInstruction, ILink, IMod, IDialogResult } from 'vortex-api/lib/types/api';
import { isGameMod, isSongHash, isSongMod, types, isActiveGame, getGamePath, findGame, isModelMod, isModelModInstructions, getProfile, enableTrace, traceLog, getModName, isPlaylistMod, useTrace, toTitleCase, isGameManaged, getGameVersion } from './util';
import { ProfileClient } from "vortex-ext-common";

// local modules
import { showPatchDialog, showTermsNotification, showLooseDllNotification, showBSIPAUpdatesNotification, showCategoriesUpdateNotification, showPreYeetDialog, showRestartRequiredNotification } from "./notify";
import { migrate031, getVortexVersion, meetsMinimum } from "./migration";
import { isIPAInstalled, isIPAReady, tryRunPatch, tryUndoPatch, BSIPAConfigManager, IPAVersionClient, handleBSIPAConfigTweak } from "./ipa";
import { gameMetadata, STEAMAPP_ID, PROFILE_SETTINGS, tableAttributes } from './meta';
import { archiveInstaller, basicInstaller, installBeatModsArchive, installBeatSaverArchive, modelInstaller, installModelSaberFile, testMapContent, testModelContent, testPluginContent, installLocalPlaylist, installRemotePlaylist, looseInstaller} from "./install";
import { checkForBeatModsUpdates, installBeatModsUpdate } from "./updates";
import { updateCategories, checkBeatModsCategories } from "./categories";

// clients
import { BeatSaverClient, IMapDetails } from './beatSaverClient';
import { BeatModsClient } from './beatModsClient';
import { ModelSaberClient } from './modelSaberClient';

// components etc
import { BeatModsList } from "./beatmods";
import { PlaylistView, PlaylistManager } from "./playlists";
import { difficultiesRenderer, modesRenderer } from './attributes'
import { OneClickSettings, settingsReducer, ILinkHandling, IMetaserverSettings, GeneralSettings, PreviewSettings, IPreviewSettings, BSIPASettings, IBSIPASettings } from "./settings";
import { sessionReducer, updateBeatSaberVersion } from './session';

export const GAME_ID = 'beatsaber'
let GAME_PATH = '';

export const FORCE_DIRTY_PURGE = ['beatvortex', 'forceDirtyPurge'];

export interface DeploymentEventHandler {
    (api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> | Promise<boolean>;
}

//This is the main function Vortex will run when detecting the game extension. 
function main(context: IExtensionContext) {
    const getMapPath = (game: IGame): string => {
        return getGamePath(context.api, game, true);
    };
    const getModPath = (game: IGame): string => {
        return getGamePath(context.api, game, false);
    };
    const getPlaylistPath = (game: IGame): string => {
        return path.join(getGamePath(context.api, game, false), 'Playlists');
    }
    const isBeatSaberManaged = (): boolean => {
        return isGameManaged(context.api);
    }
    context.once(() => {
        enableTrace();
        if (isActiveGame(context)) { }
        context.api.setStylesheet('bs-beatmods-list', path.join(__dirname, 'beatModsList.scss'));
        context.api.setStylesheet('bs-playlist-view', path.join(__dirname, 'playlistView.scss'));
        context.api.setStylesheet('bs-map-attributes', path.join(__dirname, 'attributes.scss'));
        util.installIconSet('beatvortex', path.join(__dirname, 'icons.svg'));
        addTranslations(context.api, 'beatvortex');
        handleSettings(context.api, 'enableOCI', registerProtocols);
        handleSettings(context.api, 'metaserver', registerMetaserver);
        handleSettings(context.api, 'preview', registerPreviewSettings);
        handleSettings(context.api, 'bsipa', registerBSIPASettings);
        if (useTrace) {
            context.api.onStateChange(['settings', 'metaserver', 'servers'], (previous, current: { [id: string]: { url: string; priority: number; } }) => {
                log('debug', 'got settings change', { current });
                logMetaservers(context.api, current);
            });
            context.api.events.on('profile-did-change', (profileId: string) => {
                handleProfileChange(context.api, profileId, (profile) => {
                    log('debug', 'beatvortex got the profile change event! checking profile.');
                    traceLog(`configured profile features: ${JSON.stringify(profile.features)}`);
                });
            });
        }
        context.api.events.on('did-deploy', (profileId: string, deployment: { [typeId: string]: IDeployedFile[] }, setTitle: (title: string) => void) => {
            handleDeploymentEvent(context.api, profileId, deployment, handleBSIPADeployment);
        });
        context.api.events.on('did-deploy', (profileId: string, deployment: { [typeId: string]: IDeployedFile[] }, setTitle: (title: string) => void) => {
            handleDeploymentEvent(context.api, profileId, deployment, handleBSIPAUpdateCheck);
            handleDeploymentEvent(context.api, profileId, deployment, handleVersionUpdate);
            handleDeploymentEvent(context.api, profileId, deployment, handleBSIPAConfigTweak);
        });
        context.api.onAsync('will-purge', async (profileId: string, deployment: { [modType: string]: IDeployedFile[] }) => {
            traceLog('beatvortex got will-purge', { profileId, deploying: Object.keys(deployment) });
            await handleDeploymentEvent(context.api, profileId, deployment, handleBSIPAPurge)
            Promise.resolve();
        });
        context.api.onAsync('install-playlist', async (installUrl: string) => {
            traceLog('attempting install of playlist', { playlist: installUrl });
            await installRemotePlaylist(context.api, installUrl);
            return Promise.resolve();
        });
        context.api.events.on('start-install', (archivePath: string, callback: (err: Error) => void) => {
            var looseSupported = meetsMinimum('1.2.17');
            if (!looseSupported) {
                var isBeatSaber = selectors.activeGameId(context.api.store.getState()) === GAME_ID;
                var isLoosePlugin = path.extname(archivePath).toLowerCase() == '.dll';
                if (isBeatSaber && isLoosePlugin) {
                    showLooseDllNotification(context.api, path.basename(archivePath));
                }
            }
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
        context.api.events.on('gamemode-activated', (gameMode: string) => {
            if (gameMode != undefined && gameMode == GAME_ID && ((context.api.getState().settings['beatvortex']['preview'] as IPreviewSettings).enableCategories)) {
                var isInstalled = checkBeatModsCategories(context.api);
                if (!isInstalled) {
                    updateCategories(context.api, false);
                    showCategoriesUpdateNotification(context.api);
                }
            }
          });
          context.api.events.on('gamemode-activated', (gameMode: string) => {
            if (gameMode != undefined && gameMode == GAME_ID) {
                var version = new IPAVersionClient(context.api)?.getUnityGameVersion() ?? getGameVersion(context.api);
                context.api.store.dispatch(updateBeatSaberVersion(version));
            }
          });
    });
    context.registerModType('bs-map', 100, gameId => gameId === GAME_ID, getMapPath, (inst) => Promise.resolve(isSongMod(inst)), { mergeMods: false, name: 'Song Map' });
    context.registerModType('bs-mod', 100, gameId => gameId === GAME_ID, getModPath, (inst) => Promise.resolve(isGameMod(inst)), { mergeMods: true, name: 'Plugin' });
    context.registerModType('bs-model', 100, gameId => gameId === GAME_ID, getModPath, (inst) => Promise.resolve(isModelModInstructions(inst)), { mergeMods: true, name: 'Custom Model' });
    context.registerModType('bs-playlist', 100, gameId => gameId === GAME_ID, getPlaylistPath, (inst) => Promise.resolve(isPlaylistMod(inst)), { mergeMods: true, name: 'Playlist' });
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
    context.registerMigration((oldVersion) => migrate031(context.api, oldVersion));
    addTableAttributes(context);
    context.registerAction(
        'categories-icons', 
        101, 
        'download', 
        {}, 
        'Get BeatMods Categories', 
        () => updateCategories(context.api, true), 
        () => {
            return (selectors.activeGameId(context.api.store.getState()) === GAME_ID)
                && ((context.api.getState().settings['beatvortex']['preview'] as IPreviewSettings).enableCategories)
        }
    );
    context.registerAction(
        'mods-multirow-actions', 300, 'layout-list', {}, 'Create Playlist', modIds => {
            createPlaylist(context.api, modIds);
        }, (instances) => {
            return (selectors.activeGameId(context.api.store.getState()) === GAME_ID);
        });

    addModSource(context, { id: 'beatmods', name: 'BeatMods', 'url': 'https://beatmods.com/#/mods' });
    addModSource(context, { id: 'bsaber', name: 'BeastSaber', 'url': 'https://bsaber.com/songs' });
    addModSource(context, { id: 'beatsaver', name: 'BeatSaver', 'url': 'https://beatsaver.com/browse/hot' });
    addModSource(context, { id: 'modelsaber', name: 'ModelSaber', 'url': 'https://modelsaber.com/?pc' });

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
        props: () => ({ api: context.api, mods: [] }),
    });
    context.registerMainPage('layout-list', 'Playlists', PlaylistView, {
        group: 'per-game',
        visible: () => {
            return (selectors.activeGameId(context.api.store.getState()) === GAME_ID)
                && ((context.api.getState().settings['beatvortex']['preview'] as IPreviewSettings).enablePlaylistManager)
        },
        props: () => ({ api: context.api }),
    });

    context.registerSettings('Download', GeneralSettings, undefined, undefined, 100);
    context.registerSettings('Download', OneClickSettings, undefined, isBeatSaberManaged, 100);
    context.registerSettings('Interface', PreviewSettings, undefined, isBeatSaberManaged, 100);
    context.registerSettings('Workarounds', BSIPASettings, undefined, isBeatSaberManaged, 100);
    context.registerReducer(['settings', 'beatvortex'], settingsReducer);
    context.registerReducer(['session', 'beatvortex'], sessionReducer);


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
function addModSource(context: IExtensionContext, details: { id: string, name: string, url: string }) {
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
 * Loads extension-specific translation files directly into `i18next`
 * 
 * @remarks
 * - A note for other extension authors: **DON'T DO THIS**.
 * - See https://github.com/Nexus-Mods/Vortex/issues/6311 for why this is a bad idea
 * - I'm leaving this here because I'm wilfully breaking things, but please don't do this.
 * 
 * @param api The extension API
 * @param ns The namespace to load translations for
 */
async function addTranslations(api: IExtensionApi, ns: string = 'beatvortex'): Promise<void> {
    var re = new RegExp(/^language_([a-z]{2}\b(-[a-z]{2})?)\.json/);
    var langFiles = (await fs.readdirAsync(__dirname)).filter((f: string) => re.test(f));
    langFiles.forEach(async (lang: string) => {
        var match = re.exec(lang);
        log('debug', 'beatvortex loading translation file', { lang, match });
        var langContent = await fs.readFileAsync(path.join(__dirname, lang), { encoding: 'utf-8' });
        api.getI18n().addResources(match[1], ns, JSON.parse(langContent));
    });
}

/**
 * Registers the extra mod list attributes for Beat Saber mods
 * 
 * @remarks
 * - The actual metadata used for table attributes is mostly stored in `meta.tableAttributes` and registered here
 */
async function addTableAttributes(context: IExtensionContext) {

    context.registerTableAttribute(
        'mods',
        {
            ...tableAttributes.artist,
            calc: (mod: IMod) => util.getSafe(mod.attributes, ['songAuthor'], ''),
            condition: () => selectors.activeGameId(context.api.getState()) === GAME_ID,
        }
    );
    context.registerTableAttribute(
        'mods',
        {
            ...tableAttributes.difficulties,
            calc: (mod: IMod) => util.getSafe(mod, ['attributes', 'difficulties'], []).map(toTitleCase),
            customRenderer: (mod: IMod) => difficultiesRenderer(context.api, mod)
        }
    );
    context.registerTableAttribute(
        'mods',
        {
            ...tableAttributes.modes,
            calc: (mod: IMod) => util.getSafe(mod, ['attributes', 'variants'], []).map(toTitleCase),
            customRenderer: (mod: IMod) => modesRenderer(context.api, mod)
        }
    );
    context.registerTableAttribute(
        'mods',
        {
            ...tableAttributes.bpm,
            calc: (mod: IMod) => util.getSafe(mod.attributes, ['bpm'], []),

        }
    );
}

/**
 * Preps the Beat Saber installation for mod deployment.
 * @remarks
 * Other than creating the CustomLevels folder (not strictly necessary), this is a basic sanity check only.
 *
 * @param discovery - The details for the discovered game.
 */
function prepareForModding(discovery: IDiscoveryResult) {
    // showTermsDialog();
    GAME_PATH = discovery.path;
    let mapsPath = path.join(discovery.path, 'Beat Saber_Data', 'CustomLevels');
    // let playlistsPath = path.join(discovery.path, 'Playlists')
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

/**
 * The wrapper function responsible for installing bs-map mods using the installers from `./install`
 * 
 * @remarks
 * - This method also enables the additional metadata specific to BeatSaver archives.
 * 
 * @param files The list of files being installed
 * @param destinationPath The target/destination path (also used to determine mod name)
 * @param gameId The game ID for the current install. Should only ever be GAME_ID
 * @param progressDelegate Unused delegate for reporting progress
 */
async function installMapContent(files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate): Promise<IInstallResult> {
    var modName = getModName(destinationPath);
    log('info', `installing ${modName} as custom song level`);
    //install song
    let instructions: IInstruction[];
    instructions = await basicInstaller(files, null, modName, installBeatSaverArchive);
    return Promise.resolve({ instructions });
}

/**
 * The wrapper function responsible for installing bs-model mods using the installers from `./install`
 * 
 * @remarks
 * - This method also enables the additional metadata specific to ModelSaber files.
 * 
 * @param files The list of files being installed (generally only one file long)
 * @param destinationPath The target/destination path (also used to determine mod name)
 * @param gameId The game ID for the current install. Should only ever be GAME_ID
 * @param progressDelegate Unused delegate for reporting progress
 */
async function installModelContent(files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate): Promise<IInstallResult> {
    var modName = getModName(destinationPath);
    log('info', 'installing mod as custom model', { file: files[0], name: modName });
    //model saber "mod"
    var instructions = await modelInstaller(files, '.', modName, installModelSaberFile);
    return Promise.resolve({ instructions });
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
    log('debug', `running beatvortex installer. [${gameId}]`, { files, destinationPath });
    var modName = getModName(destinationPath);
    var firstPrim = files.find(f => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1));
    var isValid = firstPrim !== undefined
    if (isValid) {
        log('info', `${modName} detected as mod archive!`);
        var bmInstructions = await archiveInstaller(files, firstPrim, modName, BeatModsClient.isBeatModsArchive(destinationPath) ? installBeatModsArchive : null);
        // var bmInstructions = await installBeatModsArchive(api, files, firstPrim, modName, archiveInstaller);
        return Promise.resolve({ instructions: bmInstructions });
    } else if (files.every(f => path.extname(f) == '.dll')) {
        //it's a loose mod, aka something someone just grabbed off #pc-mods or some shit
        log('info', `installing ${modName} as a loose plugin`);
        var looseInstructions = await looseInstaller(files, null, modName);
        return Promise.resolve({ instructions: looseInstructions });

    } else {
        log('warn', "Couldn't find primitive root in file list. Falling back to basic installation!");
        return Promise.resolve({ instructions: await basicInstaller(files, null, modName) });
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
 * Wrapper method to run a callback/handler on deployment events.
 * 
 * @remarks
 * - This method will ensure that a) Beat Saber is the current game and b) the current profile is available
 * - Also does some basic logging
 * 
 * @param api - The extension API.
 * @param profileId The *ID* of the current profile
 * @param deployment - The current deployment object.
 * @param handler - The callback/event handler to invoke when a deployment event is caught.
 */
async function handleDeploymentEvent(api: IExtensionApi, profileId: string, deployment: { [typeId: string]: IDeployedFile[] }, handler: DeploymentEventHandler): Promise<void> {
    log('debug', 'deployment event caught!', { profileId, mods: deployment['bs-mod']?.length ?? '?', songs: deployment['bs-map']?.length ?? '?' });
    var ev = getProfile(api, profileId);
    if (ev.isBeatSaber) {
        await handler(api, ev.profile, deployment);
    }
}

/**
 * Wrapper method to handle and subscribe to a given settings
 * 
 * @remarks
 * - The callback provided to this method will also be invoked once on API load.
 * 
 * @param api - The extension API.
 * @param key - The settings key (no `beatvortex` prefix) to handle.
 * @param stateFunc The callback to invoke when the setting is changed.
 */
async function handleSettings<T>(api: IExtensionApi, key: string, stateFunc?: (api: IExtensionApi, stateValue: T, oldValue?: T) => void) {
    var state = api.getState();
    var currentState = util.getSafe(state, ['settings', 'beatvortex', key], undefined) as T;
    stateFunc?.(api, currentState);
    api.onStateChange(['settings', 'beatvortex', key], (previous: T, current: T) => {
        traceLog('got settings change', { current });
        stateFunc?.(api, current, previous);
    });
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
export function setDownloadModInfo(store: ThunkStore<any>, id: string, details: { name: string, source: string, id?: string }) {
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
    var client = new BeatSaverClient(api);
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
            (err: Error, id?: string) => directDownloadInstall(api, details, err, id, (api) => setDownloadModInfo(api.store, id, { ...details, source: 'beatsaber', id: details.key })),
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
            api.showErrorNotification(`Could not fetch details for ${mapKey}!`, `We couldn't get details from BeatSaver for that song. It may have been removed or currently unavailable.`, { allowReport: false });
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
            (err: Error, id?: string) => handleDownloadInstall(api, modelDetails, err, id, (api) => setDownloadModInfo(api.store, id, { ...modelDetails, source: 'modelsaber', id: modelDetails.id.toString() })),
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
            api.showErrorNotification(`Could not fetch details for ${modelDetails.name}!`, `We couldn't get details from ModelSaber for that link. It may have been removed or currently unavailable.`, { allowReport: false });
        }
    }
}

async function handlePlaylistLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
    log('info', 'handling playlist oneclick install', { url });
    await api.emitAndAwait('install-playlist', url);
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
export function handleDownloadInstall(api: IExtensionApi, details: { name: string }, err: Error, id?: string, callback?: (api: IExtensionApi) => void) {
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
        api.showErrorNotification(`Failed to download ${details.name}!`, `Error encountered during download and install: ${err.name}\n${err.message}`, { allowReport: false });
    }
}

/**
 * Handler for immediately installing a mod *after* the download has been completed.
 *
 * @remarks
 * - This does not notify the user, but instead immediately installs the mod
 * - This is equivalent to `handleDownloadInstall`, but without the user interaction.
 * 
 * @param api - The extension API.
 * @param details - Basic details for the download (only used for logging).
 * @param err - The error (if any) from the failed download
 * @param id - The ID of the completed download
 * @param callback - A callback to be executed immediatley before the download is queued for installation.
 */
export function directDownloadInstall(api: IExtensionApi, details: { name: string }, err: Error, id?: string, callback?: (api: IExtensionApi) => void) {
    if (!err) {
        callback(api);
        api.events.emit('start-install-download', id, true);
    } else {
        //TODO: need to actually handle this, obviously
        api.showErrorNotification(`Failed to download ${details.name}!`, `Error encountered during download and install: ${err.name}\n${err.message}`, { allowReport: false });
    }
}

//#endregion

//#region Event Handlers

/**
 * A simple event handler to detect and notify the user when a deployment includes BSIPA.
 * 
 * @remarks
 * - This method will run on every deployment, but only take action if a deployment contains BSIPA, and it hasn't already been run.
 * 
 * @param api - The extension API.
 * @param profile - The current profile.
 * @param deployment - The current deployment object.
 */
export async function handleBSIPADeployment(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> {
    var didIncludeBSIPA = deployment['bs-mod'].some(f => f.source.toLowerCase().indexOf("bsipa") !== -1);
    var alreadyPatched = isIPAReady(api);
    log('debug', 'BSIPA check completed', { didIncludeBSIPA, alreadyPatched });
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

export async function handleBSIPAUpdateCheck(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> {
    var bsipaReady = isIPAInstalled(api) && isIPAReady(api);
    if (bsipaReady) {
        var configMgr = new BSIPAConfigManager(api);
        var config = await configMgr.readConfig();
        if (config != null && config?.Updates?.AutoUpdate) {
            showBSIPAUpdatesNotification(api);
        }
    }
}

export async function handleYeetDetection(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> {
    var client = new IPAVersionClient(api);
    var currentGame = client.getUnityGameVersion();
    var lastBsipa = await client.getBSIPAGameVersion();
    var hasUpdated = (currentGame != null && lastBsipa != null) && currentGame != lastBsipa;
    if (hasUpdated) {
        // shit
        // theoretically this means the game has been updated and BSIPA hasn't been run. By default, it's about 
        // to yeet all our mods and freak Vortex the fuck out.
        var disableMods = await showPreYeetDialog(api);
        if (disableMods) {
            var installedMods =  api.getState().persistent.mods[GAME_ID];
            var enabledMods = deployment['bs-mod'].map(df => df.source).map(dfs => installedMods[dfs]).filter(m => m.id.toLowerCase().indexOf('bsipa') == -1);
            log('info', 'identified mods eligible for yeeting', {mods: enabledMods.length});
            for (const mod of enabledMods) {
                traceLog('attempting to disable mod', {id: mod.id, name: mod.attributes.modName})
                api.store.dispatch(actions.setModEnabled(profile.id, mod.id, false));
            }
        }
        // util.setSafe(context.api.getState().session, FORCE_DIRTY_PURGE, true);
    }
}

export async function handleVersionUpdate(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> {
    var client = new IPAVersionClient(api);
    util.setSafe(api.getState().persistent, ['beatvortex', 'lastDeploy', 'gameVersion'], client.getUnityGameVersion());
    util.setSafe(api.getState().persistent, ['beatvortex', 'lastDeploy', 'bsipaVersion'], await client.getBSIPAGameVersion());
}


/**
 * A simple event handler to detect and optionally revert BSIPA patching on purge.
 * 
 * @remarks
 * - This method will prompt the user whether to attempt "unpatching" with BSIPA.
 * 
 * @param api The extension API.
 * @param profile - The current profile
 */
export async function handleBSIPAPurge(api: IExtensionApi, profile: IProfile): Promise<boolean> {
    var alreadyPatched = isIPAReady(api);
    // var forceSkip = util.getSafe(api.getState().session, FORCE_DIRTY_PURGE, false);
    log('debug', 'BSIPA purge check completed', { alreadyPatched });
    if (alreadyPatched) {
        var result = await showPatchDialog(api, false, tryUndoPatch);
        return result;
    }
}

/**
 * An event handler to register/deregister protocols for OneClick installation based on user settings.
 * 
 * @param api - The extension API.
 * @param enableLinks - The link handling settings to apply.
 */
export function registerProtocols(api: IExtensionApi, enableLinks: ILinkHandling) {
    if (enableLinks != undefined) {
        log('debug', 'beatvortex: initialising oneclick', { enableLinks });
        if (enableLinks?.enableMaps) {
            api.registerProtocol('beatsaver', true, (url: string, install: boolean) => handleMapLinkLaunch(api, url, install));
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
        if (enableLinks?.enablePlaylists) {
            api.registerProtocol('bsplaylist', true, (url: string, install: boolean) => handlePlaylistLinkLaunch(api, url, install));
        }
        else if (enableLinks?.enablePlaylists === false) {
            api.deregisterProtocol('bsplaylist');
        }
    }
}

/**
 * An event handler to register/deregister the inbuilt metaserver based on user settings.
 * 
 * @param api - The extension API.
 * @param metaSettings - The metaserver settings to apply.
 */
function registerMetaserver(api: IExtensionApi, metaSettings: IMetaserverSettings) {
    if (metaSettings != undefined) {
        log('debug', 'beatvortex: initialising metaserver', { metaSettings });
        if (metaSettings.enableServer && metaSettings.serverUrl) {
            api.addMetaServer('bs-metaserver', { url: metaSettings.serverUrl.replace(/\/$/, '')});
        } else if (metaSettings.enableServer === false) {
            api.addMetaServer('bs-metaserver', undefined);
        }
    }
}

/**
 * A (currently unused) event handler to execute when the preview settings are changed.
 * 
 * @remarks
 * - This method was originally responsible for registering the actual preview components, 
 *     but this has been moved into the components themselves as enable conditions.
 * 
 * @param context The extension context.
 * @param previewSettings - The preview settings to apply
 */
function registerPreviewSettings(api: IExtensionApi, previewSettings: IPreviewSettings, oldSettings?: IPreviewSettings) {
    if (previewSettings != undefined) {
        log('debug', 'beatvortex: initialising preview settings', { previewSettings });
        const checkForUpdates = async (gameId, mods: { [id: string]: IMod }) => {
            traceLog('attempting beatvortex update check', { modCount: Object.keys(mods).length, game: gameId });
            await checkForBeatModsUpdates(api, gameId, mods);
            return Promise.resolve();
        };
        const installUpdates = async (gameId: string, modId: string) => {
            traceLog('attempting beatvortex mod update', { modId });
            await installBeatModsUpdate(api, gameId, modId);
            return Promise.resolve();
        };
        if (previewSettings.enableUpdates) {
            api.onAsync('check-mods-version', checkForUpdates);
            api.onAsync('mod-update', installUpdates);
        } else if (previewSettings.enableUpdates === false && oldSettings?.enableUpdates === true) {
            showRestartRequiredNotification(api, 'Disabling BeatMods updates requires a Vortex restart to take effect!');
        }
    }
}

function registerBSIPASettings(api: IExtensionApi, bsipaSettings: IBSIPASettings, oldSettings?: IBSIPASettings) {
    if (bsipaSettings != undefined && bsipaSettings.enableYeetDetection != undefined) {
        traceLog('beatvortex: handling bsipa settings change');
        if (bsipaSettings.enableYeetDetection) {
            log('debug', 'beatvortex: enabling yeet detection');
            api.onAsync('will-deploy', async (profileId: string, deployment: { [modType: string]: IDeployedFile[] }) => {
                await handleDeploymentEvent(api, profileId, deployment, handleYeetDetection);
            })
        } else if (bsipaSettings.enableYeetDetection === false && oldSettings?.enableYeetDetection === true) {
            showRestartRequiredNotification(api, 'Disabling automatic update detection requires a Vortex restart to take effect!');
        }
    }
}

/**
 * Debug function to log the currently configured metaservers.
 * 
 * @param api The extension API.
 * @param metaSettings The current (new) metaserver settings
 */
function logMetaservers(api: IExtensionApi, metaSettings: { [id: string]: { url: string; priority: number; } }) {
    var servers = Object.keys(metaSettings).map(k => {
        return { id: k, url: metaSettings[k].url }
    });
    log('debug', 'got metaserver state', { count: servers.length, servers: servers });
}

//#endregion

//#region Actions 

export async function createPlaylist(api: IExtensionApi, modIds: string[]) {
    if (!isActiveGame(api)) {
        return;
    }
    var mods = api.getState().persistent.mods[GAME_ID];
    var compatibleMods = modIds
        .map(mid => mods[mid])
        .filter(m => util.getSafe(m.attributes, ['source'], undefined) == 'beatsaver');
    if (compatibleMods.length == 0) {
        api.sendNotification({
            title: 'Playlist Creation Failed',
            message: 'None of the selected mods are BeatSaver maps!',
            type: 'error'
        });
    } else {
        var mgr = new PlaylistManager(api);
        var result: IDialogResult = await api.showDialog(
            'question',
            'Create Playlist',
            {
                text: 'Enter a name for your new playlist',
                input: [
                    {
                        id: 'title',
                        value: '',
                        label: 'Title'
                    },
                    {
                        id: 'image',
                        value: '',
                        label: 'Optional image URL'
                    }
                ]
            },
            [
                {label: 'Cancel'},
                {label: 'Create'}
            ]);
        if (result.action == 'Cancel') {
            return;
        }
        if (result.action == 'Create') {
            var content = mgr.createPlaylistContent(result.input.title, compatibleMods.map(m => m.id), null, result.input.image);
            api.sendNotification({
                id: `playlist-creation`,
                type: 'success',
                title: 'Playlist created',
                message: `Created new playlist with ${compatibleMods.length} maps`,
                actions: [
                  {
                    title: 'Save to file', action: async () => {
                      const playlistsPath = path.join(util.getVortexPath('temp'), 'BeatSaberPlaylists');
                      await fs.ensureDirWritableAsync(playlistsPath, () => Promise.resolve());
                      const tmpPath = path.join(playlistsPath, util.deriveInstallName(result.input.title, undefined) + ".bplist");
                      const formatted = JSON.stringify(content, null, '\t');
                      await fs.writeFileAsync(tmpPath, formatted);
                      util.opn(playlistsPath).catch(() => null);
                    },
                  },
                  {
                      title: 'Install', action: async (dismiss) => {
                          await installLocalPlaylist(api, content)
                          dismiss();
                      }
                  }
                ],
              });
        }
    }
}

//#endregion


module.exports = {
    default: main,
};