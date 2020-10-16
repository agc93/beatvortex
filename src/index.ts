import path = require('path');

// external modules
import { fs, log, util, selectors, actions } from "vortex-api";
import { IExtensionContext, IDiscoveryResult, IGame, IState, ISupportedResult, ProgressDelegate, IInstallResult, IExtensionApi, IProfile, ThunkStore, IDeployedFile, IInstruction, ILink, IMod, IDialogResult } from 'vortex-api/lib/types/api';
import { isGameMod, isSongHash, isSongMod, types, isActiveGame, getGamePath, findGame, isModelMod, isModelModInstructions, getProfile, enableTrace, traceLog, isPlaylistMod, useTrace, toTitleCase, isGameManaged, getGameVersion } from './util';
import { ProfileClient, getModName } from "vortex-ext-common";

// local modules
import { showPatchDialog, showTermsNotification, showBSIPAUpdatesNotification, showCategoriesUpdateNotification, showPreYeetDialog, showRestartRequiredNotification, showPlaylistCreationDialog } from "./notify";
import { migrate040, migrate041 } from "./migration";
import { isIPAInstalled, isIPAReady, tryRunPatch, tryUndoPatch, BSIPAConfigManager, IPAVersionClient, handleBSIPAConfigTweak, getBSIPALaunchArgs } from "./ipa";
import { gameMetadata, STEAMAPP_ID, PROFILE_SETTINGS, tableAttributes } from './meta';
import { archiveInstaller, basicInstaller, installBeatModsArchive, installBeatSaverArchive, modelInstaller, installModelSaberFile, testMapContent, testModelContent, testPluginContent, installRemotePlaylist, looseInstaller} from "./install";
import { checkForBeatModsUpdates, installBeatModsUpdate } from "./updates";
import { updateCategories, checkBeatModsCategories, installCategories } from "./categories";
import { beatModsExtractor } from "./extractor";
import { noticeReducer, noticeStatePath, showNotices } from "./notice";
import { registerProtocols } from "./oneClick";

// clients
import { BeatSaverClient } from './beatSaverClient';
import { BeatModsClient } from './beatModsClient';
import { ModelSaberClient } from './modelSaberClient';

// components etc
import { BeatModsList } from "./beatmods";
import { PlaylistView, PlaylistManager } from "./playlists";
import { difficultiesRenderer, modesRenderer } from './attributes'
import { OneClickSettings, settingsReducer, ILinkHandling, IMetaserverSettings, GeneralSettings, PreviewSettings, IPreviewSettings, BSIPASettings, IBSIPASettings, SyncSettings, acceptTerms } from "./settings";
import { sessionReducer, updateBeatSaberVersion } from './session';
import { SyncView, syncReducer, SyncService } from './sync';
import { ServiceStatusDialog } from "./status";

export const GAME_ID = 'beatsaber';
export const I18N_NAMESPACE = 'beatvortex';
let GAME_PATH = '';

