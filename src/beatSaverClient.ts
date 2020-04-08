import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';

export class BeatSaverClient {
    async getMapName(modName: any) : Promise<string> {
        var details = await this.getMapDetails(modName);
        return details?.name 
            ? `${details.name} [${details.key}]`
            : modName;
    }

    async getMapDetails(mapKey: string): Promise<IMapDetails> | null {
        var url = mapKey.length === 4 ? `https://beatsaver.com/api/maps/detail/${mapKey}` : `https://beatsaver.com/api/maps/by-hash/${mapKey}`;
        var resp = await axios.request<IMapDetails>({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse<IMapDetails>) => {
            const { data } = resp;
            log('debug', JSON.stringify(data));
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

    buildCoverLink(details: IMapDetails) {
        return `https://beatsaver.com${details.coverURL}`;
    }
}

export interface IMapDetails {
    metadata : {
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