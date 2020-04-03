import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';

export class BeatSaverClient {
    async getMapName(modName: any, targetName: string) : Promise<string> {
        await axios.get(`https://beatsaver.com/api/maps/by-hash/${modName}`)
            .then((resp) => {
                log('debug', resp.data);
                targetName = `${resp.data.name} [${resp.data.key}]`;
            })
            .catch((err) => {
                log('warn', err);
            });
        return targetName;
    }

    async getMapDetails(mapKey: string): Promise<IMapDetails> | null {
        var resp = await axios.request<IMapDetails>({
            url: `https://beatsaver.com/api/maps/detail/${mapKey}`,
            // transformResponse: (r: ServerResponse) => r
        }).then((resp: AxiosResponse<IMapDetails>) => {
            const { data } = resp;
            // log('debug', JSON.stringify(data));
            //log('debug', JSON.stringify(resp));
            return data;
        }).catch(err => {
            log('error', err);
            return null;
        });
        return resp;
    }

    buildDownloadLink(details: IMapDetails, useDirect?: boolean) {
        if (useDirect) {
            return `https://beatsaver.com${details.directDownload}`
        }
        return `https://beatsaver.com${details.downloadURL}`
    }

    buildProxyLink(details: IMapDetails, server: string) {
        return `${server.trimRight()}map/${details.key}/${details.name}`
    }
}

export interface IMapDetails {
    hash: string;
    downloadURL: string;
    name: string;
    key: string;
    description: string;
    directDownload: string;
}