export interface DeploymentEventHandler {
    (api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> | Promise<boolean>;
}

//This is the main function Vortex will run when detecting the game extension. 
function main(context: IExtensionContext) {
    const isBeatSaberManaged = (): boolean => {
        return isGameManaged(context.api);
    }
    // context.requireVersion("^1.3");
    context.once(() => {
        enableTrace();
        addStylesheets(context.api);
        util.installIconSet('beatvortex', path.join(__dirname, 'icons.svg'));
        addTranslations(context.api, 'beatvortex');
        setupUpdates(context.api);
        handleSettings(context.api, 'enableOCI', registerProtocols);
        handleSettings(context.api, 'metaserver', registerMetaserver);
        handleSettings(context.api, 'preview');
        handleSettings(context.api, 'bsipa', registerBSIPASettings);
        if (useTrace) {
            context.api.events.on('profile-did-change', (profileId: string) => {
                handleProfileChange(context.api, profileId, (profile) => {
                    log('debug', 'beatvortex got the profile change event! checking profile.');
                    traceLog(`configured profile features: ${JSON.stringify(profile.features)}`);
                });
            });
        }
        context.api.events.on('did-deploy', (profileId: string, deployment: { [typeId: string]: IDeployedFile[] }, setTitle: (title: string) => void) => {
            setTitle("Verifying BSIPA deployment");
            handleDeploymentEvent(context.api, profileId, deployment, handleBSIPADeployment);
        });
        context.api.events.on('did-deploy', (profileId: string, deployment: { [typeId: string]: IDeployedFile[] }, setTitle: (title: string) => void) => {
            setTitle("Checking BSIPA configuration");
            handleDeploymentEvent(context.api, profileId, deployment, handleBSIPAUpdateCheck);
            handleDeploymentEvent(context.api, profileId, deployment, handleBSIPAConfigTweak);
        });
        context.api.onAsync('will-purge', async (profileId: string, deployment: { [modType: string]: IDeployedFile[] }) => {
            traceLog('beatvortex got will-purge', { profileId, deploying: Object.keys(deployment) });
            await handleDeploymentEvent(context.api, profileId, deployment, handleBSIPAPurge);
            Promise.resolve();
        });
        context.api.onAsync('install-playlist-url', async (installUrl: string) => {
            traceLog('attempting install of playlist', { playlist: installUrl });
            await installRemotePlaylist(context.api, installUrl);
            return Promise.resolve();
        });
        context.api.events.on('profile-did-change', (profileId: string) => {
            handleProfileChange(context.api, profileId, (profile) => {
                var skipTerms = util.getSafe(context.api.getState().settings, ['beatvortex', 'skipTerms'], false);
                if (!skipTerms) {
                    showTermsNotification(context.api, (dismiss) => {
                        context.api.store.dispatch(acceptTerms(true));
                        dismiss();
                    });
                }
            }, "terms of use notification");
        });
        context.api.events.on('gamemode-activated', (gameMode: string) => {
            handleActivatedEvent(gameMode, (mode) => {
                installCategories(context.api, mode);
            });
          });
          context.api.events.on('gamemode-activated', (gameMode: string) => {
              handleActivatedEvent(gameMode, (mode) => {
                showNotices(context.api);
              });
          });
          context.api.events.on('gamemode-activated', (gameMode: string) => {
              handleActivatedEvent(gameMode, (mode) => {
                var version = new IPAVersionClient(context.api)?.getUnityGameVersion() ?? getGameVersion(context.api);
                context.api.store.dispatch(updateBeatSaberVersion(version));
              });
          });
    });
    addModTypes(context)
    context.registerGame({
        ...gameMetadata,
        id: GAME_ID,
        queryPath: findGame,
        parameters: getLaunchVariables(),
        setup: (discovery: IDiscoveryResult) => {
            log('debug', 'running beatvortex setup')
            prepareForModding(discovery);
        },
        environment: {
            SteamAPPId: STEAMAPP_ID.toString()
        }
    });
    // context.registerMigration((oldVersion) => migrate031(context.api, oldVersion));
    context.registerMigration((oldVersion) => migrate040(context.api, oldVersion));
    context.registerMigration((oldVersion) => migrate041(context.api, oldVersion));
    addTableAttributes(context);
    context.registerAction(
        'categories-icons', 
        101, 
        'download', 
        {}, 
        'Get BeatMods Categories', 
        () => updateCategories(context.api, true), 
        () => selectors.activeGameId(context.api.store.getState()) === GAME_ID
    );
    // context.optional(() => {
    context.registerToolVariables((opts): {[key:string]: string} => getLaunchParams(context.api));
    // });
    context.registerAction(
        'mods-multirow-actions', 300, 'playlist', {}, 'Create Playlist', modIds => {
            var mgr = new PlaylistManager(context.api);
            mgr.createPlaylist(modIds, async (api) => {
                var result = await showPlaylistCreationDialog(api);
                return result.continue ? result : null;
            });
        }, (instances) => {
            return (selectors.activeGameId(context.api.store.getState()) === GAME_ID);
        });

    /** Mod Sources */
    addModSource(context, { id: 'beatmods', name: 'BeatMods', 'url': 'https://beatmods.com/#/mods' });
    addModSource(context, { id: 'bsaber', name: 'BeastSaber', 'url': 'https://bsaber.com/songs' });
    addModSource(context, { id: 'beatsaver', name: 'BeatSaver', 'url': 'https://beatsaver.com/browse/hot' });
    addModSource(context, { id: 'modelsaber', name: 'ModelSaber', 'url': 'https://modelsaber.com/?pc' });

    addInstallers(context);

    /** Main Pages */
    context.registerMainPage('search', 'BeatMods', BeatModsList, {
        group: 'per-game',
        visible: () => selectors.activeGameId(context.api.store.getState()) === GAME_ID,
        props: () => ({ api: context.api, mods: [] }),
    });
    context.registerMainPage('playlist', 'Playlists', PlaylistView, {
        group: 'per-game',
        visible: () => {
            return (selectors.activeGameId(context.api.store.getState()) === GAME_ID)
                && ((context.api.getState().settings['beatvortex']['preview'] as IPreviewSettings).enablePlaylistManager)
        },
        props: () => ({ api: context.api }),
    });
    context.registerMainPage('refresh', 'Sync', SyncView, {
        group: 'per-game',
        visible: () => {
            return (selectors.activeGameId(context.api.store.getState()) === GAME_ID)
                && (util.getSafe<IPreviewSettings>(context.api.getState().settings, ['beatvortex', 'preview'], {})?.enableSync == true);
        },
        props: () => ({ api: context.api, service: new SyncService(context.api) }),
    });

    /** Settings and reducers */
    context.registerSettings('Download', GeneralSettings, undefined, undefined, 100);
    context.registerSettings('Download', OneClickSettings, undefined, isBeatSaberManaged, 100);
    context.registerSettings('Interface', PreviewSettings, undefined, isBeatSaberManaged, 100);
    context.registerSettings('Workarounds', BSIPASettings, () => ({api: context.api}), isBeatSaberManaged, 100);
    context.registerSettings('Interface', SyncSettings, undefined, isBeatSaberManaged, 101);
    context.registerReducer(['settings', 'beatvortex'], settingsReducer);
    context.registerReducer(['session', 'beatvortex'], sessionReducer);
    context.registerReducer(['persistent', 'beatvortex', 'sync'], syncReducer);
    context.registerReducer(noticeStatePath.root, noticeReducer);

    /** BSMG Services dialog */
    context.registerAction('global-icons', 200, 'dashboard', {}, 'BSMG Services',
        () => { context.api.store.dispatch(actions.setDialogVisible('bs-service-status-dialog')); });
    context.registerDialog('bs-service-status-dialog', ServiceStatusDialog);

    context.registerAttributeExtractor(100, beatModsExtractor);

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
        PROFILE_SETTINGS.AllowUnknown,
        'boolean',
        'settings',
        'Allow Unknown Maps',
        'Enables installing of maps without metadata',
        () => selectors.activeGameId(context.api.store.getState()) === GAME_ID);
}

