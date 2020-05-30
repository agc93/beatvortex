import { createAction } from 'redux-act';
// import { safeCreateAction } from 'vortex-api/lib/actions/safeCreateAction';
import { util, actions } from "vortex-api";
import { IReducerSpec } from 'vortex-api/lib/types/api';
// import { ILinkHandling } from './settings';

/*
 * associate with respective OCI links
 */
export const registerOneClickInstall =
  createAction('BS_ENABLE_OCI', (register: ILinkHandling) => register);

/**
 * reducer for changes to the authentication
 */
export const settingsReducer: IReducerSpec = {
    reducers: {
      [registerOneClickInstall as any]: (state, payload:ILinkHandling) => {
        // const { url, instructions, subscriber } = payload;
        return util.merge(state, ['enableOCI'], payload);
        // util.setSafe(state, [ 'enableOCI' ], payload);
      }
    },
    defaults: {
      enableOCI: {enableMaps: false, enableModels: false, enablePlaylists: false} as ILinkHandling,
    },
  };


export interface ILinkHandling {
    enableMaps?: boolean;
    enablePlaylists?: boolean;
    enableModels?: boolean;
}