import { fs, log, util, actions } from "vortex-api";
import path = require('path');
import retry = require('async-retry');
import asyncPool from "tiny-async-pool";
import { isActiveGame } from "vortex-ext-common";
import { ILocalPlaylist, IPlaylistEntry } from ".";
import { getAllFiles, ModList, traceLog, getUserName } from "../util";
import { BeatSaverClient, IMapDetails } from "../beatSaverClient";
import { IExtensionApi, IMod, IModTable } from "vortex-api/lib/types/api";
import { directDownloadInstall, setDownloadModInfo, GAME_ID } from "..";
import { IPlaylistInfo, PlaylistClient, PlaylistRef } from "../playlistClient";
import { installPlaylist } from "../install";

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
    constructor(api: IExtensionApi) {
            this._api = api;
            this.installPath = this._api.getState().settings.gameMode.discovered[GAME_ID].path
        }

    playlistExists = async (name: string): Promise<boolean> => {
        var playlists = await this.getInstalledPlaylists();
        return playlists.some(p => p.title.toLowerCase() == name.toLowerCase());
    }

    isPlaylistInstalled = async (name: string): Promise<boolean> => {
        if (!this._api) {
            throw new Error("Cannot determine installed playlists!");
        } else {
            var modList = util.getSafe<ModList>(this._api.getState().persistent.mods, [GAME_ID], {});
            var mods = Object.values(modList).filter(m => m.type == 'bs-playlist');
            return mods.some(m => util.getSafe(m.attributes, ['name'], '').toLowerCase() == name.toLowerCase());
        }
    }

    updatePlaylist = async (playlistName: string, idents: string[], replace: boolean = true): Promise<IPlaylistEntry[]> => {
        if (!this._api) {
            throw new Error("Cannot determine installed playlists!")
        } else {
            var target = await retry(async bail => {
                var modList = util.getSafe<ModList>(this._api.getState().persistent.mods, [GAME_ID], {});
                var playlists = Object.values(modList).filter(m => m.type == 'bs-playlist');
                var match = playlists.find(p => util.getSafe(p.attributes, ['name'], '').toLowerCase() == playlistName.toLowerCase());
                if (!match) {
                    throw new Error("could not locate playlist");
                }
                return match;
            }, { retries: 5 });
            /* await new Promise(r => setTimeout(r, 1500));
            var modList = util.getSafe<ModList>(this._api.getState().persistent.mods, [GAME_ID], {});
            var playlists = Object.values(modList).filter(m => m.type == 'bs-playlist');
            var match = playlists.find(p => util.getSafe(p.attributes, ['name'], '').toLowerCase() == playlistName.toLowerCase());
            if (!match) {
                throw new Error("could not locate playlist");
            }
            var target = match; */
            if (target) {
                log('debug', 'identified existing playlist for update', {mod: target.id, maps: idents.length});
                var author = util.getSafe(target.attributes, ['author'], '');
                var image = util.getSafe(target.attributes, ['pictureUrl'], undefined);
                var pl = this.createPlaylistContent(playlistName, idents, author, image);
                traceLog('generated updated playlist model', {playlist: pl})
                var client = new PlaylistClient();
                var ref: PlaylistRef = {
                    fileName: `${pl.playlistTitle}.bplist`,
                    fileUrl: undefined,
                    source: 'Local'
                }
                var targetPath = await client.saveToFile(this._api, ref, pl);
                return pl.songs;
            }
        }
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

    static createPlaylistContent(name: string, maps: string[], author: string, image?: string): IPlaylistInfo {
        var playlist: IPlaylistInfo = 
        {
            playlistTitle: name,
            playlistAuthor: author,
            image: image,
            songs: maps.map((m): IPlaylistEntry => {
                return m.length < 6 ? {key: m, hash: undefined} : {hash: m, key: undefined};
            })
        };
        return playlist;
    }

    createPlaylistContent = (name: string, mapIdents: string[], author?: string, image?: string): IPlaylistInfo => {
        if (!this._api) {
            return PlaylistManager.createPlaylistContent(name, mapIdents, author, image);
        } else {
            var playlist: IPlaylistInfo = {
                playlistTitle: name,
                playlistAuthor: author ?? getUserName(this._api.getState()),
                songs: []
            };
            var mods = this._api.getState().persistent.mods[GAME_ID];
            var maps = mapIdents.map((mi): IPlaylistEntry => {
                var mod: IMod;
                if (mi.length < 6) {
                    mod = mods[mi];
                } else {
                    mod = Object.values(mods).find(m => util.getSafe(m.attributes, ['mapHash'], '') == mi);
                }
                if (mod) {
                    return {
                        hash: util.getSafe(mod.attributes, ['mapHash'], undefined),
                        key: mod.id,
                        songName: util.getSafe(mod.attributes, ['modName'], undefined),
                    }
                } else {
                    return mi.length < 6 ? {key: mi, hash: undefined} : {hash: mi, key:undefined}
                }
            });
            playlist.songs = maps;
            playlist.image = image ?? undefined;
            return playlist;
        }
    }

    installLocalPlaylist = async (api: IExtensionApi, info: IPlaylistInfo) => {
        var ref: PlaylistRef = {
            fileName: `${info.playlistTitle}.bplist`,
            fileUrl: undefined,
            source: 'Local'
        }
        installPlaylist(api, ref, info);
    }

    createPlaylist = async (modIds: string[], metadataCallback: (api: IExtensionApi) => Promise<{title: string, image: string}>): Promise<void> => {
        var api = this._api;
        if (!isActiveGame(api, GAME_ID)) {
            return;
        }
        var mods = api.getState().persistent.mods[GAME_ID];
        var compatibleMods = modIds
            .map(mid => mods[mid])
            .filter(m => util.getSafe(m.attributes, ['source'], undefined) == 'beatsaver');
        if (compatibleMods.length == 0) {
            api.sendNotification({
                title: 'Playlist Creation Failed',
                message: 'None of the selected mods are BeatSaver maps!',
                type: 'error'
            });
        } else {
            var result = await metadataCallback(api);
            if (!result) {
                return;
            }
            if (result) {
                var content = this.createPlaylistContent(result.title, compatibleMods.map(m => m.id), null, result.image);
                api.sendNotification({
                    id: `playlist-creation`,
                    type: 'success',
                    title: 'Playlist created',
                    message: `Created new playlist with ${compatibleMods.length} maps`,
                    actions: [
                      {
                        title: 'Save to file', action: async () => {
                          const playlistsPath = path.join(util.getVortexPath('temp'), 'BeatSaberPlaylists');
                          await fs.ensureDirWritableAsync(playlistsPath, () => Promise.resolve());
                          const tmpPath = path.join(playlistsPath, util.deriveInstallName(result.title, undefined) + ".bplist");
                          const formatted = JSON.stringify(content, null, '\t');
                          await fs.writeFileAsync(tmpPath, formatted);
                          util.opn(playlistsPath).catch(() => null);
                        },
                      },
                      {
                          title: 'Install', action: async (dismiss) => {
                              await this.installLocalPlaylist(api, content)
                              dismiss();
                          }
                      }
                    ],
                  });
            }
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
    if (details != undefined && details.length > 0) {
        const installMap = async (map: IMapDetails): Promise<void> => {
            log('debug', `got details from beatsaver API`, map);
            var link = client.buildDownloadLink(map);
            // log('debug', `attempting proxy: ${map}`);
            return new Promise<void>((resolve, reject) => {
                api.events.emit('start-download', 
                [link], 
                {
                    game: 'beatsaber'
                }, 
                null, 
                (err: Error, id?: string) => {
                    directDownloadInstall(api, map, err, id, (api) => setDownloadModInfo(api.store, id, {...map, source: 'beatsaver', id: map.id}));
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }, 
                true);
            });
        }
        await asyncPool(5, details, installMap);
        // await Promise.all(details.map(installMap));
        if (callbackFn) {
            callbackFn(api, details.map(m => m.id));
        }
        
    } else {
        api.showErrorNotification(`Could not fetch details for ${mapIdents}!`, `We couldn't get details from BeatSaver for that song. It may have been removed or currently unavailable.`, {allowReport: false});
    }
}