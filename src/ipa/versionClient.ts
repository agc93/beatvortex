import { IExtensionApi } from "vortex-api/lib/types/api";
import { GAME_ID } from "..";
import path = require('path');
import { fs, log } from "vortex-api";
import nfs = require('fs');
import util = require('util');
import stream = require('stream');
import { traceLog } from "../util";
import { BSIPAConfigManager } from "./configManager";

export class IPAVersionClient {
    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api: IExtensionApi) {
        this._api = api;
    }
    // getUnityGameVersion = async (): Promise<string | undefined> => {
    getUnityGameVersion = (): string | undefined => {
        var gamePath = this._api.getState().settings.gameMode.discovered[GAME_ID].path;
        var unityFile = path.join(gamePath, 'Beat Saber_Data', 'globalgamemanagers')
        if (nfs.existsSync(unityFile)) {
            const fileBuffer = fs.readFileSync(unityFile);
            var searchKey = 'public.app-category.games'
            traceLog('read unity file into buffer', {length: fileBuffer.length, path: unityFile});
            var key = fileBuffer.indexOf(Buffer.from(searchKey));
            if (key) {
                var padding = 111 + searchKey.length;
                var versionString = fileBuffer.toString('utf8', key + padding, key + padding + 6);
                traceLog('found key in Unity file', {key, versionString});
                return versionString;
            } else {
                traceLog('failed to find key in unity file', {unityFile});
            }
            // readStream.destroy();
        } else {
            log('warn', "couldn't locate unity game file", {path: unityFile});
            return;
        }
    }

    getBSIPAGameVersion = async (): Promise<string | undefined> => {
        var gamePath = this._api.getState().settings.gameMode.discovered[GAME_ID].path;
        var mgr = new BSIPAConfigManager(this._api);
        var config = await mgr.readConfig();
        return config?.LastGameVersion;
    }
}