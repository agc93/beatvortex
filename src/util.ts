import path = require("path");
import { remote } from "electron";
import { util as vtx, selectors, fs, log, util } from "vortex-api";
import nfs = require('fs');
import { IExtensionContext, NotificationDismiss, IState, IInstruction, IExtensionApi, IExtension, IGame, ThunkStore, IExtensionState } from "vortex-api/lib/types/api";
import { GAME_ID } from ".";
import { ISteamEntry } from "vortex-api/lib/util/api";
import { STEAMAPP_ID } from "./meta";

export const types = ['libs', 'plugins', 'beatsaber_data', 'ipa' ];
export const models = ['avatar', 'platform', 'saber']

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


export function isSongMod(archivePath: string): boolean;
export function isSongMod(instructions: IInstruction[]) : boolean;
export function isSongMod(files: string[]) : boolean;
export function isSongMod(files: string[]|IInstruction[]|string) {
    if (typeof files === 'string') {
        var filePath = files as string;
        var modName = path.basename(filePath, path.extname(filePath));
        let re = /[0-9a-fA-F]{40}|[0-9a-fA-F]{4}/;
        return re.test(modName);
        // return modName.length == 4 || modName.length == 40;
    }
    if (typeof files[0] === 'string') {
        return files.some((f: any) => path.extname(f).toLowerCase() == ".dat" || path.extname(f).toLowerCase() == ".egg")
    }
    var instructions = files as IInstruction[];
    return instructions.some(i => path.extname(i.source).toLowerCase() == '.dat' || path.extname(i.source).toLowerCase() == '.egg');
}

export function isGameMod(files: string[]) {
    return files.some((f: any) => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1));
}

export function isModelMod(files: string[]) : boolean {
    return files.length == 1 && models.some(m => files[0].toLowerCase().endsWith(m));
        // && models.some(m => path.extname(path.basename(files[0])).toLowerCase() == m);
}

export function isModelModInstructions(instructions: IInstruction[]) : boolean {
    var files = instructions.map(i => i.source);
    return isModelMod(files);
}

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
 * Shows a modal dialog confirming a user's consent to the terms of use.
 *
 * @remarks
 * - These terms of use are reproduced from the BSMG Wiki under CC BY-NC-SA.
 *
 * @param context - The extension context. Only required for translation of dialog text.
 * @param callback - A callback to execute when the dialog is dismissed.
 */
export function showTermsDialog(context?: IExtensionContext, callback?: ()=> void) {
    var msg = 'By proceeding you are agreeing to the following terms:';
    var detail = "You may experience problems that don't exist in the vanilla game. 99.9% of bugs, crashes, and lag are due to mods. \nMods are subject to being broken by updates and that's normal - be patient and respectful when this happens, as modders are volunteers with real lives. \nBeat Games aren't purposefully trying to break mods. They wish to work on the codebase and sometimes this breaks mods, but they are not out to kill mods. \nDo not attack the devs for issues related to mods, and vice versa - modders and devs are two separate groups.";
    remote.dialog.showMessageBox(vtx.getVisibleWindow(), {
        type: 'info',
        message: context ? context.api.translate(msg) : msg,
        detail: context ? context.api.translate(detail) : detail,
        buttons: ["I accept"],
        defaultId: 0
    }, callback ? callback : (resp: number, checked: boolean) => { });
}

export function showTermsNotification(context: IExtensionContext, autoDismiss: boolean) : void;
export function showTermsNotification(context: IExtensionContext, callback?: (dismiss: NotificationDismiss)=> void) : void;
export function showTermsNotification(context: IExtensionContext, dismissCallback : ((dismiss: NotificationDismiss)=> void) | boolean) : void {
    context.api.sendNotification({
        type: 'info',
        message: 'By using BeatVortex, you are accepting some basic terms',
        title: 'Terms of Use',
        actions: [
            {
                title: 'See More',
                action: (dismiss: NotificationDismiss) => {
                    showTermsDialog(context, typeof dismissCallback === 'boolean' 
                        ? (dismissCallback ? () => dismiss() : null) 
                        : dismissCallback ? () => {dismissCallback(dismiss)} : null)
                }
            }
        ]
    });
}

/**
 * [Obsolete] Retrieves the specified feature key's value from the current profile settings.
 *
 * @remarks
 * - Use the instance method of a ProfileClient instead of this!
 *
 * @param state - The API state object.
 * @param key - The feature key to retrieve the value of.
 * @returns The value of the given key or undefined.
 * @obsolete
 */
export function getProfileSetting(state: IState, key: string): any {
    var profileId = selectors.activeProfile(state)?.id
    if (profileId !== undefined) {
        var features = state.persistent.profiles[profileId]?.features;
        const skipTerms = features ? features[key] : undefined;
        return skipTerms;
    }
    return undefined;
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