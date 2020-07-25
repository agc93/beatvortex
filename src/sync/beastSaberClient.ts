import { IExtensionApi } from "vortex-api/lib/types/api";
import path = require('path');
import { log } from "vortex-api";
import axios, { AxiosResponse } from 'axios';

export class BeastSaberClient {

    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api?: IExtensionApi) {
        this._api = api;
    }

    /**
     * Retrieves the given user's bookmarks from the BeastSaber API
     *
     * @param user - The BeastSaber username to retrieve bookmarks for.
     * @returns A subset of the available metadata from BeastSaber. Returns null on error/not found.
     */
    getBookmarksForUser = async (user: string): Promise<IBookmark[]> | null => {
        if (!user) {
            return null;
        }
        return await this.getResponseByPage((page) => this.getApiResponse(`https://bsaber.com/wp-json/bsaber-api/songs?bookmarked_by=${user}&page=${page}`, (data) => data.songs as IBookmark[]));
    }

    /* getSongsByPage = async (user: string): Promise<IBookmark[]> => {
        // return this.getApiResponse(`https://bsaber.com/wp-json/bsaber-api/songs?bookmarked_by=agc93&page=${page}`, (data) => data.songs)
    } */

    getResponseByPage = async <T>(apiFunc: (page: number) => Promise<T[]>, results: T[] = [], startPage?: number): Promise<T[]> => {
        var page = startPage ?? 1;
        return apiFunc(page)
        .then(res => {
            console.log(`GET page ${page}: ${res?.length}`);
            page++;
            if (res.length > 0) {
                return this.getResponseByPage(apiFunc, results.concat(res), page)
            } else {
                return results;
            }
        })
        .catch(e => {
            return results;
        });
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
}

export interface IBookmark {
    title: string;
    song_key: string;
    hash: string;
    level_author_name: string;
}