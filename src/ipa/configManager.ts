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

    disableYeeting = async (targetState: boolean = false): Promise<IBSIPAConfig | null> => {
        var configPath = this.getConfigPath();
        this.backupIfNotExists();
        if (nfs.existsSync(configPath)) {
            var configContent = await fs.readFileAsync(configPath, { encoding: 'utf-8' });
            var config = JSON.parse(configContent);
            config.YeetMods = targetState;
            await fs.writeFileAsync(configPath, JSON.stringify(config, null, 2));
            return config;
        }
        return null;
    }

    disableUpdates = async (targetState: boolean = false): Promise<IBSIPAConfig | null> => {
        var configPath = this.getConfigPath();
        this.backupIfNotExists();
        if (nfs.existsSync(configPath)) {
            var configContent = await fs.readFileAsync(configPath, { encoding: 'utf-8' });
            var config = JSON.parse(configContent);
            config.Updates.AutoUpdate = targetState;
            config.Updates.AutoCheckUpdates = targetState;
            await fs.writeFileAsync(configPath, JSON.stringify(config, null, 2));
            return config;
        }
        return null;
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

    private getConfigPath = (): string | null => {
        var installPath = this._api.getState().settings.gameMode.discovered[GAME_ID]?.path;
        return installPath == null ? null : path.join(installPath, 'UserData', 'Beat Saber IPA.json');
    }

    private backupIfNotExists = () => {
        var configPath = this.getConfigPath();
        var backupPath = `${configPath}.backup`;
        if (nfs.existsSync(backupPath)) {
            return;
        } else {
            nfs.copyFileSync(configPath, backupPath);
        }
    }

    configExists = (): boolean => {
        var configPath = this.getConfigPath();
        return nfs.existsSync(configPath);
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