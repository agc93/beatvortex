import { IExtensionApi, IMod } from "vortex-api/lib/types/api";
import { BeastSaberClient } from ".";
import { IBookmark } from "./beastSaberClient";
import { GAME_ID } from "..";
import { util, actions, log } from "vortex-api";
import { SyncSources, updateDownloadedMaps } from "./actions";
import { traceLog, getCurrentProfile, ModList } from "../util";
import { PlaylistManager, installMaps } from "../playlists";
import { installLocalPlaylist, installPlaylistMaps } from "../install";
import { updateBookmarksCache } from "../session";

export class SyncService {
    private _api: IExtensionApi;
    private _bsaber: BeastSaberClient;
    private _mgr: PlaylistManager;
    /**
     *
     */
    constructor(api: IExtensionApi) {
        this._api = api;
        this._bsaber = new BeastSaberClient;
        this._mgr = new PlaylistManager(api);
    }

    getBookmarks = async (userName: string): Promise<IBookmark[]> => {
        var allBookmarks = await this._bsaber.getBookmarksForUser(userName);
        if (userName && allBookmarks) {
            this._api.store.dispatch(updateBookmarksCache(userName, allBookmarks));
        }
        return allBookmarks;
    }

    syncBookmarks = async (userName: string, download: boolean = false): Promise<void> => {
        var allBookmarks = await this.getBookmarks(userName);
        if (!allBookmarks) {
            return;
        }
        var toSync: IBookmark[] = []
        var installed = Object.values(util.getSafe<ModList>(this._api.getState().persistent.mods, [GAME_ID], {}))
            .filter(m => m.type == 'bs-map')
            .filter(m => util.getSafe(m.attributes, ['mapHash'], undefined) !== undefined)
            .map(m => util.getSafe(m.attributes, ['mapHash'], ''));
        var bookmarks = util.getSafe<{[source: string]: string[]}>(this._api.getState().persistent, ['beatvortex', 'sync', 'downloaded'], {});
        var previousSyncs = bookmarks[SyncSources.BeastSaberBookmarks] ?? [];
        traceLog('pulled persistent download cache', {bookmarks, previousSyncs});
        toSync = allBookmarks.filter(b => installed.indexOf(b.hash) == -1).filter(b => previousSyncs.indexOf(b.hash) == -1);
        traceLog('filtered bookmark list', {allBookmarks: allBookmarks.length, filtered: toSync.length, previousSyncs: previousSyncs.length, installed: installed.length});
        if (toSync && toSync.length > 0) {
            var hashes = toSync.map(b => b.hash);
            var ready = await this.ensureBookmarksPlaylist();
            traceLog('installed bookmarks playlist', {installed: ready, queue: toSync.length});
            if (ready) {
                await this._mgr.updatePlaylist('Bookmarks', allBookmarks.map(b => b.hash));
            }
            if (ready && download) {
                this._api.sendNotification({
                    type: 'info',
                    title: `Now installing bookmarked maps`,
                    message: `Installing ${toSync.length} maps from BeatSaver`,
                    noDismiss: true,
                    displayMS: 4000
                });
                var profileId = getCurrentProfile(this._api);
                await installMaps(this._api, hashes, (api, modIds) => {
                    for (const id of modIds) {
                        api.store.dispatch(actions.setModEnabled(profileId, id, true));
                    }
                    api.store.dispatch(updateDownloadedMaps(SyncSources.BeastSaberBookmarks, hashes))
                    api.events.emit('mods-enabled', modIds, true, GAME_ID);
                });
            }
        } else {
            this._api.sendNotification({
                type: 'info',
                title: 'No bookmarks to sync',
                message: 'All bookmarks have already been downloaded or installed!',
                displayMS: 6000
            });
        }
    }

    ensureBookmarksPlaylist = async (): Promise<boolean> => {
        var alreadyExists = await this._mgr.isPlaylistInstalled('Bookmarks');
        if (alreadyExists) {
            return true;
        }
        var bmPlaylist = this._mgr.createPlaylistContent('Bookmarks', []);
        await installLocalPlaylist(this._api, bmPlaylist);
        // return await this._mgr.isPlaylistInstalled('Bookmarks');
        return true;
    }

    
}