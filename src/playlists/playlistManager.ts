import { fs, log, util } from "vortex-api";
import path = require('path');
import { ILocalPlaylist, IPlaylistEntry } from ".";
import { getAllFiles } from "../util";
import { BeatSaverClient } from "../beatSaverClient";
import { IExtensionApi, IMod } from "vortex-api/lib/types/api";
import { directDownloadInstall, setDownloadModInfo, GAME_ID } from "..";
import { IPlaylistInfo } from "../playlistClient";

/**
 * This class was intended as a utility class encompassing local-only playlist 
 * operations, but has largely ended up a wrapper for retrieving local playlists.
 * 
 * @remarks
 * In future, the `installMaps` and `installPlaylist` functions should probably be refactored
 * into this client.
 */
export class PlaylistManager {
    private installPath: string;
    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api: IExtensionApi);
    constructor(installPath: string);
    constructor(init: string|IExtensionApi) {
        if (typeof init === 'string') {
            this.installPath = init;
        } else {
            this._api = init;
            this.installPath = this._api.getState().settings.gameMode.discovered[GAME_ID].path
        }
        // this._client = new BeatSaverClient();
    }
    
    /**
     * Retrieves all locally installed *and deployed* playlists. This method reads directly 
     * from the install directory, so won't find installed but undeployed playlists.
     * 
     * @remarks
     * At this time, the method does not return the image, since that could be lots of things.
     */
    getInstalledPlaylists = async (): Promise<ILocalPlaylist[]> => {
        // var playlistFiles: string[] = (await fs.readdirAsync(path.join(this.installPath, 'Playlists'))).filter((f: string) => f.endsWith('.bplist'));
        var playlistPath = path.join(this.installPath, 'Playlists');
        var playlistFiles: string[] = (await getAllFiles(playlistPath)).filter((f: string) => f.endsWith('.bplist'));
        var localPlaylists = Promise.all(playlistFiles.map(async (file: string): Promise<ILocalPlaylist> => {
            var playlistContent = await fs.readFileAsync(file, { encoding: 'utf-8' });
            var content = JSON.parse(playlistContent);
            var pl = {
                filePath: path.relative(playlistPath, file),
                title: content.playlistTitle?.replace('\n', ' ') ?? path.basename(file, '.bplist'),
                authorName: content.playlistAuthor ?? '',
                // image: content.image,
                maps: content.songs.map(o => o as IPlaylistEntry)
            } as ILocalPlaylist;
            return pl;
        }))
        var localData = await localPlaylists;
        return localData;
    }

    static createPlaylistContent(name: string, maps: string[], author: string, image?: string) {
        var playlist: IPlaylistInfo = 
        {
            playlistTitle: name,
            playlistAuthor: author,
            image: image,
            songs: maps.map((m): IPlaylistEntry => {
                return m.length === 4 ? {key: m, hash: undefined} : {hash: m, key: undefined};
            })
        };
        return playlist;
    }

    createPlaylistContent = (name: string, mapIdents: string[], author?: string, image?: string) => {
        if (!this._api) {
            return PlaylistManager.createPlaylistContent(name, mapIdents, author, image);
        } else {
            var playlist: IPlaylistInfo = {
                playlistTitle: name,
                playlistAuthor: author ?? util.getSafe(this._api.getState().persistent, ['nexus', 'userInfo', 'name'], undefined),
                songs: []
            };
            var mods = this._api.getState().persistent.mods[GAME_ID];
            var maps = mapIdents.map((mi): IPlaylistEntry => {
                var mod: IMod;
                if (mi.length == 4) {
                    mod = mods[mi];
                } else {
                    mod = Object.values(mods).find(m => util.getSafe(mod.attributes, ['mapHash'], '') == mi);
                }
                if (mod) {
                    return {
                        hash: util.getSafe(mod.attributes, ['mapHash'], undefined),
                        key: mod.id,
                        songName: util.getSafe(mod.attributes, ['modName'], undefined),
                    }
                }
            });
            playlist.songs = maps;
            return playlist;
        }
    }
}

/**
 * Immediately installs the given maps.
 * 
 * @param api - Extension API.
 * @param mapIdents - List of map identifiers to be installed.
 * @param callbackFn Optional callback to invoke after all the maps have been installed.
 */
export const installMaps = async (api: IExtensionApi, mapIdents: string[], callbackFn?: (api: IExtensionApi, modIds: string[]) => void) => {
    var client = new BeatSaverClient(api);
    var details = await Promise.all(mapIdents.map(async (id: string) => {
        return client.getMapDetails(id);
    }));
    log('info', `downloading ${details.length} maps`);
    if (details != null && details.length > 0) {
        await Promise.all(details.map(async map => {
            log('debug', `got details from beatsaver API`, map);
            var link = client.buildDownloadLink(map);
            // log('debug', `attempting proxy: ${map}`);
            api.events.emit('start-download', 
                [link], 
                {
                    game: 'beatsaber'
                }, 
                null, 
                (err: Error, id?: string) => {
                    directDownloadInstall(api, map, err, id, (api) => setDownloadModInfo(api.store, id, {...map, source: 'beatsaver', id: map.key}));
                }, 
                true);
        }));
        if (callbackFn) {
            callbackFn(api, details.map(m => m.key));
        }
        
    } else {
        api.showErrorNotification(`Could not fetch details for ${mapIdents}!`, `We couldn't get details from BeatSaver for that song. It may have been removed or currently unavailable.`, {allowReport: false});
    }
}