function addModTypes(context: IExtensionContext) {
    const getMapPath = (game: IGame): string => {
        return getGamePath(context.api, game, true);
    };
    const getModPath = (game: IGame): string => {
        return getGamePath(context.api, game, false);
    };
    const getPlaylistPath = (game: IGame): string => {
        return path.join(getGamePath(context.api, game, false), 'Playlists');
    }
    context.registerModType('bs-map', 100, gameId => gameId === GAME_ID, getMapPath, (inst) => Promise.resolve(isSongMod(inst)), { mergeMods: false, name: 'Song Map' });
    context.registerModType('bs-mod', 100, gameId => gameId === GAME_ID, getModPath, (inst) => Promise.resolve(isGameMod(inst)), { mergeMods: true, name: 'Plugin' });
    context.registerModType('bs-model', 100, gameId => gameId === GAME_ID, getModPath, (inst) => Promise.resolve(isModelModInstructions(inst)), { mergeMods: true, name: 'Custom Model' });
    context.registerModType('bs-playlist', 100, gameId => gameId === GAME_ID, getPlaylistPath, (inst) => Promise.resolve(isPlaylistMod(inst)), { mergeMods: true, name: 'Playlist' });
}

function addInstallers(context: IExtensionContext) {
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
    api.getI18n().loadNamespaces(ns);
    var re = new RegExp(/^language_([a-z]{2}\b(-[a-z]{2})?)\.json/);
    var langFiles = (await fs.readdirAsync(__dirname)).filter((f: string) => re.test(f));
    langFiles.forEach(async (lang: string) => {
        var match = re.exec(lang);
        log('debug', 'beatvortex loading translation file', { lang, match });
        var langContent = await fs.readFileAsync(path.join(__dirname, lang), { encoding: 'utf-8' });
        api.getI18n().addResources(match[1], ns, JSON.parse(langContent));
    });
}

