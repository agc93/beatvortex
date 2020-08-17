import axios, { AxiosResponse, AxiosError } from 'axios';
import { log, util, fs } from 'vortex-api';
import path = require('path');
import { models, toTitleCase, traceLog } from './util';
import retry from 'async-retry';
import { IExtensionApi, IState } from 'vortex-api/lib/types/api';
import { ThunkDispatch } from 'redux-thunk';
import * as Redux from 'redux';

/**
 * A simple client base class to encapsulate retrieving data from a JSON API endpoint.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class HttpClient {

    protected retryCount: number = 3;

    protected downloadZipFile = async <T>(url: string, destinationFile: string): Promise<string> => {
        var result = await axios.request({
            responseType: 'arraybuffer',
            url: url,
            method: 'get',
            headers: {
                'Content-Type': 'application/zip',
            }
        });
        const outputFilename = destinationFile;
        let buffer = Buffer.from(result.data);
        fs.writeFileSync(outputFilename, buffer);
        return outputFilename;
    }

    /**
     * Helper method for retrieving data from the a JSON API.
     *
     * @remarks
     * - This method is just the common logic and needs a callback to declare what to return from the output.
     *
     * @param url - The endpoint URL for the request.
     * @param returnHandler - A callback to take the API response and return specific data.
     * @returns The repsonse after transformation by the returnHandler. Returns null on error/not found.
     */
    protected getApiResponse = async <T>(url: string, returnHandler?: (data: any) => T, onError?: (err: Error) => any): Promise<T | null> | null => {
        returnHandler = returnHandler ?? ((data) => data);
        try {
            var resp = await retry(async bail => {
                try {
                    var response = await axios.request<T>({
                        url: url,
                        headers: { 'User-Agent': 'BeatVortex/0.1.0' }
                    });
                    const { data } = response;
                    return returnHandler(data);
                } catch (err) {
                    if ((err as AxiosError).response && (err as AxiosError).response.status == 404) {
                        bail(err);
                    } else {
                        throw (err);
                    }
                }
            }, {
                retries: this.retryCount ?? 3,
                onRetry: (err) => {
                    log('debug', 'error during HTTP request, retrying', { err });
                }
            });
            return resp;
        } catch (err) {
            if (onError) {
                return onError?.(err);
            } else {
                throw (err);
            }
        }
    }

    protected getType(fileName: string) {
        return path.extname(fileName).replace('.', '');
    }
}

export class CachedHttpClient extends HttpClient {
    protected _api: IExtensionApi;
    /**
     *
     */
    constructor(api: IExtensionApi) {
        super();
        this._api = api;
    }

    protected checkCache<TCache, T>(statePath: string[], stateHandler?: (cache: TCache) => T) {
        stateHandler = stateHandler ?? ((cache) => cache as any);
        if (this._api) {
            var cache = util.getSafeCI<TCache>(this._api.getState(), statePath, undefined);
            if (cache != undefined && cache) {
                return stateHandler(cache);
            }
        }
        return null;
    }

    protected updateCache = (dispatchAction: Redux.Action, checkAction?: () => boolean) => {
        checkAction = checkAction ?? (() => true);
        if (this._api && checkAction) {
            // traceLog('adding entry to cache', {ident: mapKey, key: resp.key});
            this._api.store.dispatch(dispatchAction);
        }
    }
}