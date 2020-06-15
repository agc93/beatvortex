import { IExtensionApi } from "vortex-api/lib/types/api";
import { util, log } from "vortex-api";
import * as semver from "semver";
import { GAME_ID } from ".";
import { app, remote } from 'electron';

const I18N_NAMESPACE = 'beatvortex';

type VersionMatrix = {[extensionVersion: string]: string};

// matrix of extension versions and what Vortex version they require.
var minimumVersions: VersionMatrix = {
    '0.3.1': '1.2.13'
};

/**
 * Gets the currently running Vortex version.
 * 
 * @param defaultValue The default Vortex version to use if detection fails.
 */
export function getVortexVersion(defaultValue?: string): string {
    var vortexVersion = app?.getVersion() ?? remote?.app?.getVersion() ?? defaultValue;
    return vortexVersion;
}

/**
 * Determines whether the current Vortex version meets the specified minimum version.
 * 
 * @param version The minimum version required.
 */
export function meetsMinimum(version: string): boolean {
    return semver.gte(getVortexVersion(), version);
}

// Migration for 0.3.1.
export function migrate031(api: IExtensionApi, oldVersion: string) {
    const extVersion = '0.3.1'
    var minVortexVersion = minimumVersions[extVersion];
    if (semver.gte(oldVersion, extVersion)) {
        return Promise.resolve();
    }

    const state = api.store.getState();
    const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
    const hasMods = Object.keys(mods).length > 0;

    if (!hasMods) {
        return Promise.resolve();
    }
    var vortexVersion = app.getVersion();
    if (semver.gte(vortexVersion, minVortexVersion)) {
        return Promise.resolve();
    }
    log('warn', 'detected beatvortex<->vortex version mismatch', {vortex: vortexVersion, extension: oldVersion});
    return new Promise((resolve) => {
        return api.sendNotification({
            id: 'beatvortex-requires-upgrade',
            type: 'warning',
            message: api.translate(`BeatVortex requires Vortex v${minVortexVersion} or higher!`,
                { ns: I18N_NAMESPACE }),
            noDismiss: true,
            actions: [
                {
                    title: 'Explain',
                    action: () => {
                        api.showDialog('info', 'Beat Saber Support for Vortex', {
                            text: api.translate("A number of the extra features added in v{{extensionVersion}} of the BeatVortex extension require a newer Vortex version!\n\nWe *strongly* recommend either upgrading Vortex to the latest version, or disabling BeatVortex until you upgrade. If you continue, we won't be able to help you, and can't guarantee that things won't break.\nWe're sorry for the inconvenience!", { ns: I18N_NAMESPACE, extensionVersion: extVersion }),
                        }, [
                            { label: 'Close' },
                        ]);
                    },
                },
                {
                    title: 'Understood',
                    action: dismiss => {
                        dismiss();
                        resolve();
                    }
                }
            ],
        });
    });
}