async function addStylesheets(api: IExtensionApi) {
    api.setStylesheet('bs-beatmods-list', path.join(__dirname, 'beatModsList.scss'));
    api.setStylesheet('bs-playlist-view', path.join(__dirname, 'playlistView.scss'));
    api.setStylesheet('bs-map-attributes', path.join(__dirname, 'attributes.scss'));
    api.setStylesheet('bs-sync-view', path.join(__dirname, 'syncView.scss'));
    api.setStylesheet('bs-common', path.join(__dirname, 'beatVortex.scss'));
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
            calc: (mod: IMod) => util.getSafe(mod.attributes, ['songAuthor'], undefined),
            condition: () => selectors.activeGameId(context.api.getState()) === GAME_ID
        }
    );
    context.registerTableAttribute(
        'mods',
        {
            ...tableAttributes.difficulties,
            calc: (mod: IMod) => util.getSafe(mod, ['attributes', 'difficulties'], []).map(toTitleCase),
            customRenderer: (mod: IMod) => difficultiesRenderer(context.api, mod),
            condition: () => selectors.activeGameId(context.api.getState()) === GAME_ID
        }
    );
    context.registerTableAttribute(
        'mods',
        {
            ...tableAttributes.modes,
            calc: (mod: IMod) => mod.type == 'bs-map' ? util.getSafe(mod, ['attributes', 'variants'], []).map(toTitleCase) : undefined,
            customRenderer: (mod: IMod) => modesRenderer(context.api, mod),
            condition: () => selectors.activeGameId(context.api.getState()) === GAME_ID
        }
    );
    context.registerTableAttribute(
        'mods',
        {
            ...tableAttributes.bpm,
            calc: (mod: IMod) => mod.type == 'bs-map' ? util.getSafe(mod.attributes, ['bpm'], []) : undefined,
            condition: () => selectors.activeGameId(context.api.getState()) === GAME_ID
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
async function prepareForModding(discovery: IDiscoveryResult) {
    // showTermsDialog();
    GAME_PATH = discovery.path;
    let mapsPath = path.join(discovery.path, 'Beat Saber_Data', 'CustomLevels');
    let playlistsPath = path.join(discovery.path, 'Playlists')
    await fs.ensureDirWritableAsync(mapsPath);
    await fs.ensureDirWritableAsync(playlistsPath);
    // I don't honestly know how much of this duplication is actually necessary, but it works now, so I'm going to leave it
    // given this should only be called pretty infrequently, I don't think round-tripping a couple of extra times is a huge problem
    return fs.ensureDirWritableAsync(mapsPath, () => fs.ensureDirWritableAsync(playlistsPath, () => Promise.resolve()));
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

function handleActivatedEvent(gameMode: string, handler: (gameMode: string) => void, message?: string): void {
    if (gameMode != undefined && gameMode == GAME_ID) {
        traceLog(`handled gamemode-activated event. Invoking ${message ?? 'callback(s)'}`, {gameMode});
        handler?.(gameMode);
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
export function setDownloadModInfo(store: ThunkStore<any>, id: string, details: { name: string, source: string, id?: string, fileId?: string }, meta?: {[key: string]: {}}) {
    store.dispatch(actions.setDownloadModInfo(id, 'name', details.name));
    store.dispatch(actions.setDownloadModInfo(id, 'game', GAME_ID));
    store.dispatch(actions.setDownloadModInfo(id, 'logicalFileName', details.name));
    store.dispatch(actions.setDownloadModInfo(id, 'source', details.source));
    /* if (details.id) {
        store.dispatch(actions.setDownloadModInfo(id, 'custom.fileId', details.id));
    } */
    //TODO: we should really add more metadata here then use an attribute extractor to save us an API call during installation.
    //Aside from saving an API call, it would also reduce our reliance on the file names to detect sources.
    if (meta && Object.keys(meta).length > 0) {
        for (const key of Object.keys(meta)) {
            store.dispatch(actions.setDownloadModInfo(id, key, meta[key]));
        }
    }
}

//#region one-click install

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

/**
 * A simple event handler to detect and notify the user when BSIPA updates are enabled.
 * 
 * @remarks
 * This method will run on every deployment, but only take action if:
 *  - BSIPA has been deployed and run
 *  - The BSIPA config file is in place
 *  - The config file has AutoUpdate enabled
 * 
 * @param api - The extension API.
 * @param profile - The current profile.
 * @param deployment - The current deployment object.
 */
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

/**
 * A simple event handler to detect and notify the user when a game update has occurred and BSIPA yeeting is about to happen.
 * 
 * @remarks
 * This method will run on every deployment, but only take action if:
 * - Unity and BSIPA game versions don't match
 * - the disableYeeting config tweak isn't enabled
 * 
 * @param api - The extension API.
 * @param profile - The current profile.
 * @param deployment - The current deployment object.
 */
export async function handleYeetDetection(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> {
    var client = new IPAVersionClient(api);
    var currentGame = client.getUnityGameVersion();
    var lastBsipa = await client.getBSIPAGameVersion();
    var hasUpdated = (currentGame != null && lastBsipa != null) && currentGame != lastBsipa;
    if (hasUpdated) {
        // shit
        // theoretically this means the game has been updated and BSIPA hasn't been run. By default, it's about 
        // to yeet all our mods and freak Vortex the fuck out.
        var storeSettings = util.getSafe(api.getState().settings, ['beatvortex', 'bsipa'], undefined) as IBSIPASettings;
        if (storeSettings != undefined && storeSettings.disableYeeting) {
            // the config tweak will have disabled yeeting anyway
            return;
        }
        var disableMods = await showPreYeetDialog(api);
        if (disableMods) {
            var installedMods =  api.getState().persistent.mods[GAME_ID];
            // debugger;
            // var enabledMods = deployment['bs-mod'].map(df => df.source).map(dfs => installedMods[dfs] || Object.values(installedMods).find(m => getModName(m) == dfs)).filter(m => !m.id.toLowerCase().includes('bsipa'));
            var enabledMods = deployment['bs-mod'].map(df => df.source).map(dfs => installedMods[dfs]).filter(m => !m.id.toLowerCase().includes('bsipa'));
            log('info', 'identified mods eligible for yeeting', {mods: enabledMods.length});
            for (const mod of enabledMods) {
                traceLog('attempting to disable mod', {id: mod.id, name: mod.attributes.modName})
                api.store.dispatch(actions.setModEnabled(profile.id, mod.id, false));
            }
        }
    }
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
 * A simple handler to register the events used for checking mod updates
 * 
 * @param api The extension API
 */
function setupUpdates(api: IExtensionApi) {
    log('debug', 'beatvortex: initialising update handlers');
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
    api.events.on('check-mods-version', checkForUpdates);
    api.events.on('mod-update', installUpdates);
}

/**
 * An event handler to execute when the BSIPA settings are changed.
 * 
 * @remarks
 * - This method is *not* responsible for the config tweaks! That happens in ipa/applyConfig.ts
 * 
 * @param context The extension context.
 * @param previewSettings - The preview settings to apply
 * @param oldSettings - The previous settings state (used to warn when disabling)
 */
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

//#endregion

//#region Launch behaviour

function getLaunchParams(api: IExtensionApi): {[key:string]: string} {
    var opts = {
        BSIPA_OPTS: ''
    };
    if (api) {
        opts.BSIPA_OPTS = getBSIPALaunchArgs(api.getState());
        // opts.BSIPA_OPTS = bsipaOpts
    }
    return opts;
}

function getLaunchVariables(): string[] {
    var params = getLaunchParams(null);
    return Object.keys(params).map(p => `{${p}}`);
}

//#endregion


module.exports = {
    default: main,
};