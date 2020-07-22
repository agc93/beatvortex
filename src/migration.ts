import { IExtensionApi } from "vortex-api/lib/types/api";
import { util, log } from "vortex-api";
import * as semver from "semver";
import { GAME_ID, I18N_NAMESPACE } from ".";
import { app, remote } from 'electron';
import { enableBSIPATweaks } from "./settings";



type VersionMatrix = {[extensionVersion: string]: string};

// matrix of extension versions and what Vortex version they require.
var minimumVersions: VersionMatrix = {
    '0.3.1': '1.2.13',
    '0.4.0': '1.3.0'
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
    var vortexVersion = getVortexVersion();
    if (semver.gte(vortexVersion, minVortexVersion)) {
        return Promise.resolve();
    }
    log('warn', 'detected beatvortex<->vortex version mismatch', {vortex: vortexVersion, extension: oldVersion});
    return new Promise((resolve) => {
        return requireVortexVersionNotification(
            api, 
            minVortexVersion, 
            api.translate("A number of the extra features added in v{{extensionVersion}} of the BeatVortex extension require a newer Vortex version!\n\nWe *strongly* recommend either upgrading Vortex to the latest version, or disabling BeatVortex until you upgrade. If you continue, we won't be able to help you, and can't guarantee that things won't break.\nWe're sorry for the inconvenience!", { ns: I18N_NAMESPACE, extensionVersion: extVersion }), 
            () => resolve()
        );
    });
}

export function migrate040(api: IExtensionApi, oldVersion: string) {
    const extVersion = '0.4.0';
    var minVortexVersion = minimumVersions[extVersion];

    if (semver.gte(oldVersion, extVersion)) {
        return Promise.resolve();
    }
    api.store.dispatch(enableBSIPATweaks({enableYeetDetection: true}));
    var migrations = [];

    migrations.push(new Promise((resolve) => {
        api.sendNotification({
            id: 'beatvortex-migration',
            type: 'success',
            message: api.translate(`BeatVortex successfully updated to ${extVersion}`),
            displayMS: 4000,
            actions: [
                {
                    title: 'More...',
                    action: (dismiss) => {
                        showUpgradeDialog(api, extVersion, "BeatVortex 0.4.x includes a few new features you might want to know about:\n\n- BeatMods updates are now enabled by default\n- Mod categories are now enabled by default\n- Automatic game upgrade detection has been re-enabled and improved dramatically\n\nDue to some enhancements in Vortex, we also now recommend launching Beat Saber from Vortex, rather than directly. While launching directly will still work, BSIPA features might conflict with Vortex and lead to some unexpected behaviour.", () => dismiss());
                    }
                }
            ]
        });
        resolve();
    }));

    var vortexVersion = getVortexVersion();
    if (semver.gte(vortexVersion, minVortexVersion)) {
        //ignored
    } else {
        migrations.push(new Promise((resolve) => {
            return requireVortexVersionNotification(
                api, 
                minVortexVersion, 
                api.translate("A number of the extra features added in v{{extensionVersion}} of the BeatVortex extension require a newer Vortex version!\n\nWe *strongly* recommend either upgrading Vortex to the latest version, or disabling BeatVortex until you upgrade. If you continue, we won't be able to help you, and can't guarantee that things won't break.\nWe're sorry for the inconvenience!", { ns: I18N_NAMESPACE, extensionVersion: extVersion }), 
                () => resolve()
            );
        }));
    }

    return Promise.all(migrations);
}

function requireVortexVersionNotification(api: IExtensionApi, minVortexVersion: string, message: string, callback?: () => void) {
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
                        text: api.translate(message, { ns: I18N_NAMESPACE }),
                    }, [
                        { label: 'Close' },
                    ]);
                },
            },
            {
                title: 'Understood',
                action: dismiss => {
                    dismiss();
                    callback?.();
                }
            }
        ],
    });
}

function showUpgradeDialog(api: IExtensionApi, newVersion: string, message: string, callback?: () => void) {
    return api.showDialog('info', `BeatVortex updated to v${newVersion}`, {
        text: message,
        links: [
            {label: 'Release Notes', action: () => util.opn(`https://beatvortex.dev/updates/v${newVersion}`)}
        ]
    }, [
        {label: 'Close', action: () => callback?.()}
    ]);
}