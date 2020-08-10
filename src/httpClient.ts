import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';
import path = require('path');
import { models, toTitleCase } from './util';


/**
 * A simple client class to encapsulate the majority of modelsaber.com-specific logic, including metadata retrieval.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class HttpClient {
    
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
    protected async getApiResponse<T>(url: string, returnHandler: (data: any) => T) : Promise<T> | null {
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

    private getType(fileName: string) {
        return path.extname(fileName).replace('.', '');
    }
}