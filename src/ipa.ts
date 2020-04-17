import { IExtensionApi, IState, IToolStored } from "vortex-api/lib/types/api";
import path = require("path");
import nfs = require('fs');

import { getGamePath } from "./util";
import { util, selectors, log, actions } from "vortex-api";
import { GAME_ID } from ".";

const ipaTool : IToolStored = {
    id: 'ipa-install',
    name: 'Run IPA Installer',
    shortName: 'IPA Install',
    executable: 'IPA.exe',
    shell: true,
    exclusive: true,
    parameters: ['-n'],
    logo: '',
    environment: {}
}

function getIPAPath(api: IExtensionApi) {
    var gamePath = getGamePath(api, false);
    return path.join(gamePath, "IPA.exe");
}

export function isIPAInstalled(api: IExtensionApi): boolean {
    var exePath = getIPAPath(api);
    return nfs.existsSync(exePath);
}

export function isIPAReady(api: IExtensionApi) {
    var gamePath = getGamePath(api, false);
    var httpPath = path.join(gamePath, "winhttp.dll");
    var isReady = isIPAInstalled(api) && nfs.existsSync(httpPath);
    return isReady;
}

export async function tryRunPatch(api: IExtensionApi, callback?: () => void) {
    var gamePath = getGamePath(api, false);
    var state : IState = api.store.getState();
    const discovery = state.settings.gameMode.discovered[GAME_ID];
    if (isIPAInstalled(api) && !isIPAReady(api)) {
        var ipaPath = getIPAPath(api);
        selectors.knownGames
        await api.runExecutable(ipaPath, ['-n'], {cwd: gamePath, shell: true, suggestDeploy: false});
        if (callback) {
            callback();
        }
    }
}