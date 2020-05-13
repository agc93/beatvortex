import { IExtensionContext, NotificationDismiss, IExtensionApi, IDialogResult } from "vortex-api/lib/types/api";
import { util as vtx } from "vortex-api";
import { remote, dialog } from "electron";

import { tryRunPatch, PatchFunction } from "./ipa";

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
                    showNativeTermsDialog(context, typeof dismissCallback === 'boolean' 
                        ? (dismissCallback ? () => dismiss() : null) 
                        : dismissCallback ? () => {dismissCallback(dismiss)} : null)
                }
            }
        ]
    });
}

/**
 * Shows a modal dialog explaining the IPA auto-patching process.
 *
 * @param api - The extension context. Only required for translation of dialog text.
 * @param callback - A callback to execute when the dialog is dismissed.
 */
export function ShowRunPatchDialog(api: IExtensionApi, callback?: ()=> void) {
    var msg = 'BeatVortex can attempt to auto-patch your Beat Saber install';
    var detail = "It looks like you've deployed BSIPA, but it hasn't been run for this install.\n\nBeatVortex can attempt to automatically run IPA's first-time setup and patch your installation for you, but this isn't guaranteed to work. You should only need to do this once!";
    remote.dialog.showMessageBox(vtx.getVisibleWindow(), {
        type: 'info',
        message: api ? api.translate(msg) : msg,
        detail: api ? api.translate(detail) : detail,
        buttons: ["Run Patch"],
        defaultId: 0
    }, (resp: number, checked: boolean) => {
        //run patch here
        tryRunPatch(api);
        if (callback) {
            callback();
        }
     });
}

export async function showPatchDialog(api: IExtensionApi, toPatch: boolean, patchFn: PatchFunction, callback?: () => void): Promise<boolean> {
    var msg = toPatch 
        ? 'BeatVortex can attempt to auto-patch your Beat Saber install'
        : 'BeatVortex can attempt to revert BSIPA patching before purging mods';
    var detail = toPatch
        ? "It looks like you've deployed BSIPA, but it hasn't been run for this install.\n\nBeatVortex can attempt to automatically run IPA's first-time setup and patch your installation for you, but this isn't guaranteed to work. You should only need to do this once!"
        : "If you're purging mods to take Beat Saber back to fully stock, you may want to revert BSIPA patching. \n\nBeatVortex can attempt to automatically run IPA's revert to unpatch your installation, but this isn't guaranteed to work.";
    var diag : IDialogResult = await api.showDialog(
        'question', 
        "BSIPA Patching",
        {
            text: msg + '\n\n' + detail
        },
        [
            {label: 'Skip'},
            {
                label: toPatch ? 'Run Patch'  : 'Revert Patch',
                action: () => patchFn(api, callback)
            },
        ]);
    var toRun = diag.action !== 'Skip'
    // if (toRun) {
    //     patchFn(api, callback)
    // }
    return toRun;
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
export function showNativeTermsDialog(context?: IExtensionContext, callback?: ()=> void) {
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

export function showTermsDialog(api: IExtensionApi, callback?: () => void) {
    var msg = 'By proceeding you are agreeing to the following terms:\n' +
        "You may experience problems that don't exist in the vanilla game. 99.9% of bugs, crashes, and lag are due to mods. \nMods are subject to being broken by updates and that's normal - be patient and respectful when this happens, as modders are volunteers with real lives. \nBeat Games aren't purposefully trying to break mods. They wish to work on the codebase and sometimes this breaks mods, but they are not out to kill mods. \nDo not attack the devs for issues related to mods, and vice versa - modders and devs are two separate groups.";
    api.showDialog('info', 'Terms of Use', {
        text: msg,
    },[
        {label: 'I Accept'}
    ]).then((result: IDialogResult) => {
        if (callback) {
            callback();
        }
    });
}