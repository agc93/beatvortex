import { IPlaylistEntry } from "./playlists";
import axios, { AxiosResponse } from 'axios';
import path = require('path');
import { log, selectors, fs } from "vortex-api";
import { IExtensionApi } from "vortex-api/lib/types/api";
import { GAME_ID } from ".";
import { getModName } from "./util";

export type PlaylistRef = {source: string, fileUrl: string, fileName: string};

/**
 * Prototype client for retrieving and handling playlist/bplist files.
 */
export class PlaylistClient {
    _baseUrl: string;
    /**
     *
     */
    constructor(linkBase?: string) {
        this._baseUrl = linkBase ?? 'https://bsaber.com/PlaylistAPI/';
    }

    /**
     * Parses the given OneClick installation link for the basic playlist file details.
     * 
     * @param installLink - The OneClick (not HTTP!) link to parse.
     */
    parseUrl = (installLink: string) : PlaylistRef => {
        var re = /bsplaylist:\/\/playlist\/(\w{4,5}:\/\/(.+?).bplist)/;
        if (!re.test(installLink)) return null;
        var md = re.exec(installLink);
        var fileUrl = md[1];
        var u = new URL(fileUrl);
        var sourceName = getModName(u.host);
        var fileName = path.basename(u.pathname);
        return {
            source: sourceName,
            fileUrl: fileUrl,
            fileName: fileName
        };
    }

    /**
     * Retrieves the given playlist and returns its parsed content.
     */
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

    /**
     * Saves a playlist to a named folder in the staging folder.
     * 
     * @remarks
     * - If the playlist info (`info`) is not provided, it will be retrieved again here.
     */
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

/**
 * Represents a bplist Playlist
 * 
 * @remarks
 * Like its mod/map/model counterparts, this deliberately retains identical key names to the format to avoid property mapping.
 */
export interface IPlaylistInfo {
    playlistTitle: string;
    playlistAuthor: string;
    image?: string;
    songs: IPlaylistEntry[];
}