import { log, util } from 'vortex-api';
import { IExtensionApi } from 'vortex-api/lib/types/api';
import { traceLog } from './util';
import { cacheBeatSaverMap } from './session';
import { HttpClient, CachedHttpClient } from 'vortex-ext-http';

/**
 * A simple client class to encapsulate the majority of beatsaver.com-specific logic, including metadata retrieval.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class BeatSaverClient extends CachedHttpClient {

    // private _api: IExtensionApi;
    /**
     *
     */
    constructor(api?: IExtensionApi) {
        super(api, "BeatVortex/0.2.0");
        // this._api = api;
    }

    static isArchiveName(str: string, requireExtension?: boolean): boolean {
        let re = /[0-9a-fA-F]{40}|[0-9a-fA-F]{4,6}\s\(/;
        return re.test(str) && requireExtension ? str.endsWith('.zip') : true;
    }

    /**
     * Retrieves the given map's metadata from the BeatSaver API
     *
     * @remarks
     *
     * @param mapKey - The BeatSaver key or hash for the map.
     * @returns A subset of the available metadata from BeatSaver. Returns null on error/not found
     */
    getMapDetails = async (mapKey: string): Promise<IMapDetails> | null => {
        var url = mapKey.length < 6 ? `https://api.beatsaver.com/maps/id/${mapKey}` : `https://api.beatsaver.com/maps/hash/${mapKey}`;
        var cachedMap = this.checkCache<IMapDetails, IMapDetails>(['session', 'beatvortex', 'maps', mapKey]);
        if (cachedMap) {
            traceLog('pulled map from cache!', {map: mapKey});
            return cachedMap;
        }
        /* if (this._api) {
            var map = util.getSafeCI<IMapDetails>(this._api.getState().session, ['beatvortex', 'maps', mapKey], undefined);
            if (map != undefined) {
                
            }
        } */
        try {
            var resp = await this.getApiResponse<IMapDetails>(url, null, (err) => null);
            this.updateCache(cacheBeatSaverMap(resp.id, resp), () => resp != null);
            return resp;
        } catch (err) {
            log('error', 'error fetching map details from BeatSaver', {map: mapKey, err});
            return null;
        }
        
        /* if (this._api && resp != null) {
            traceLog('adding map to cache', {ident: mapKey, key: resp.key});
            this._api.store.dispatch(cacheBeatSaverMap(resp.hash, resp));
        } */
    }

    /**
     * Returns a downloadable link for the given map, optionally using direct download links.
     *
     * @param details - The map to build a download link for.
     * @param useDirect - Optionally skip the API, and get a direct download link from the CDN.
     * @param versionIndex
     * @returns An absolute URL to download the given map.
     */
    buildDownloadLink(details: IMapDetails, versionIndex?: number): string {
        versionIndex = versionIndex || 0;
        return details.versions[versionIndex].downloadURL;
    }
    /**
     * Returns a direct link to the cover image for a given map.
     *
     * @param details - The map to build a cover link for.
     * @returns An absolute URL to the cover art.
     */
    buildCoverLink(details: IMapDetails, versionIndex?: number) {
        versionIndex = versionIndex || 0;
        return details.versions[versionIndex].coverURL;
    }

    searchMapName = async (modName: string): Promise<IMapDetails[]> => {
        var url = `https://api.beatsaver.com/search/text/0?sortOrder=Relevance&q=${encodeURIComponent(modName)}`;
        try {
            var resp = await this.getApiResponse<IMapSearchResult>(url, null, (err) => null);
            // this.updateCache(cacheBeatSaverMap(resp.id, resp), () => resp != null);
            return resp.docs;
        } catch (err) {
            log('error', 'error fetching map details from BeatSaver', {name: modName, err});
            return null;
        }
    }
}

export interface IMapSearchResult {
    docs: IMapDetails[]
}

/**
 * A subset of the available mod metadata from beatsaver.com's API.
 *
 * @remarks
 * - These keys are left as-is to match the API response and save needing manual property mapping.
 */
export interface IMapDetails {
    metadata : {
        levelAuthorName: string,
        bpm: string,
        duration: number,
        songAuthorName: string,
        songName: string,
        songSubName: string
    },
    id: string;
    name: string;
    description: string;
    uploader: {
        id: number,
        name: string,
        hash: string,
        avatar: string
    }
    uploaded: string;
    versions: IMapVersion[];
}

export interface IMapVersion {
    hash: string,
    key: string,
    state: string,
    createdAt: string,
    downloadURL: string,
    coverURL: string,
    previewURL: string
    diffs: IMapDifficulty[]
}

export interface IMapDifficulty {
    njs: number;
    notes: number;
    nps: number;
    length: number;
    characteristic: string;
    difficulty: string;
    seconds: number;
}