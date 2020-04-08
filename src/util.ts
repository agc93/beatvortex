import path = require("path");
import { remote } from "electron";
import { util as vtx, selectors, fs, log, util } from "vortex-api";
import { IExtensionContext, NotificationDismiss, IState, IInstruction, IExtensionApi, IExtension, IGame, ThunkStore, IExtensionState } from "vortex-api/lib/types/api";
import { GAME_ID, STEAMAPP_ID } from ".";
import { ISteamEntry } from "vortex-api/lib/util/api";

export const types = ['libs', 'plugins', 'beatsaber_data', 'ipa' ];

export function isSongHash(str: string, allowKey: boolean = false) {
    // let re = /^(?=[A-Fa-f0-9]*$)(?:.{4}|.{40})$/;
    let re = allowKey ? /[0-9a-fA-F]{40}|[0-9a-fA-F]{4}/ : /[0-9a-fA-F]{40}/;
    return re.test(str);
}

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

export function getProfileSetting(state: IState, key: string): any {
    var profileId = selectors.activeProfile(state)?.id
    if (profileId !== undefined) {
        var features = state.persistent.profiles[profileId]?.features;
        const skipTerms = features ? features[key] : undefined;
        return skipTerms;
    }
    return undefined;
}

export function getGameVersion(api: IExtensionApi) : string {
    var gamePath = getGamePath(api, false);
    var filePath = path.join(gamePath, "BeatSaberVersion.txt");
    var version = fs.readFileSync(filePath);
    log('debug', 'beatvortex: detected game version from BeatSaberVersion.txt', version);
    return version;
}