import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';
import path = require('path');
import { getGameVersion } from './util';

/**
 * A simple client class to encapsulate the majority of beatmods.com-specific logic, including metadata retrieval.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class BeatModsClient {

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

    /**
     * Retrieves all available mods from the BeatMods API.
     *
     * @remarks
     * - This can be a slow request to return!
     *
     * @param gameVersion - Strongly recommended! Without this filter, the response will be *megabytes* of data!
     * @returns A subset of the available metadata from BeatMods. Returns null on error/not found.
     */
    async getAllMods(gameVersion?: string) : Promise<IModDetails[]> {
        log('debug', 'beatvortex: retrieving all available mods from BeatMods');
        var url = gameVersion
            ? `https://beatmods.com/api/v1/mod?status=approved&gameVersion=${gameVersion}`
            : `https://beatmods.com/api/v1/mod?status=approved`;
        var allMods = await this.getApiResponse<IModDetails[]>(url, (data) => data)
        log('debug', `retrieved ${allMods?.length} mods from BeatMods`);
        return allMods;
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

    static getDependencies(mods: IModDetails[], mod: IModDetails): {_id: string, name: string}[][] {
        // var mod = mods.find(m => m._id == modId);
        function flatDeep(arr, d = 1): any[] {
            return d > 0 ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatDeep(val, d - 1) : val), [])
                         : arr.slice();
         };
        const resolveDeps = (modId: string): string[] => {
            var mod = mods.find(m => m._id == modId);
            if (!mod) {
                // mod = mod.dependencies.find()
            }
            if (mod) {
                if (mod.dependencies && mod.dependencies.length > 0) {
                    return flatDeep(mod.dependencies.map(md => md.dependencies.map(md => resolveDeps(md))), 1);
                } else {
                    return []
                }
            } else {
                log('debug', "couldn't match mod", {mod: modId});
            }
        }
        /* var depMods = mods.filter(m => {
            return mod.dependencies.some(d => d._id == m._id) */
        /* var depMods = mod.dependencies.map(d => {
            var match = mods.find(fd => d._id == fd._id);
            log ('debug', 'found dep in mod list', { dep: match?.name, target: d?.name});
            return match; */
        var depModIds = flatDeep(mod.dependencies.map(dm => {
            log('debug', 'walking dependency tree', { mod: dm.name, count: dm.dependencies.length});
            // var ddm = flatDeep(dm.dependencies.map(dmi => dmi.dependencies), Infinity)
            return [dm._id, ...dm.dependencies]
        }), Infinity);
        log('debug', 'flattened dep tree', {ids: depModIds});
        var recursed = flatDeep(depModIds.map(di => resolveDeps(di)), Infinity);
        log('debug', 'walked dep tree', {depth: recursed.length, keys: recursed});
        var uniques = [...new Set<string>(depModIds)];
        var mods = uniques.map(u => mods.find(m => m._id == u));
        log('debug', 'matched dependency list', {count: uniques?.length, matched: mods?.length});
        return []
        /* return mod.dependencies.map(td => {
            // var currentDeps = [];
            var currentDepsTree = [...td.dependencies];
            log('debug', 'compiled top tree deps', {deps: currentDepsTree, mods: mods.length});
            var dependents = td.dependencies.map(cdt => {
                var cdtMod = mods.find(cd => cd._id == cdt);
                log('debug', 'found mod dependency', {id: cdtMod._id});
                return cdtMod;
            });
            return [...dependents, td];
        }) */
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