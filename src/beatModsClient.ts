import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';
import path = require('path');

export class BeatModsClient {
    async getModName(modId: string) : Promise<string> {
        var details = await this.getModDetails(modId);
        return details?.name 
            ? `${details.name} [${details.version}]`
            : modId;
    }

    static getModName(fileName: string): {mod: string, version: string} {
        var name = path.basename(fileName, path.extname(fileName));
        var splitCount = (name.match(/-/g) || []).length;
        if (splitCount == 1) {
            var [mod, version] = name.split('-');
            return {mod, version};
        }
        return undefined;
    }

    static isBeatModsArchive(modName: string) {
        var name = path.basename(modName, path.extname(modName));
        var splitCount = (name.match(/-/g) || []).length;
        if (splitCount == 1) {
            var [mod, version] = name.split('-');
            return mod && version && version.split('.').length > 1;
        }
        return false;
    }

    isBeatModsArchive(modName: string) {
        return BeatModsClient.isBeatModsArchive(modName);
    }

    async getModDetails(modId: string): Promise<IModDetails> | null {
        if (modId.length != 24) {
            return null;
        }
        var url =  `https://beatmods.com/api/mod/${modId}`;
        var resp = await axios.request<IModDetails>({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse<IModDetails>) => {
            const { data } = resp;
            return data;
        }).catch(err => {
            log('error', err);
            return null;
        });
        return resp;
    }

    async getModByFileName(fileName: string, gameVersion?: string) : Promise<IModDetails> {
        var [modName, version] = path.basename(fileName, path.extname(fileName)).split('-', 2);
        log('debug', 'beatvortex: retrieving details from beatmods', {modName, version});
        // &gameVersion=${gameVersion ?? '1.8.0'}
        var url = `https://beatmods.com/api/v1/mod?search=${modName}&version=${version}&status=approved&sort=updatedDate&sortDirection=1`;
        var resp = await axios.request<IModDetails[]>({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse<IModDetails[]>) => {
            const { data } = resp;
            return data[0];
        }).catch(err => {
            log('error', err);
            return null;
        });
        return resp;
    }
}

export interface IModDetails {
    name: string;
    version: string,
    gameVersion: string,
    author: {
        username: string,
        _id: string
    }
    status: string;
    description: string;
    link: string;
    category: string;
    required: boolean;
    downloads: IModDownload[],
    _id: string
}

interface IModDownload {
    type: ModPlatform;
    url: string;
    hashMd5: {hash: string, file: string}[]
}

enum ModPlatform {
    universal,
    steam,
    oculus
}