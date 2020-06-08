import { IPlaylistEntry } from "./playlists";
import axios, { AxiosResponse } from 'axios';
import path = require('path');
import { log, selectors, fs } from "vortex-api";
import { IExtensionApi } from "vortex-api/lib/types/api";
import { GAME_ID } from ".";

export type PlaylistRef = {fileUrl: string, fileName: string};

export class PlaylistClient {
    _baseUrl: string;
    /**
     *
     */
    constructor(linkBase?: string) {
        this._baseUrl = linkBase ?? 'https://bsaber.com/PlaylistAPI/';
    }

    parseUrl = (installLink: string) : PlaylistRef => {
        var re = /bsplaylist:\/\/playlist\/(\w{4,5}:\/\/(.+?).bplist)/;
        if (!re.test(installLink)) return null;
        var md = re.exec(installLink);
        var fileUrl = md[1];
        var u = new URL(fileUrl);
        var fileName = path.basename(u.pathname);
        return {
            fileUrl: fileUrl,
            fileName: fileName
        };
    }

    getPlaylist = async (name: string): Promise<IPlaylistInfo> => {
        name = name.endsWith('.bplist') ? name : `${name}.bplist`;
        var url = `${this._baseUrl}${name}`;
        var resp = await axios.request<IPlaylistInfo>({
            url: url,
            headers: {'User-Agent': 'BeatVortex/0.1.0' }
        }).then((resp: AxiosResponse<IPlaylistInfo>) => {
            const { data } = resp;
            // traceLog(JSON.stringify(data));
            return data;
        }).catch(err => {
            log('error', err);
            return null;
        });
        return resp;
    }

    saveToFile = async (api: IExtensionApi, playlist: PlaylistRef, info?: IPlaylistInfo): Promise<string> => {
        if (!info) {
            info = await this.getPlaylist(playlist.fileName);
        }
        var installPath = selectors.installPathForGame(api.getState(), GAME_ID);
        var targetPath = path.join(installPath, path.basename(playlist.fileName, path.extname(playlist.fileName)));
        var targetPlaylistFile = path.join(targetPath, playlist.fileName);
        await fs.ensureDirWritableAsync(targetPath);
        await fs.writeFileAsync(targetPlaylistFile, JSON.stringify(info));
        return targetPlaylistFile;
    }


}

export interface IPlaylistInfo {
    playlistTitle: string;
    playlistAuthor: string;
    image: string;
    songs: IPlaylistEntry[];
}