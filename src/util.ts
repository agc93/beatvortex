import path = require("path");
import { remote } from "electron";
import { util as vtx, selectors } from "vortex-api";
import { IExtensionContext, NotificationDismiss, IState, IInstruction } from "vortex-api/lib/types/api";
import { GAME_ID } from ".";

export const types = ['libs', 'plugins', 'beatsaber_data', 'ipa' ]

export function isSongHash(str: string) {
    let re = /[0-9a-f]{40}/;
    return re.test(str);
}

export function isSongMod(instructions: IInstruction[]) : boolean;
export function isSongMod(files: string[]) : boolean;
export function isSongMod(files: string[]|IInstruction[]) {
    if (typeof files[0] === 'string') {
        return files.some((f: any) => path.extname(f).toLowerCase() == ".dat" || path.extname(f).toLowerCase() == ".egg")
    }
    var instructions = files as IInstruction[];
    return instructions.some(i => path.extname(i.source).toLowerCase() == '.dat' || path.extname(i.source).toLowerCase() == '.egg');
}

export function isGameMod(files: any[]) {
    return files.some((f: any) => types.some(t => path.dirname(f).toLowerCase().indexOf(t) !== -1));
}

export function isActiveGame(context : IExtensionContext) : boolean {
    return selectors.activeGameId(context.api.store.getState()) === GAME_ID;
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
export function showTermsNotification(context: IExtensionContext, autoDismiss: boolean);
export function showTermsNotification(context: IExtensionContext, callback?: (dismiss: NotificationDismiss)=> void);
export function showTermsNotification(context: IExtensionContext, dismissCallback : ((dismiss: NotificationDismiss)=> void) | boolean) {
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
    var profileId = selectors.activeProfile(state).id
    const skipTerms = state.persistent.profiles[profileId]?.features[key];
    return skipTerms;
}