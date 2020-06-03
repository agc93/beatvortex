import { IExtensionApi } from "vortex-api/lib/types/api";
import { util, log } from "vortex-api";
import * as semver from "semver";
import { GAME_ID } from ".";
import { app } from 'electron';

const I18N_NAMESPACE = 'beatvortex';

export function migrate031(api: IExtensionApi, oldVersion: string) {
    if (semver.gte(oldVersion, '0.3.1')) {
        return Promise.resolve();
    }

    const state = api.store.getState();
    const mods = util.getSafe(state, ['persistent', 'mods', GAME_ID], {});
    const hasMods = Object.keys(mods).length > 0;

    if (!hasMods) {
        return Promise.resolve();
    }
    var vortexVersion = app.getVersion();
    if (semver.gte(vortexVersion, '1.2.13')) {
        return Promise.resolve();
    }
    log('warn', 'detected beatvortex<->vortex version mismatch', {vortex: vortexVersion, extension: oldVersion});
    return new Promise((resolve) => {
        return api.sendNotification({
            id: 'beatvortex-requires-upgrade',
            type: 'warning',
            message: api.translate('BeatVortex requires Vortex v1.12.3 or higher!',
                { ns: I18N_NAMESPACE }),
            noDismiss: true,
            actions: [
                {
                    title: 'Explain',
                    action: () => {
                        api.showDialog('info', 'Beat Saber Support for Vortex', {
                            text: api.translate("A number of the extra features added in v0.3.1 of the BeatVortex extension require a newer Vortex version!\n\nWe *strongly* recommend either upgrading Vortex to the latest version, or disabling BeatVortex until you upgrade. If you continue, we won't be able to help you, and can't guarantee that things won't break.\nWe're sorry for the inconvenience!", { ns: I18N_NAMESPACE }),
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