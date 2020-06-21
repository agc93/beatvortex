import { IExtensionApi } from "vortex-api/lib/types/api";
import { GAME_ID } from "..";
import path = require("path");
import { fs } from "vortex-api";
import nfs = require('fs');

export class BSIPAConfigManager {
    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api: IExtensionApi) {
        this._api = api;
    }

    readConfig = async () : Promise<IBSIPAConfig | null> => {
        var configPath = this.getConfigPath();
        if (nfs.existsSync(configPath)) {
            var configContent = await fs.readFileAsync(configPath, { encoding: 'utf-8' });
            var config = JSON.parse(configContent);
            return config;
        }
        return null;
    }

    private getConfigPath = (): string => {
        var installPath = this._api.getState().settings.gameMode.discovered[GAME_ID].path;
        return path.join(installPath, 'UserData', 'Beat Saber IPA.json');
    }
}

//god that title casing
// fuck JSON sometimes
export interface IBSIPAConfig {
    Updates: {
        AutoUpdate: boolean,
        AutoCheckUpdates: boolean
    },
    YeetMods: boolean,
    LastGameVersion: string
};