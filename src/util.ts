import path = require("path");
import { util as vtx, selectors, fs, log, util, actions } from "vortex-api";
import nfs = require('fs');
import { IExtensionContext, IState, IInstruction, IExtensionApi, IGame, ThunkStore, IProfile, IDiscoveryResult } from "vortex-api/lib/types/api";
import { GAME_ID } from ".";
import { ISteamEntry } from "vortex-api/lib/util/api";
import { STEAMAPP_ID } from "./meta";

export const types = ['libs', 'plugins', 'beatsaber_data', 'ipa' ];
export const models = ['avatar', 'platform', 'saber']

export var useTrace: boolean = false;

export function getModName(destinationPath: string) : string {
    var modName = path.basename(destinationPath).split('.').slice(0, -1).join('.');
    return modName;
}

export async function getAllFiles(dir) {
  const dirents = await nfs.promises.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.join(dir, dirent.name);
    return dirent.isDirectory() ? getAllFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

export const arrayToObject = <T>(array: T[], keyFunc: (obj: T) => string) =>
   array.reduce((obj, item) => {
       obj[(keyFunc(item))] = item;
    //  obj[item[keyField]] = item
     return obj
}, {})

/**
 * Determines if the given string is a BeatSaver song hash, or optionally a key.
 *
 * @remarks
 * - This is just checking format, and doesn't guarantee the map exists etc
 *
 * @param str - The string to validate.
 * @param allowKey - Optionally whether a song key (e.g. 92fe) is also acceptable.
 */
export function isSongHash(str: string, allowKey: boolean = false) {
    // let re = /^(?=[A-Fa-f0-9]*$)(?:.{4}|.{40})$/;
    let re = allowKey ? /[0-9a-fA-F]{40}|[0-9a-fA-F]{4}/ : /[0-9a-fA-F]{40}/;
    return re.test(str);
}

export function toTitleCase(str: string) {
    return str.replace(
        /\w\S*/g,
        function(txt: string) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

/**
 * Locates the installed game.
 * @returns The root installation path of the Beat Saber install.
 */
export function findGame() {
    return util.steam.findByAppId(STEAMAPP_ID.toString())
        .then((game : ISteamEntry) => game.gamePath);
}

export function getGameInstallPath(api: IExtensionApi) {
    var discovery = util.getSafe(api.getState().settings.gameMode.discovered, [GAME_ID], undefined);
    if (discovery === undefined) {
        return null;
    } else {
        return (discovery as IDiscoveryResult).path;
    }
}

export function getGamePath(api: IExtensionApi, useSongPath: boolean): string;
export function getGamePath(api: IExtensionApi, game: IGame, useSongPath: boolean): string;
export function getGamePath(api: IExtensionApi, gameOrPath: IGame | boolean, useSongPath?: boolean) {
    const state: IState = api.store.getState();
    if (gameOrPath as IGame) {
        var game = gameOrPath as IGame;
        const discovery = state.settings.gameMode.discovered[game.id];
        return useSongPath ? path.join(discovery.path, 'Beat Saber_Data', 'CustomLevels') : discovery.path;
    } else {
        useSongPath = gameOrPath as boolean;
        const discovery = state.settings.gameMode.discovered[GAME_ID];
        return useSongPath ? path.join(discovery.path, 'Beat Saber_Data', 'CustomLevels') : discovery.path;
    }
}


// export function isSongMod(archivePath: string): boolean;
export function isSongMod(instructions: IInstruction[], allowNested?: boolean) : boolean;
export function isSongMod(files: string[], allowNested?: boolean) : boolean;
export function isSongMod(files: string[]|IInstruction[]|string, allowNested: boolean) {
    /* if (typeof files === 'string') {
        var filePath = files as string;
        var modName = path.basename(filePath, path.extname(filePath));
        let re = /[0-9a-fA-F]{40}|[0-9a-fA-F]{4}/;
        return re.test(modName);
        // return modName.length == 4 || modName.length == 40;
    } */
    if (typeof files[0] === 'string') {
        return (files as string[]).some((f: any) => path.extname(f).toLowerCase() == ".dat" || path.extname(f).toLowerCase() == ".egg") &&
            !(files as string[]).filter((f: any) => path.extname(f).toLowerCase() == ".dat").some((f: string) => f.indexOf('Beat Saber_Data') !== -1)
    }
    var instructions = (files as IInstruction[]).filter(f => f.type && f.type == 'copy');
    return instructions.some(i => path.extname(i.source).toLowerCase() == '.dat' || path.extname(i.source).toLowerCase() == '.egg') && 
        !instructions.filter((f) => path.extname(f.source).toLowerCase() == ".dat").some(f => f.source.indexOf('Beat Saber_Data') !== -1)
}

export function isGameMod(files: string[]) : boolean
export function isGameMod(instructions: IInstruction[]) : boolean
export function isGameMod(filesOrInstructions: string[]|IInstruction[]) : boolean {
    let files: string[] = (typeof filesOrInstructions[0] !== 'string')
        ? (filesOrInstructions as IInstruction[]).map(i => i.source)
        : filesOrInstructions as string[];
    return files.some(f => path.extname(f) == '.dll' || types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1));
}

export function isModelMod(files: string[]) : boolean {

    return files.length == 1 && models.some(m => files[0].toLowerCase().endsWith(m));
        // && models.some(m => path.extname(path.basename(files[0])).toLowerCase() == m);
}

export function isPlaylistMod(instructions: IInstruction[]) : boolean {
    var files = instructions.map(i => i.source);
    return files.some(f => path.extname(f) == '.bplist');
}

export function isModelModInstructions(instructions: IInstruction[]) : boolean {
    var files = instructions.map(i => i.source);
    return isModelMod(files);
}

// WARNING: I'm honestly not sure this is working, and I have no idea why not. I think the type checking might not be right?
export function isActiveGame(api: IExtensionApi): boolean;
export function isActiveGame(context: IExtensionContext): boolean;
export function isActiveGame(store: ThunkStore<any>): boolean;
export function isActiveGame(context : IExtensionContext | IExtensionApi | ThunkStore<any>) : boolean {
    return selectors.activeGameId(
        (context as IExtensionContext) 
            ? (context as IExtensionContext).api.store.getState()
            : (context as IExtensionApi)
                ? (context as IExtensionApi).store.getState()
                : (context as ThunkStore<any>)) === GAME_ID;
}

/**
 * Retrieves the currently installed version of Beat Saber.
 *
 * @remarks
 * - This will only work if the current version has been *run* at least once.
 * - Reads directly from BeatSaberVersion.txt in the installation directory.
 *
 * @param api - The extension API.
 * @returns The exact version string for the currently installed Beat Saber version.
 */
export function getGameVersion(api: IExtensionApi) : string {
    var gamePath = getGamePath(api, false);
    var filePath = path.join(gamePath, "BeatSaberVersion.txt");
    if (nfs.existsSync(filePath)) {
        var version = fs.readFileSync(filePath, "utf8");
        log('debug', 'beatvortex: detected game version from BeatSaberVersion.txt', version);
        return version;
    } else {
        log('warn', 'could not detect game version!');
        return null;
    }    
}

export function getProfile(api: IExtensionApi, profileId: string) : {isBeatSaber: boolean, profile: IProfile} {
    var newProfile: IProfile = util.getSafe(api.store.getState(), ['persistent', 'profiles', profileId], undefined);
    return {
        profile: newProfile,
        isBeatSaber: ((newProfile !== undefined) && newProfile.gameId === GAME_ID)
    };
}

export function getCurrentProfile(api: IExtensionApi): string {
    return api.getState().settings.profiles.lastActiveProfile[GAME_ID];
}

export function traceLog(message: string, metadata?: object) : void {
    if (useTrace) {
        log('debug', message, metadata);
    }
}

export function enableTrace() {
    if (nfs.existsSync('/BeatVortexDebug.txt')) {
        useTrace = true;
    }
}