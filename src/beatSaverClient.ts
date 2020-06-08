import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';

/**
 * A simple client class to encapsulate the majority of beatsaver.com-specific logic, including metadata retrieval.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class BeatSaverClient {

    static isArchiveName(str: string, requireExtension?: boolean): boolean {
        let re = /[0-9a-fA-F]{40}|[0-9a-fA-F]{4}\s\(/;
        return re.test(str) && requireExtension ? str.endsWith('.zip') : true;
    }

    /**
     * Retrieves the friendly name of a map, given its ID
     * @remarks
     * This method actually performs a full API call, but only returns the name. Use wisely.
     *
     * @param modName: The BeatSaver key or hash of the mod to retrieve.
     */
    async getMapName(modName: any) : Promise<string> {
        var details = await this.getMapDetails(modName);
        return details?.name 
            ? `${details.name} [${details.key}]`
            : modName;
    }

    /**
     * Retrieves the given map's metadata from the BeatSaver API
     *
     * @remarks
     *
     * @param modId - The BeatSaver key or hash for the map.
     * @returns A subset of the available metadata from BeatSaver. Returns null on error/not found
     */
    async getMapDetails(mapKey: string): Promise<IMapDetails> | null {
        var url = mapKey.length === 4 ? `https://beatsaver.com/api/maps/detail/${mapKey}` : `https://beatsaver.com/api/maps/by-hash/${mapKey}`;
        var resp = await axios.request<IMapDetails>({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse<IMapDetails>) => {
            const { data } = resp;
            // traceLog(JSON.stringify(data));
            return data;
        }).catch(err => {
            log('error', err);
            return null;
        });
        return resp;
    }

    /**
     * Returns a downloadable link for the given map, optionally using direct download links.
     *
     * @param details - The map to build a download link for.
     * @param useDirect - Optionally skip the API, and get a direct download link from the CDN.
     * @returns An absolute URL to download the given map.
     */
    buildDownloadLink(details: IMapDetails, useDirect?: boolean): string {
        if (useDirect) {
            return `https://beatsaver.com${details.directDownload}`;
        }
        return `https://beatsaver.com${details.downloadURL}`;
    }

    /**
     * Returns a direct link to the cover image for a given map.
     *
     * @param details - The map to build a cover link for.
     * @returns An absolute URL to the cover art.
     */
    buildCoverLink(details: IMapDetails) {
        return `https://beatsaver.com${details.coverURL}`;
    }
}

/**
 * A subset of the available mod metadata from beatsaver.com's API.
 *
 * @remarks
 * - These keys are left as-is to match the API response and save needing manual property mapping.
 */
export interface IMapDetails {
    metadata : {
        difficulties: {
            easy: boolean;
            normal: boolean;
            hard: boolean;
            expert: boolean;
            expertPlus: boolean;
        }
        levelAuthorName: string,
        bpm: string;
    },
    hash: string;
    downloadURL: string;
    name: string;
    key: string;
    description: string;
    directDownload: string;
    coverURL: string;
    uploaded: string;
}