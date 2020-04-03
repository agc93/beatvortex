//Import some assets from Vortex we'll need.
import path = require('path');

import { fs, log, util, selectors, actions } from "vortex-api";
import { IExtensionContext, IDiscoveryResult, IGame, IState, ISupportedResult, ProgressDelegate, IInstallResult, IExtensionApi, IProfile, ThunkStore } from 'vortex-api/lib/types/api';

import { isGameMod, isSongHash, isSongMod, types, showTermsDialog, isActiveGame, showTermsNotification, getProfileSetting } from './util';
import * as meta from './meta';

import { ISteamEntry } from 'vortex-api/lib/util/api';
import { InstructionType } from 'vortex-api/lib/extensions/mod_management/types/IInstallResult';
import { BeatSaverClient } from './beatSaverClient';

export const GAME_ID = 'beatsaber'
const STEAMAPP_ID = 620980;
let GAME_PATH = '';
let store: ThunkStore<any>;

//This is the main function Vortex will run when detecting the game extension. 
function main(context : IExtensionContext) {
    const getMapPath = (game: IGame): string => {
        const state: IState = context.api.store.getState();
        const discovery = state.settings.gameMode.discovered[game.id];
        return path.join(discovery.path, 'Beat Saber_Data', 'CustomLevels');
      };
      const getModPath = (game: IGame): string => {
        const state: IState = context.api.store.getState();
        const discovery = state.settings.gameMode.discovered[game.id];
        return discovery.path;
      };
    this.store = context.api.store;
    context.once(() => {
        // this.store = context.api.store;
        if (isActiveGame(context)) {
            // showTermsDialog(context);
        }
    });
    
    addProfileFeatures(context);
    var enableLinks = getProfileSetting(context.api.store.getState(), 'bs_oneclick');
    if (enableLinks) {
        context.api.registerProtocol('beatsaver', true, (url: string, install:boolean) => handleLinkLaunch(context.api, url, install));
    }
    context.api.events.on('profile-did-change', (profileId: string) => {
        var newProfile: IProfile = util.getSafe(this.store.getState(), ['persistent', 'profiles', profileId], undefined);
        if ((newProfile !== undefined) && newProfile.gameId === GAME_ID) {
            log('debug', 'beatvortex got the profile change event! skipping.')
        }
    })
    context.registerModType('bs-map', 100, gameId => gameId === GAME_ID, getMapPath, (inst) => Promise.resolve(isSongMod(inst)), { mergeMods: false });
    context.registerModType('bs-mod', 90, gameId => gameId === GAME_ID, getModPath, () => Promise.resolve(true), { mergeMods: true});
    context.registerGame({
        id: GAME_ID,
        name: 'Beat Saber',
        mergeMods: true,
        queryPath: findGame,
        supportedTools: tools,
        queryModPath: () => '.',
        logo: 'gameart.png',
        executable: () => 'Beat Saber.exe',
        requiredFiles: [
            'Beat Saber.exe'
        ],
        setup: (discovery: IDiscoveryResult) => {
            var skipTerms = getProfileSetting(context.api.store.getState(), 'bs_skip_terms');
            if (!skipTerms) {
                showTermsNotification(context, true);
            }
            prepareForModding(discovery);
        },
        environment: {
            SteamAPPId: STEAMAPP_ID.toString(),
            gamepath: GAME_PATH
        },
        details: {
            steamAppId: STEAMAPP_ID
        },
    });
    addModSource(context, { id: 'beatmods', name: 'BeatMods', 'url': 'https://beatmods.com/#/mods'});
    addModSource(context, { id: 'bsaber', name: 'BeastSaber', 'url': 'https://bsaber.com/songs'});
    
    context.registerInstaller('bs-content', 25, testSupportedContent, installContent);
    

    return true
}

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

function addProfileFeatures(context: IExtensionContext) {
    context.registerProfileFeature(
        'bs_skip_terms', 
        'boolean', 
        'savegame', 
        'Skip Terms of Use', 
        "Skips the notification regarding BeatVortex's terms of use", 
        () => selectors.activeGameId(context.api.store.getState()) === GAME_ID);
    context.registerProfileFeature(
        'bs_oneclick',
        'boolean',
        'settings',
        'Enable One-Click Handling',
        'Enables Vortex to handle Mod Assistant One-Click links',
        () => selectors.activeGameId(context.api.store.getState()) === GAME_ID);
}

const tools = [
    {
        id: 'ma',
        name: 'Mod Assistant',
        shortName: 'Mod Assistant',
        executable: () => 'ModAssistant.exe',
        requiredFiles: [
            'ModAssistant.exe'
        ],
        relative: true,
        shell: false,
        exclusive: true
    }
]

function findGame() {
    return util.steam.findByAppId(STEAMAPP_ID.toString())
        .then((game : ISteamEntry) => game.gamePath);
}

function prepareForModding(discovery : IDiscoveryResult) {
    // showTermsDialog();
    GAME_PATH = discovery.path;
    let pluginPath = path.join(discovery.path, 'Plugins')
    return fs.ensureDirWritableAsync(pluginPath, () => Promise.resolve());
}


function testSupportedContent(files: string[], gameId: string): Promise<ISupportedResult> {
    log('debug', `files: ${files.length} [${files[0]}]`);
    let supported = (gameId === GAME_ID) &&
        (
            isGameMod(files) || // game mod
            isSongMod(files) //song
        );
    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}

async function installContent(files: string[], destinationPath: string, gameId: string, progressDelegate: ProgressDelegate): Promise<IInstallResult> {
    log('debug', `${files[0]}|${destinationPath}|${gameId}`);
    var modName = path.basename(destinationPath).split('.').slice(0, -1).join('.');
    
    if (isSongMod(files)) {
        log('info', `installing ${modName} mod as custom song level`);
        //install song
        var targetName: string = modName;
        if (isSongHash(modName)) { //beatsaver.com zip download
            log('debug', 'attempting to get map name from beatsaver.com')
            try {
                targetName = await meta.getMapName(modName, targetName);
            } catch (error) {
                // ignored
            }
        }
        const instructions = files.map((file: any) => {
            return { 
                type: 'copy' as InstructionType,
                source: file,
                destination: `Beat Saber_Data/CustomLevels/${targetName}/${file}`
            };
        });
        return Promise.resolve({ instructions : instructions });
    }
    let firstType = path.dirname(files.find(f => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1)));
    let root = path.dirname(firstType);
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
}

async function handleLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
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
        
        var proxyLink = client.buildProxyLink(details, 'http://alistair-b450:8081/')
        log('debug', `attempting proxy: ${proxyLink}`);
        api.events.emit('start-download', 
            [proxyLink], 
            {
                game: 'beatsaber',
                name: details.name
            }, 
            details.name, 
            (err: Error, id?: string) => handleDownloadInstall(api, details.name, err, id), 
            true);
    }
}

function handleDownloadInstall(api: IExtensionApi, name: string, err: Error, id?: string) {
    log('debug', `downloaded ${id} (or was it ${err})`);
    if (!err) {
        api.sendNotification({
            id: `ready-to-install-${id}`,
            type: 'success',
            title: api.translate('Download finished'),
            group: 'download-finished',
            message: name,
            actions: [
              {
                title: 'Install All', action: dismiss => {
                  api.events.emit('start-install-download', id, true);
                  dismiss();
                },
              },
            ],
          });
        // api.events.emit('start-install-download', id, true, (err, id: string) => log('debug', `installed, I think: ${id}|${err}`));
    }
}


module.exports = {
    default: main,
};