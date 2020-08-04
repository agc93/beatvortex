import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';
import path = require('path');
import { models, toTitleCase, trimString } from '../util';
import { HttpClient } from '../httpClient';
import { IStatResult } from './types';

/**
 * A simple client class to encapsulate the majority of modelsaber.com-specific logic, including metadata retrieval.
 *
 * @remarks
 * This client uses *only* unauthenticated endpoints, no auth has been implemented.
 */
export class StattyClient extends HttpClient {
    private baseUrl: string = '';
    /**
     *
     */
    constructor(baseUrl: string) {
        super();
        this.baseUrl = trimString(baseUrl, '/');
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
    async getServiceStatus(service: string): Promise<IStatResult> | null {
        var url = `${this.baseUrl}/api/stats/${service ?? ''}`;

        var details = await this.getApiResponse(url, (data) => data as IStatResult);
        return details;
    }

    async getAllServices(): Promise<IStatResult[]> | null {
        var url = `${this.baseUrl}/api/stats`;

        var details = await this.getApiResponse(url, (data) => data as IStatResult[]);
        return details;
    }
}