import { trimString } from '../util';
import { HttpClient } from 'vortex-ext-http';
import { IStatResult } from './types';

/**
 * A simple client class to retrieve service statistics from a running Statty API.
 */
export class StattyClient extends HttpClient {
    private baseUrl: string = '';
    /**
     * Creates a new Statty client for the given API endpoint.
     * 
     * @param baseUrl the base API URL (don't include /api/)
     */
    constructor(baseUrl: string) {
        super("BeatVortex/0.2.0");
        this.baseUrl = trimString(baseUrl, '/');
    }
    
    /**
     * Gets the status and stats for a single service
     * 
     * @param service Service name (e.g. 'wiki')
     */
    async getServiceStatus(service: string): Promise<IStatResult> | null {
        var url = `${this.baseUrl}/api/stats/${service ?? ''}`;

        var details = await this.getApiResponse(url, (data) => data as IStatResult);
        return details;
    }

    /**
     * Gets the status and stats for all available services.
     */
    async getAllServices(): Promise<IStatResult[]> | null {
        var url = `${this.baseUrl}/api/stats`;

        var details = await this.getApiResponse(url, (data) => data as IStatResult[]);
        return details;
    }
}