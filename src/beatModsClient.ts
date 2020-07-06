import axios, { AxiosResponse } from 'axios';
import { log, actions, util } from 'vortex-api';
import path = require('path');
import { getGameVersion, traceLog } from './util';
import { IExtensionApi } from 'vortex-api/lib/types/api';
import { updateBeatModsCache, updateBeatModsVersions } from "./session";

export interface ModList { [modName: string]: IModDetails; };
export interface IVersionList { [modVersion: string]: string[] };

/**
 * A simple client class to encapsulate the majority of beatmods.com-specific logic, including metadata retrieval.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class BeatModsClient {

    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api?: IExtensionApi) {
        this._api = api;
    }

    /**
     * Retrieves the friendly name of a mod, given its ID
     * @remarks
     * This method actually performs a full API call, but only returns the name. Use wisely.
     *
     * @param modId: The BeatMods ID of the mod to retrieve.
     */
    async getModName(modId: string) : Promise<string> {
        var details = await this.getModDetails(modId);
        return details?.name 
            ? `${details.name} [${details.version}]`
            : modId;
    }

    /**
     * Extracts the mod name and version from a given file name.
     *
     * @remarks
     * This method is pure string manipulation: no API calls are invoked.
     *
     * @param fileName - The file name of the BeatMods mod download.
     * @returns The guessed mod name and version.
     */
    static getModName(fileName: string): {mod: string, version: string} {
        var name = path.basename(fileName, path.extname(fileName));
        var splitCount = (name.match(/-/g) || []).length;
        if (splitCount == 1) {
            var [mod, version] = name.split('-');
            return {mod, version};
        }
        return undefined;
    }

    /**
     * Determines if the given file is a BeatMods/beatmods.com download archive.
     *
     * @remarks
     * - This guess is based solely on the file name format!
     * - BeatMods names its download files as `name-version.zip`
     *
     * @param fileName - The file name to test against.
     * @returns Whether the given file is likely a download from BeatMods
     */
    static isBeatModsArchive(fileName: string) : boolean {
        var name = path.basename(fileName, path.extname(fileName));
        var splitCount = (name.match(/-/g) || []).length;
        if (splitCount == 1) {
            var [mod, version] = name.split('-');
            return mod && version && version.split('.').length > 1;
        }
        return false;
    }

    /**
     * Determines if the given file is a BeatMods/beatmods.com download archive.
     *
     * @remarks
     * - This guess is based solely on the file name format!
     * - BeatMods names its download files as `name-version.zip`
     *
     * @param fileName - The file name to test against.
     * @returns Whether the given file is likely a download from BeatMods
     */
    isBeatModsArchive(modName: string) {
        return BeatModsClient.isBeatModsArchive(modName);
    }

    /**
     * Retrieves the given mod's metadata from the BeatMods API
     *
     * @remarks
     * - This method uses only the BeatMods ID, not the hash!
     *
     * @param modId - The BeatMods ID of the mod to retrieve.
     * @returns A subset of the available metadata from BeatMods. Returns null on error/not found
     */
    getModDetails = async (modId: string): Promise<IModDetails> | null => {
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
        if (this._api && resp != null) {
            this._api.store.dispatch(updateBeatModsCache([resp]));
        }
        return resp;
    }

    getCategories = async (): Promise<string[]> | null => {
        var allMods: IModDetails[] = [];
        if (this._api) {
            var mods = util.getSafeCI<ModList>(this._api.getState().session, ['beatvortex', 'mods'], undefined);
            if (mods != undefined) {
                traceLog('pulling categories from cached mods!', {mods: Object.keys(mods).length});
                allMods = Object.values(mods);
            }
        }
        if (!this._api || allMods.length == 0) {
            allMods = await this.getAllMods(undefined);
        }
        return [...new Set(allMods.map(m => m.category))];
    }

    /**
     * Retrieves the given mod's metadata from the BeatMods API, guessing the mod based on file name.
     *
     * @remarks
     * - This method is actually just *searching* the API based on the file name
     *
     * @param fileName - The file name to attempt to find metadata for.
     * @returns A subset of the available metadata from BeatMods. Returns null on error/not found
     */
    async getModByFileName(fileName: string, gameVersion?: string) : Promise<IModDetails> | null {
        var [modName, version] = path.basename(fileName, fileName.endsWith('zip') ? path.extname(fileName) : '').split('-', 2);
        modName = modName.replace(/_$/, '');
        log('debug', 'beatvortex: retrieving details from beatmods', {modName, version});
        // &gameVersion=${gameVersion ?? '1.8.0'}
        var url = `https://beatmods.com/api/v1/mod?search=${modName}&version=${version}&status=approved&sort=updatedDate&sortDirection=1`;
        var mod = await this.getApiResponse<IModDetails>(url, (data) => data[0])
        return mod;
    }

    async getModVersionsByName(modName: string) : Promise<IModDetails[]> | null {
        log('debug', 'beatvortex: retrieving all versions from beatmods', {modName});
        var url = `https://beatmods.com/api/v1/mod?search=${modName}&status=approved&sort=updatedDate&sortDirection=1`;
        var allMods = await this.getApiResponse<IModDetails[]>(url, (data) => {
            var matches = data.filter(m => m.name == modName);
            return (matches && matches.length) ? matches : null;
        });
        return allMods;
    }

    /**
     * Retrieves all available mods from the BeatMods API.
     *
     * @remarks
     * - This can be a slow request to return!
     *
     * @param gameVersion - Strongly recommended! Without this filter, the response will be *megabytes* of data!
     * @returns A subset of the available metadata from BeatMods. Returns null on error/not found.
     */
    getAllMods = async (gameVersion: string) : Promise<IModDetails[]> => {
        log('debug', 'beatvortex: retrieving all available mods from BeatMods');
        var url = gameVersion
            ? `https://beatmods.com/api/v1/mod?status=approved&gameVersion=${gameVersion}`
            : `https://beatmods.com/api/v1/mod?status=approved`;
        var allMods = await this.getApiResponse<IModDetails[]>(url, (data) => data)
        log('debug', `retrieved ${allMods?.length} mods from BeatMods`);
        if (this._api && allMods != null) {
            log('debug', 'populating session cache with mods', {count: allMods.length, withVersion: gameVersion ?? 'none'});
            if (gameVersion) {
                this._api.store.dispatch(updateBeatModsCache(allMods));
            }
            // this._api.store.dispatch(gameVersion ? updateBeatModsCache(allMods) : updateBeatModsVersions(allMods));
        }
        return allMods;
    }

    getAllGameVersions = async (): Promise<IVersionList> => {
        log('debug', 'beatvortex: retrieving versions from alias file');
        var url = 'https://alias.beatmods.com/aliases.json';
        var versionResponse = await this.getApiResponse<IVersionList>(url, (data) => data);
        if (this._api && versionResponse != null) {
            log('debug', 'populating session cache with game versions', {count: Object.keys(versionResponse).length});
            this._api.store.dispatch(updateBeatModsVersions(versionResponse));
        }
        return versionResponse;
    }

    /**
     * Helper method for retrieving data from the ModelSaber API.
     *
     * @remarks
     * - This method is just the common logic and needs a callback to declare what to return from the output.
     *
     * @param url - The endpoint URL for the request.
     * @param returnHandler - A callback to take the API response and return specific data.
     * @returns A subset of the available metadata from ModelSaber. Returns null on error/not found
     */
    private async getApiResponse<T>(url: string, returnHandler: (data: any) => T) : Promise<T> | null {
        var resp = await axios.request({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse) => {
            const { data } = resp;
            return returnHandler(data);
            // return data[0] as IModelDetails; //we just have to assume first here since we don't know what the ID is anymore.
        }).catch(err => {
            log('error', err);
            return null;
        });
        return resp;
    }

    static getDownloads(mod: IModDetails) : string[] {
        return mod.downloads.map(m => `https://beatmods.com${m.url}`);
    }
}

/**
 * A subset of the available mod metadata from beatmods.
 *
 * @remarks
 * - These keys are left as-is to match the API response and save needing manual property mapping.
 */
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
    uploadDate: string;
    downloads: IModDownload[],
    _id: string,
    dependencies: {_id: string, name: string, version: string, dependencies: string[]}[]
}

/**
 * Download metadata from BeatMods API
 *
 * @remarks
 * - BeatMods API specifically calls out extra download info, including hash!
 * - File hash may be needed for meta server querying.
 */
interface IModDownload {
    type: ModPlatform;
    url: string;
    hashMd5: {hash: string, file: string}[]
}

declare type ModPlatform = 'universal' | 'steam' | 'oculus';