import { IExtensionApi, IProfile, IDeployedFile } from "vortex-api/lib/types/api";
import { IBSIPASettings } from "../settings";
import { GAME_ID } from "..";
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

export async function handleBSIPAConfigTweak(api: IExtensionApi, profile: IProfile, deployment: { [typeId: string]: IDeployedFile[] }): Promise<void> {
    var didIncludeBSIPA = deployment['bs-mod'].some(f => f.source.toLowerCase().indexOf("bsipa") !== -1);
    if (didIncludeBSIPA) {
        await applyConfig(api);
    }
}