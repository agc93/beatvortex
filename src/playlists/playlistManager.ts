import { fs, log } from "vortex-api";
import path = require('path');
import { ILocalPlaylist, IPlaylistEntry } from ".";
import { traceLog } from "../util";
import { BeatSaverClient } from "../beatSaverClient";
import { IExtensionApi } from "vortex-api/lib/types/api";
import { directDownloadInstall, setDownloadModInfo, GAME_ID } from "..";

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
    
    getInstalledPlaylists = async (): Promise<ILocalPlaylist[]> => {
        var playlistFiles: string[] = (await fs.readdirAsync(path.join(this.installPath, 'Playlists'))).filter((f: string) => f.endsWith('.bplist'));
        var localPlaylists = Promise.all(playlistFiles.map(async (file: string): Promise<ILocalPlaylist> => {
            var playlistContent = await fs.readFileAsync(path.join(this.installPath, 'Playlists', file), { encoding: 'utf-8' });
            var content = JSON.parse(playlistContent);
            var pl = {
                filePath: path.basename(file),
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

export const installMaps = async (api: IExtensionApi, mapIdents: string[], callbackFn?: (api: IExtensionApi, modIds: string[]) => void) => {
    var client = new BeatSaverClient();
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

export const installPlaylist = async (api: IExtensionApi, playlist: ILocalPlaylist) =>{
    var installed = api.getState().persistent.mods[GAME_ID]
    var toInstall = playlist.maps.filter(plm => !Object.values(installed).some(i => (i.id == plm.key) || (i?.attributes['mapHash'] == plm.hash)));
    await installMaps(api, toInstall.map(i => i.hash ?? i.key), () => {
        api.sendNotification({
            type: 'info',
            title: "Now installing playlist",
            message: `Installing ${toInstall.length} maps from BeatSaver`,
            noDismiss: true,
            displayMS: 4000
        });
    });
}
