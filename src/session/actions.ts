import { createAction } from 'redux-act';
import { util, actions } from "vortex-api";
import { IReducerSpec } from 'vortex-api/lib/types/api';
import { IMapDetails } from "../beatSaverClient";
import { IModDetails, IVersionList } from "../beatModsClient";
import { IBookmark } from "../sync";
import { arrayToObject, traceLog } from "../util";

export const updateBeatModsCache =
  createAction('BS_CACHE_BEATMODS', (mods: IModDetails[]) => mods);

export const updateBeatModsVersions =
  createAction('BS_CACHE_VERSIONS', (modVersions: IVersionList) => modVersions);

export const cacheBeatSaverMap =
  createAction('BS_CACHE_MAP', (key: string, details: IMapDetails) => ({key, details}));

export const updateBeatSaberVersion =
  createAction('BS_CACHE_GAMEVERSION', (version: string) => version);

export const updateBookmarksCache =
  createAction('BS_CACHE_BOOKMARKS', (user: string, bookmarks: IBookmark[]) => ({user,bookmarks}));

/**
 * reducer for changes to the authentication
 */
export const sessionReducer: IReducerSpec = {
    reducers: {
      [updateBeatModsCache as any]: (state, payload: IModDetails[]) => {
        return util.merge(state, ['mods'], arrayToObject(payload, m => m._id));
      },
      [updateBeatModsVersions as any]: (state, payload: IVersionList) => {
        // var versions = [...new Set(payload.map(m => m.gameVersion))];
        return util.setSafe(state, ['modVersions'], payload);
      },
      [cacheBeatSaverMap as any]: (state, payload: {key: string, details: IMapDetails}) => {
        // util.merge(state, ['maps', payload.details.hash], payload.details);
        return util.merge(state, ['maps', payload.key], payload.details);
      },
      [updateBeatSaberVersion as any]: (state, payload: string) => {
        return util.setSafe(state, ['gameVersion'], payload);
      },
      [updateBookmarksCache as any]: (state, payload: {user: string, bookmarks: IBookmark[]}) => {
        return util.setSafe(state, ['bookmarks', payload.user], payload.bookmarks);
      }
    },
    defaults: {
      beatmods: {},
      // gameVersions: [],
      beatsaver: {},
      modVersions: {},
      gameVersion: '',
      bookmarks: {}
    }
  };