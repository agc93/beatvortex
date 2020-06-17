import { fs, log } from "vortex-api";
import path = require('path');
import { ILocalPlaylist, IPlaylistEntry } from ".";
import { getAllFiles } from "../util";
import { BeatSaverClient } from "../beatSaverClient";
import { IExtensionApi } from "vortex-api/lib/types/api";
import { directDownloadInstall, setDownloadModInfo, GAME_ID } from "..";

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
    private _client: BeatSaverClient;
    /**
     *
     */
    constructor(installPath: string) {
        this.installPath = installPath;
        this._client = new BeatSaverClient();
        
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