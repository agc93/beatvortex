import { IExtensionContext, NotificationDismiss, IExtensionApi, IDialogResult } from "vortex-api/lib/types/api";

import { tryRunPatch, PatchFunction } from "./ipa";
import { IPreviewSettings } from "./settings";

export function showTermsNotification(api: IExtensionApi, autoDismiss: boolean): void;
export function showTermsNotification(api: IExtensionApi, callback?: (dismiss: NotificationDismiss) => void): void;
export function showTermsNotification(api: IExtensionApi, dismissCallback: ((dismiss: NotificationDismiss) => void) | boolean): void {
    api.sendNotification({
        type: 'info',
        message: 'By using BeatVortex, you are accepting some basic terms',
        title: 'Terms of Use',
        actions: [
            {
                title: 'See More',
                action: (dismiss: NotificationDismiss) => {
                    showTermsDialog(api, typeof dismissCallback === 'boolean'
                        ? (dismissCallback ? () => dismiss() : null)
                        : dismissCallback ? () => { dismissCallback(dismiss) } : null)
                }
            }
        ]
    });
}

/**
 * Shows a modal dialog explaining the IPA auto-patching process.
 *
 * @param api - The extension context. Only required for translation of dialog text.
 * @param toPatch - Whether we are attempting to run (true) or revert (false) IPA patching.
 * @param patchFn - The patching function (callback) to execute when the dialog is accepted.
 * 
 * @returns 
 */
export async function showPatchDialog(api: IExtensionApi, toPatch: boolean, patchFn: PatchFunction, callback?: () => void): Promise<boolean> {
    var msg = toPatch
        ? 'BeatVortex can attempt to auto-patch your Beat Saber install'
        : 'BeatVortex can attempt to revert BSIPA patching before purging mods';
    var detail = toPatch
        ? "It looks like you've deployed BSIPA, but it hasn't been run for this install.\n\nBeatVortex can attempt to automatically run IPA's first-time setup and patch your installation for you, but this isn't guaranteed to work. You should only need to do this once!"
        : "If you're purging mods to take Beat Saber back to fully stock, you may want to revert BSIPA patching. \n\nBeatVortex can attempt to automatically run IPA's revert to unpatch your installation, but this isn't guaranteed to work.";
    var diag: IDialogResult = await api.showDialog(
        'question',
        "BSIPA Patching",
        {
            text: msg + '\n\n' + detail
        },
        [
            { label: 'Skip' },
            {
                label: toPatch ? 'Run Patch' : 'Revert Patch',
                action: () => patchFn(api, callback)
            },
        ]);
    var toRun = diag.action !== 'Skip'
    // if (toRun) {
    //     patchFn(api, callback)
    // }
    return toRun;
}

export function showTermsDialog(api: IExtensionApi, callback?: () => void) {
    var msg = 'By proceeding you are agreeing to the following terms:\n' +
        fullTerms;
    api.showDialog('info', 'Terms of Use', {
        text: msg,
    }, [
        { label: 'I Accept' }
    ]).then((result: IDialogResult) => {
        if (callback) {
            callback();
        }
    });
}

export function showBSIPAUpdatesNotification(api: IExtensionApi, callback?: () => void) {
    return api.sendNotification({
        type: 'warning',
        message: "It looks like BSIPA's plugin auto-updates are enabled.",
        title: 'BSIPA Updates Enabled',
        allowSuppress: true,
        actions: [
            {
                title: 'More info',
                action: dismiss => {
                    showBSIPAUpdatesDialog(api, dismiss);
                }
            }
        ]
    });
}

export function showBSIPAUpdatesDialog(api: IExtensionApi, callback?: () => void) {
    // var msg = updatesEnabled ? "It looks like BSIPA's "
    var updatesEnabled = false;
    //so we have a problem here. We *should* be warning people about this if **and only if** we're not using our launch params to do this.
    if (updatesEnabled) {
        api.showDialog(
            'info',
            'BSIPA Plugin Updates enabled',
            {
                text: "BSIPA's automatic plugin updates seem to be enabled. While this won't break things, be aware that it may result in BSIPA using a different version of plugins than what Vortex has installed. We recommend disabling BSIPA's automatic updates while you're managing mods with Vortex.",
            }, 
            [ { label: 'Continue' } ]
        ).then((result: IDialogResult) => {
            callback?.();
        });
    }
    /* } else {
        api.showDialog(
            'info',
            'BSIPA Plugin Updates enabled',
            {
                text: "BSIPA's automatic plugin updates seem to be enabled. This will result in BSIPA updating the mods you have installed with Vortex, meaning versions in use may not line up correctly, and Vortex may prompt you about changes to your mods."
            },
            [ { label: 'Continue '} ]
        ).then((result) => {
            callback?.();
        });
    } */
}

export function showCategoriesUpdateNotification(api: IExtensionApi, callback?: () => void) {
    api.sendNotification({
        type: 'info',
        title: 'Updating Categories',
        message: 'Loading current mod categories from BeatMods',
        displayMS: 8000
    });
}

export async function showPreYeetDialog(api: IExtensionApi, callback?: () => void): Promise<boolean> {
    var diag: IDialogResult = await api.showDialog(
        'question',
        "Possible Game Update",
        {
            text: "It appears that your copy of Beat Saber has been recently updated or reinstalled, but BSIPA hasn't been run for the current version yet.\n\nWhen BSIPA runs after a patch, it will move all your plugins to prevent any issues when loading the new version. We can instead disable all your currently enabled mods except for BSIPA so that it can update successfully and you can then re-enable your mods after you're sure they're compatible with the new update.\n\nIf you don't want to do this, click Ignore below, but be aware that BSIPA will move all your mods and Vortex might complain about external changes to your mods."
        },
        [
            { label: 'Ignore' },
            {
                label: 'Disable All',
            },
        ]);
    var toRun = diag.action === 'Disable All'
    // if (toRun) {
    //     patchFn(api, callback)
    // }
    return toRun;
}

export async function showPlaylistCreationDialog(api: IExtensionApi): Promise<{continue: boolean, title: string, image: string}> {
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
    var toRun = result.action === 'Create'
    // if (toRun) {
    //     patchFn(api, callback)
    // }
    return {continue: toRun, title: result.input?.title, image: result.input?.image};
}

export function showRestartRequiredNotification(api: IExtensionApi, message: string) {
    api.sendNotification({
        id: `bs-preview-restart`,
        type: 'warning',
        title: 'Vortex Restart Required',
        message: message
    });
}


const fullTerms: string = 
    "Modding Beat Saber means you are likely to experience problems that would not occur in an unmodded game. The vast majority of crashes and bugs that modded setups may experience are a result of the modding process and/or the mods that you use. \n" + 
    "Game updates will break mods, and likely frequently. There is no guarantee that mods will be updated in line with game versions, nor any guarantee on how quickly mods will be updated, if they are at all. \n" + 
    "The developers (including Beat Games) are *not* responsible for mods, nor do they provide any guarantee of stability or functionality for mods. Do not hold the developers responsible for any issues with modded games, including when updates break the game. \n" + 
    "Additionally, the functionality provided by BeatVortex is not part of regular Vortex, nor is it in any way affiliated with Beat Saber Modding Group (BSMG). Issues with the extension should not be taken up with BSMG nor with Nexus Mods as this is an unaffiliated community project.";