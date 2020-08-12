import { createAction } from 'redux-act';
import { util, actions } from "vortex-api";
import { IReducerSpec } from 'vortex-api/lib/types/api';
import { IMapDetails } from "../beatSaverClient";

export const updateDownloadedMaps =
  createAction('BS_SYNC_DOWNLOADED', (sourceId: string, mapHashes: string[]) => ({sourceId, mapHashes}));

/**
 * reducer for changes to the authentication
 */
export const syncReducer: IReducerSpec = {
    reducers: {
      [updateDownloadedMaps as any]: (state, payload: {sourceId: string, mapHashes: string[]}) => {
        var existing = util.getSafe<string[]>(state, ['downloaded', payload.sourceId], []);
        var mergedHashes = [...new Set(existing.concat(payload.mapHashes))]
        return util.merge(state, ['downloaded'], {[payload.sourceId]: mergedHashes});
      }
    },
    defaults: {
      downloaded: {}
    }
  };

export const SyncSources = {
    BeastSaberBookmarks: 'bsaber-bookmarks'
};