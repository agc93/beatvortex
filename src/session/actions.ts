import { createAction } from 'redux-act';
import { util, actions } from "vortex-api";
import { IReducerSpec } from 'vortex-api/lib/types/api';
import { IMapDetails } from "../beatSaverClient";
import { IModDetails } from "../beatModsClient";
import { arrayToObject, traceLog } from "../util";

export const updateBeatModsCache =
  createAction('BS_CACHE_BEATMODS', (mods: IModDetails[]) => mods);

export const updateBeatModsVersions =
  createAction('BS_CACHE_VERSIONS', (mods: IModDetails[]) => mods);

export const cacheBeatSaverMap =
  createAction('BS_CACHE_MAP', (key: string, details: IMapDetails) => ({key, details}));

/**
 * reducer for changes to the authentication
 */
export const sessionReducer: IReducerSpec = {
    reducers: {
      [updateBeatModsCache as any]: (state, payload: IModDetails[]) => {
        return util.merge(state, ['mods'], arrayToObject(payload, m => m._id));
      },
      [updateBeatModsVersions as any]: (state, payload: IModDetails[]) => {
        var versions = [...new Set(payload.map(m => m.gameVersion))];
        return util.setSafe(state, ['gameVersions'], versions);
      },
      [cacheBeatSaverMap as any]: (state, payload: {key: string, details: IMapDetails}) => {
        // util.merge(state, ['maps', payload.details.hash], payload.details);
        return util.merge(state, ['maps', payload.key], payload.details);
      }
    },
    defaults: {
      beatmods: {},
      gameVersions: [],
      beatsaver: {}
    }
  };