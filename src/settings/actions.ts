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

export const enableMetaserverIntegration =
  createAction('BS_ENABLE_META', (serverSettings: IMetaserverSettings) => serverSettings);

export const enablePreviewFeatures =
  createAction('BS_ENABLE_PREVIEW', (previewSettings: IPreviewSettings) => previewSettings);

/**
 * reducer for changes to the authentication
 */
export const settingsReducer: IReducerSpec = {
    reducers: {
      [registerOneClickInstall as any]: (state, payload:ILinkHandling) => {
        // const { url, instructions, subscriber } = payload;
        return util.merge(state, ['enableOCI'], payload);
        // util.setSafe(state, [ 'enableOCI' ], payload);
      },
      [enableMetaserverIntegration as any]: (state, payload: IMetaserverSettings) => {
        return util.merge(state, ['metaserver'], payload);
      },
      [enablePreviewFeatures as any]: (state, payload: IPreviewSettings) => {
        return util.merge(state, ['preview'], payload);
      }
    },
    defaults: {
      enableOCI: {enableMaps: false, enableModels: false, enablePlaylists: false} as ILinkHandling,
      metaserver: {enableServer: true, serverUrl: 'https://meta.beatvortex.dev/'} as IMetaserverSettings,
      preview: { enablePlaylistManager: false, enableUpdates: false, enableCategories: false } as IPreviewSettings
    },
  };


export interface ILinkHandling {
    enableMaps?: boolean;
    enablePlaylists?: boolean;
    enableModels?: boolean;
}

export interface IMetaserverSettings {
  enableServer?: boolean;
  serverUrl?: string;
}

export interface IPreviewSettings {
  enablePlaylistManager?: boolean;
  enableUpdates?: boolean;
  enableCategories?: boolean;
}