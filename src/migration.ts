import { IExtensionApi, IDialogResult, IProfile } from "vortex-api/lib/types/api";
import { util, log, selectors } from "vortex-api";
import * as semver from "semver";
import { GAME_ID, I18N_NAMESPACE } from ".";
import { app, remote } from 'electron';
import { enableBSIPATweaks, IBSIPASettings, acceptTerms } from "./settings";
import { renderMarkdown } from "./util";
import { ProfileClient } from "vortex-ext-common";
import { PROFILE_SETTINGS } from "./meta";



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
            () => resolve(null)
        );
    });
}

export function migrate041(api: IExtensionApi, oldVersion: string) {
    const extVersion = '0.4.1';
    if (semver.neq(oldVersion, '0.0.0') && (semver.gte(oldVersion, extVersion))) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        return api.sendNotification({
            id: 'beatvortex-migration',
            type: 'success',
            message: api.translate(`BeatVortex successfully updated to ${extVersion}`),
            noDismiss: true,
            actions: [
                {
                    title: 'More...',
                    action: (dismiss) => {
                        showUpgradeDialog(api, extVersion, getReleaseText(), () => {
                            dismiss();
                            resolve(null);
                        });
                    }
                },
                {
                    title: 'Dismiss',
                    action: dismiss => {
                      dismiss();
                      resolve(null);
                    }
                }
            ]
        });
    })
}

export function migrate050(api: IExtensionApi, oldVersion: string) {
    const updateMessage = "BeatVortex 0.5.x includes a few new features you might want to know about:\n\n" +
        "- Updated to the latest BeatSaver API so map details should work again\n" +
        "- Improvements to BeatMods updates and metadata\n" +
        "- A ton of behind-the-scenes code changes to improve reliability and consistency\n\n" +
        "Given the unannounced BeatSaver changes and the rushed fixes that called for, please make sure to report any issues you run into."
    const extVersion = '0.5.0';
    if (semver.neq(oldVersion, '0.0.0') && (semver.gte(oldVersion, extVersion))) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        return api.sendNotification({
            id: 'beatvortex-migration-050',
            type: 'success',
            message: api.translate(`BeatVortex successfully updated to ${extVersion}`),
            noDismiss: true,
            actions: [
                {
                    title: 'More...',
                    action: (dismiss) => {
                        showUpgradeDialog(api, extVersion, updateMessage, () => {
                            dismiss();
                            resolve(null);
                        });
                    }
                },
                {
                    title: 'Dismiss',
                    action: dismiss => {
                        dismiss();
                        resolve(null);
                    }
                }
            ]
        });
    })
}

export function migrate040(api: IExtensionApi, oldVersion: string) {
    const extVersion = '0.4.0';
    var minVortexVersion = minimumVersions[extVersion];

    if (semver.neq(oldVersion, '0.0.0') && (semver.gte(oldVersion, extVersion))) {
        return Promise.resolve();
    }

    // var existingSettings = util.getSafe<IBSIPASettings>(api.getState().settings, ['beatvortex', 'bsipa'], {});
    // var tweaksAlreadyEnabled = existingSettings?.disableUpdates || existingSettings?.disableYeeting;
    api.store.dispatch(enableBSIPATweaks({enableYeetDetection: true, disableUpdates: true, disableYeeting: false, applyToConfig: false}));
    updateTermsAcceptance(api);
    // var migrations = [];
    // log('debug', 'sending migration notification');
    return Promise.resolve();
}

function requireVortexVersionNotification(api: IExtensionApi, minVortexVersion: string, message: string, callback?: () => void) {
    return api.sendNotification({
        id: 'beatvortex-requires-upgrade',
        type: 'warning',
        message: api.translate('bs:VortexVersionWarning',
            { ns: I18N_NAMESPACE, vortexVersion: minVortexVersion }),
        noDismiss: true,
        actions: [
            {
                title: 'Explain',
                action: (dismiss) => {
                    api.showDialog('info', 'Beat Saber Support for Vortex', {
                        text: api.translate(message, { ns: I18N_NAMESPACE }),
                    }, [
                        { label: 'Close', action: label => {
                            dismiss();
                            callback?.();
                        } 
                    },
                    ]);
                },
            },
            {
                title: 'Dismiss',
                action: dismiss => {
                    dismiss();
                    callback?.();
                }
            }
        ],
    });
}

function showUpgradeDialog(api: IExtensionApi, newVersion: string, message: string, callback?: () => void): Promise<IDialogResult> {
    return api.showDialog('info', `BeatVortex updated to v${newVersion}`, {
        htmlText: renderMarkdown(message),
    }, [
        {label: 'Release Notes', action: () => util.opn(`https://beatvortex.dev/updates/v${newVersion}`)},
        {label: 'Close', action: () => callback?.()}
    ]);
}

const getReleaseText = () => {
    return "BeatVortex 0.4.x includes a few new features you might want to know about:\n\n" +
        "- BeatMods updates and category support are now enabled by default\n" + 
        "- Improved updates experience to work like other Vortex games\n" +
        "- Automatic game upgrade detection has been re-enabled and improved\n" + 
        "- Some new preview features have been added (enable them in Settings)\n\n" +
        "Due to some enhancements in Vortex, we also now recommend launching Beat Saber from Vortex, rather than directly. While launching directly will still work, BSIPA features might conflict with Vortex and lead to some unexpected behaviour."
}

function updateTermsAcceptance(api: IExtensionApi) {
    try {
    var client = new ProfileClient(api);
    const profiles = util.getSafe(api.getState(), ['persistent', 'profiles'], [])
    const gameProfiles: IProfile[] = Object.keys(profiles)
      .filter((id: string) => profiles[id].gameId === GAME_ID)
      .map((id: string) => profiles[id]);
      if (gameProfiles.length > 0) {
          var anyAccepted = gameProfiles.some((p) => {
              return client.getProfileSetting(p, PROFILE_SETTINGS.SkipTerms, false);
          });
          if (anyAccepted) {
              api.store.dispatch(acceptTerms(true));
          }
      }
    } catch (err) {
        log('error', 'error during terms migration', {err});
    }
}