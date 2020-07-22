import { IExtensionApi, IState, IToolStored, IDeployedFile, IProfile } from "vortex-api/lib/types/api";
import path = require("path");
import nfs = require('fs');

import { getGamePath } from "../util";
import { util, selectors, log, actions } from "vortex-api";
import { GAME_ID } from "..";
import { IBSIPASettings } from "../settings";

export interface PatchFunction {
    (api: IExtensionApi, callback: () => void) : void;
}

/**
 * Gets the path to IPA.exe
 * 
 * @param api The extension API.
 */
function getIPAPath(api: IExtensionApi) {
    var gamePath = getGamePath(api, false);
    return path.join(gamePath, "IPA.exe");
}

/**
 * Returns whether or not IPA.exe exists
 * 
 * @param api - The extension API.
 */
export function isIPAInstalled(api: IExtensionApi): boolean {
    var exePath = getIPAPath(api);
    return nfs.existsSync(exePath);
}

/**
 * Determines whether BSIPA has been "installed"/patched.
 * 
 * @remarks
 * - This method just checks for the existence of the `winhttp.dll` file that BSIPA drops in the game directory.
 * 
 * @param api The extension API.
 */
export function isIPAReady(api: IExtensionApi) {
    var gamePath = getGamePath(api, false);
    var httpPath = path.join(gamePath, "winhttp.dll");
    var isReady = isIPAInstalled(api) && nfs.existsSync(httpPath);
    return isReady;
}

/**
 * Attempts to run the BSIPA initial patching (i.e. running `IPA.exe -n`)
 * 
 * @param api - The extension API.
 * @param callback - An optional callback to execute after IPA has been run.
 */
export async function tryRunPatch(api: IExtensionApi, callback?: () => void) {
    var gamePath = getGamePath(api, false);
    if (isIPAInstalled(api) && !isIPAReady(api)) {
        var ipaPath = getIPAPath(api);
        await api.runExecutable(ipaPath, ['-n'], {cwd: gamePath, shell: true, suggestDeploy: false});
        if (callback) {
            callback();
        }
    }
}

/**
 * Attempts to run the BSIPA revert operation (i.e. running `IPA.exe -n -r`)
 * 
 * @param api - The extension API.
 * @param callback - An optional callback to execute after IPA has been run.
 */
export async function tryUndoPatch(api: IExtensionApi, callback?: () => void) {
    var gamePath = getGamePath(api, false);
    var state: IState = api.store.getState();
    if (isIPAInstalled(api)) {
        var ipaPath = getIPAPath(api);
        await api.runExecutable(ipaPath, ['-n', '-r'], {cwd: gamePath, shell: true, suggestDeploy: false});
        if (callback) {
            callback();
        }
    }
}

export function getBSIPALaunchArgs(state: IState): string {
    var bsipaSettings = util.getSafe<IBSIPASettings>(state.settings, ['beatvortex', 'bsipa'], undefined);
    var bsipaOpts = '';
    if (bsipaSettings != undefined) {
        if (bsipaSettings.disableUpdates) {
            bsipaOpts += '--no-updates';
        }
        if (bsipaSettings.disableYeeting) {
            bsipaOpts += '--no-yeet';
        }
    }
    return bsipaOpts;
}