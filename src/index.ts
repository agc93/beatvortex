//Import some assets from Vortex we'll need.
import path = require('path');
const { fs, log, util } = require('vortex-api');
// const winapi = require('winapi-bindings');

import axios from 'axios';

const GAME_ID = 'beatsaber'
const STEAMAPP_ID = 620980;
let GAME_PATH = '';

const types = ['libs', 'plugins', 'beatsaber_data', 'ipa' ]

function main(context) {
    //This is the main function Vortex will run when detecting the game extension. 
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
        setup: prepareForModding,
        environment: {
            SteamAPPId: STEAMAPP_ID.toString(),
            gamepath: GAME_PATH
        },
        details: {
            steamAppId: STEAMAPP_ID
        },
    });
    context.registerInstaller('bs-content', 25, testSupportedContent, installContent);
    return true
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
        .then(game => game.gamePath);
}

function prepareForModding(discovery) {
    GAME_PATH = discovery.path;
    let pluginPath = path.join(discovery.path, 'Plugins')
    return fs.ensureDirWritableAsync(pluginPath, () => Promise.resolve());
}

function testSupportedContent(files, gameId) {
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

async function installContent(files: any[], destinationPath: string, gameId: any, progressDelegate: any) {
    log('debug', `${files[0]}|${destinationPath}|${gameId}`);
    var modName = path.basename(destinationPath).split('.').slice(0, -1).join('.');
    
    if (isSongMod(files)) {
        log('info', `installing ${modName} mod as custom song level`);
        //install song
        var targetName: string = modName;
        if (isSongHash(modName)) { //beatsaver.com zip download
            log('debug', 'attempting to get map name from beatsaver.com')
            try {
                targetName = await getMapName(modName, targetName);
            } catch (error) {
                // ignored
            }
        }
        const instructions = files.map((file: any) => {
            return { 
                type: 'copy',
                source: file,
                destination: `Beat Saber_Data/CustomLevels/${targetName}/${file}`
            };
        });
        return Promise.resolve({ instructions });
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
            type: 'copy',
            source: file,
            // I don't think ⬇ conditional is needed, but frankly it works now and I'm afraid to touch it.
            destination: `${root == "." ? file : destination}`
        }
    });
    return Promise.resolve({ instructions });
}

async function getMapName(modName: any, targetName: string) {
    await axios.get(`https://beatsaver.com/api/maps/by-hash/${modName}`)
        .then((resp) => {
            log('debug', resp.data);
            targetName = `${resp.data.name} [${resp.data.key}]`;
        })
        .catch((err) => {
            log('warning', err);
        });
    return targetName;
}

function isSongHash(str: string) {
    let re = /[0-9a-f]{40}/;
    return re.test(str);
}

function isSongMod(files: any[]) {
    return files.some((f: any) => path.extname(f).toLowerCase() == ".dat" || path.extname(f).toLowerCase() == ".egg")
}

function isGameMod(files: any[]) {
    return files.some((f: any) => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1));
}

module.exports = {
    default: main,
};