import { IExtensionApi, IProfile, IDeployedFile } from "vortex-api/lib/types/api";
import { IBSIPASettings } from "../settings";
import { BSIPAConfigManager } from "./configManager";
import { util, log } from "vortex-api";

export async function applyConfig(api: IExtensionApi) {
    var storeSettings = util.getSafe(api.getState().settings, ['beatvortex', 'bsipa'], undefined) as IBSIPASettings;
    if (storeSettings == undefined) {
        log('info', 'no BSIPA config tweaks configured, skipping!');
        return;
    }
    var mgr = new BSIPAConfigManager(api);
    if (storeSettings.disableUpdates && mgr.configExists()) {
        await mgr.disableUpdates();
    }
    if (mgr.configExists() && storeSettings.disableYeeting) {
        await mgr.disableYeeting();
    }
}

/**
 * A simple event handler to apply configuration configuration tweaks after deployments that include BSIPA.
 * 
 * @remarks
 * - This method will run on every deployment, but only take action if a deployment contains BSIPA.
 * - Tweaks will only be applied if BSIPA's configuration has already been created.
 * 
 * @param api - The extension API.
 * @param profile - The current profile.
 * @param deployment - The current deployment object.
 */
export async function handleBSIPAConfigTweak(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> {
    var didIncludeBSIPA = deployment['bs-mod'].some(f => f.source.toLowerCase().indexOf("bsipa") !== -1);
    if (didIncludeBSIPA) {
        await applyConfig(api);
    }
}