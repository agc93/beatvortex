import axios, { AxiosResponse } from 'axios';
import { log } from 'vortex-api';
import path = require('path');
import { models, toTitleCase } from './util';

export function getCustomFolder(type: ModelType) {
    /* if (typeof type === 'string') {
        type = ModelType[type as keyof typeof ModelType]
    }
    switch (+type) {
        case ModelType.avatar:
        case ModelType.platform:
        case ModelType.saber:
            return `Custom${type}s`;
        case ModelType.bloq:
            return `CustomNotes`;
        default:
            return null;
    } */
    // type = type.replace('.', '') as ModelType;
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

export class ModelSaberClient {
    isModelSaberLink(installLink: string) : boolean {
        var extracted = this.parseUrl(installLink);
        return (extracted?.id && extracted?.name && extracted?.type) ? true : false; //why is this needed? ffs wtf js
    }

    private parseUrl(installLink: string) : {type: string, id: number, name: string} {
        var re = /modelsaber:\/\/(\w+)\/(\d+)\/([\w\s\.%]+?)\.(avatar|saber|platform|bloq)/;
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
        return details.download;
    }

    async getModelDetails(installLink: string): Promise<IModelDetails> | null {
        if (!installLink.startsWith('modelsaber://')) {
            return null;
        }
        var linkDetails = this.parseUrl(installLink);
        var url = `https://modelsaber.com/api/v2/get.php?filter=name:${linkDetails.name}&sort=desc`;
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

    async getModelByFileName(fileName: string) : Promise<Promise<IModelDetails> | null> {
        // if (!models.some(m => path.basename(fileName).indexOf(m) != -1)) {
        if (!models.some(m => fileName.endsWith(m))) {
            return null;
            //how the fuck did we get here ‽
        }
        var url = `https://modelsaber.com/api/v2/get.php?filter=name:${path.basename(fileName, path.extname(fileName))}&sort=desc&type=${this.getType(fileName)}`;
        var resp = await axios.request({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse) => {
            const { data } = resp;
            return data[0] as IModelDetails; //we just have to assume first here since we don't know what the ID is anymore.
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

export interface IModelDetails {
    type: ModelType,
    name: string,
    author: string,
    thumbnail: string,
    id: number,
    hash: string,
    platform: string,
    download: URL,
    date: string
}

/* enum ModelType {
    saber,
    avatar,
    platform,
    bloq
} */

export declare type ModelType = 'saber' | 'avatar' | 'platform' | 'bloq';