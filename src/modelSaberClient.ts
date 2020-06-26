import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';
import path = require('path');
import { models, toTitleCase } from './util';

/**
 * Gets the correct installation folder path for the given custom model.
 *
 * @remarks
 * - This method only supports the models used by ModelSaber
 *
 * @param type - The type of model to be installed.
 * @returns - A relative path to the destination folder for installation. Does not include the file path.
 */
export function getCustomFolder(type: ModelType) {
    log('debug', `building install path for ${type}`, {modelType: type});
    switch (type) {
        case 'avatar':
        case 'platform':
        case 'saber':
            return `Custom${toTitleCase(type)}s`;
        case 'bloq':
            return 'CustomNotes';
        default:
            break;
    }
}

/**
 * A simple client class to encapsulate the majority of modelsaber.com-specific logic, including metadata retrieval.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class ModelSaberClient {
    /**
     * Determines if the given link is a valid modelsaber.com installation link.
     * @remarks
     * - This guess is based solely on the link format!
     *
     * @param installLink - The one-click installation link to check.
     * @returns Whether the given file is likely a valid installation link for modelsaber.com
     */
    isModelSaberLink(installLink: string) : boolean {
        var extracted = this.parseUrl(installLink);
        return (extracted?.id && extracted?.name && extracted?.type) ? true : false; //why is this needed? ffs wtf js
    }

    private parseUrl(installLink: string) : {type: string, id: number, name: string} {
        // var re = /modelsaber:\/\/(\w+)\/(\d+)\/([\w\s\.%]+?)\.(avatar|saber|platform|bloq)/;
        var re = /modelsaber:\/\/(\w+)\/(\d+)\/(.+?)\.(avatar|saber|platform|plat|bloq)/; 
        // ⬆ this is a simplified version that accepts special characters. we may need to change back if it gets too aggressive.
        if (!re.test(installLink)) return null;
        var md = re.exec(installLink);
        return {
            type: md[1],
            id: +md[2],
            name: decodeURIComponent(md[3])
        }
    }

    /**
     * Returns the download link for a given model object.
     *
     * @remarks
     * Yes, this method is basically pointless.
     * I find it weird that BeatMods and BeatSaver both use relative links, but ModelSaber doesn't.
     * This is future-proofing against that changing.
     *
     * @beta
     */
    buildDownloadLink(details: IModelDetails) {
        return encodeURI(details.download.toString());
    }

    /**
     * Retrieves the given model's metadata from the ModelSaber API
     *
     * @remarks
     * - This method only works with one-click install links, not HTTP URLs.
     *
     * @param installLink - The one-click installation link for the ModelSaber model.
     * @returns A subset of the available metadata from ModelSaber. Returns null on error/not found
     */
    async getModelDetails(installLink: string): Promise<IModelDetails> | null {
        if (!installLink.startsWith('modelsaber://')) {
            return null;
        }
        var linkDetails = this.parseUrl(installLink);
        var url = `https://modelsaber.com/api/v2/get.php?filter=name:${linkDetails.name}&sort=desc`;

        //after further testing, this should get replaced with a call to getApiResponse
        // see getModelByFileName for an example.
        var resp = await axios.request({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse) => {
            const { data } = resp;
            return data[linkDetails.id] as IModelDetails;
        }).catch(err => {
            log('error', err);
            return null;
        });
        return resp;
    }

    /**
     * Retrieves the given model's metadata from the ModelSaber API, guessing the model based on file name.
     *
     * @remarks
     * - This method is actually just *searching* the API based on the file name and type.
     *
     * @param fileName - The file name to attempt to find metadata for.
     * @returns A subset of the available metadata from ModelSaber. Returns null on error/not found
     */
    async getModelByFileName(fileName: string) : Promise<IModelDetails> | null {
        // if (!models.some(m => path.basename(fileName).indexOf(m) != -1)) {
        if (!models.some(m => fileName.endsWith(m))) {
            return null;
            //how the fuck did we get here ‽
        }
        var url = `https://modelsaber.com/api/v2/get.php?filter=name:${path.basename(fileName, path.extname(fileName))}&sort=desc&type=${this.getType(fileName)}`;
        var details = await this.getApiResponse(url, (data) => data[0] as IModelDetails);
        return details;
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
    private async getApiResponse(url: string, returnHandler: (data: any) => IModelDetails) : Promise<IModelDetails> | null {
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

/**
 * A subset of the available mod metadata from ModelSaber.
 *
 * @remarks
 * - These keys are left as-is to match the API response and save needing manual property mapping.
 */
export interface IModelDetails {
    type: ModelType,
    name: string,
    author: string,
    thumbnail: string,
    id: number,
    hash: string,
    platform: string,
    download: URL,
    date: string,
    tags: string[],
    install_link: string
}

export declare type ModelType = 'saber' | 'avatar' | 'platform' | 'bloq';