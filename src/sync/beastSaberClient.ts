import { IExtensionApi } from "vortex-api/lib/types/api";
import path = require('path');
import { log } from "vortex-api";
import { HttpClient } from "vortex-ext-http";

export class BeastSaberClient extends HttpClient {

    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api?: IExtensionApi) {
        super("BeatVortex/0.2.0")
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
}

export interface IBookmark {
    title: string;
    song_key: string;
    hash: string;
    level_author_name: string;
}