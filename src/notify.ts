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
        "You may experience problems that don't exist in the vanilla game. 99.9% of bugs, crashes, and lag are due to mods. \nMods are subject to being broken by updates and that's normal - be patient and respectful when this happens, as modders are volunteers with real lives. \nBeat Games aren't purposefully trying to break mods. They wish to work on the codebase and sometimes this breaks mods, but they are not out to kill mods. \nDo not attack the devs for issues related to mods, and vice versa - modders and devs are two separate groups.";
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

export function showLooseDllNotification(api: IExtensionApi, fileName: string) {
    return api.sendNotification({
        type: 'warning',
        message: "It looks like you might be trying to install a loose plugin. This probably won't work.",
        title: 'Loose Plugin Detected',
        noDismiss: true,
        actions: [
            {
                title: 'More info',
                action: dismiss => {
                    showLooseDllDialog(api, fileName, dismiss);
                }
            }
        ]
    });
}

export function showLooseDllDialog(api: IExtensionApi, fileName: string, callback?: () => void) {

    var msg = "It looks like the mod you're currently installing is a loose DLL file.\n\nIf you are trying to install a BSIPA plugin that you downloaded from GitHub or Discord, this will almost certainly not work how you think!\n" +
        "To install it properly, remove the 'mod' you just installed, add the DLL file to a ZIP file (or any other archive format) and install that with Vortex instead. The installer will then deploy your plugin to the right location.\nSee beatvortex.dev/docs/faq for more information.";
    api.showDialog(
        'info',
        'Installing Loose Plugins',
        {
            text: msg,
        }, 
        [ { label: 'Continue' } ]
    ).then((result: IDialogResult) => {
        callback?.();
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
    var updatesEnabled = ((api.getState().settings['beatvortex']['preview'] as IPreviewSettings).enableUpdates)
    // var msg = updatesEnabled ? "It looks like BSIPA's "
    if (updatesEnabled) {
        api.showDialog(
            'info',
            'BSIPA Plugin Updates enabled',
            {
                text: "BSIPA's automatic plugin updates seem to be enabled. While this won't break things, be aware that it may result in BSIPA using a different version of plugins than what Vortex has installed. We recommend disabling BSIPA's automatic updates while you're managing updates with Vortex.",
            }, 
            [ { label: 'Continue' } ]
        ).then((result: IDialogResult) => {
            callback?.();
        });
    } else {
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
    }
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

export async function showPlaylistCreationDialog(api: IExtensionApi, callback?: () => void): Promise<{continue: boolean, title: string, image: string}> {
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