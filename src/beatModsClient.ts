import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';
import path = require('path');

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
    _id: string
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