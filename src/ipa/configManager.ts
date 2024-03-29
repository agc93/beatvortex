import { IExtensionApi } from "vortex-api/lib/types/api";
import { GAME_ID } from "..";
import path = require("path");
import { fs, log } from "vortex-api";
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
            if (config != null && config?.Updates?.AutoUpdate) {
                config.Updates.AutoUpdate = targetState;
                config.Updates.AutoCheckUpdates = targetState;
                await fs.writeFileAsync(configPath, JSON.stringify(config, null, 2));
                return config;
            } else {
                log('warn', 'Update disable failed!');
            }
        }
        return null;
    }

    readConfig = async () : Promise<IBSIPAConfig | null> => {
        var configPath = this.getConfigPath();
        if (nfs.existsSync(configPath)) {
            try {
                var configContent = await fs.readFileAsync(configPath, { encoding: 'utf-8' });
                var config = JSON.parse(configContent);
                return config;
            } catch (err) {
                log('error', 'error encountered reading BSIPA configuration', {err});
                this._api.sendNotification({
                    type: 'warning',
                    message: 'Failed to read BSIPA configuration. Some features may not work correctly!',
                    displayMS: 5000,
                    title: 'Error reading BSIPA configuraion file',
                });
            }
            
        }
        return null;
    }

    private getConfigPath = (): string | null => {
        var installPath = this._api.getState().settings.gameMode.discovered[GAME_ID]?.path;
        return installPath == null ? null : path.join(installPath, 'UserData', 'Beat Saber IPA.json');
    }

    private backupIfNotExists = () => {
        var configPath = this.getConfigPath();
        if (configPath == null) {return;}
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

    static async deleteConfig(configPath: string, confirmCb?: () => boolean): Promise<boolean> {
        var cb = cb ?? (() => true);
        if (nfs.existsSync(configPath)) {
            try {
                var configContent = await fs.readFileAsync(configPath, { encoding: 'utf-8' });
                var config = JSON.parse(configContent);
                config.Regenerate = true;
                await fs.writeFileAsync(configPath, JSON.stringify(config, null, 2));
                return true;
            } catch (err) {
                log('error', 'error setting regenerate', {err});
                try {
                    await fs.unlinkAsync(configPath, {showDialogCallback: cb});
                    return true;
                } catch {
                    log('error', "well shit, this isn't looking too good")
                }
            }
            // return false;
        }
        return false;
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