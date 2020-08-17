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

export const enableBSIPATweaks =
  createAction('BS_BSIPA_CONFIG', (bsipaSettings: IBSIPASettings) => bsipaSettings);

export const setSyncSettings =
  createAction('BS_SYNC_SETTING', (syncSettings: ISyncSettings ) => syncSettings);

export const acceptTerms =
  createAction('BS_ACCEPT_TERMS', (accept: boolean) => accept);

export const enableDirectDownloader =
  createAction('BS_AXIOS_DOWNLOAD', (enable: boolean) => enable);

/**
 * reducer for changes to the authentication
 */
export const settingsReducer: IReducerSpec = {
    reducers: {
      [registerOneClickInstall as any]: (state, payload:ILinkHandling) => {
        return util.merge(state, ['enableOCI'], payload);
      },
      [enableMetaserverIntegration as any]: (state, payload: IMetaserverSettings) => {
        return util.merge(state, ['metaserver'], payload);
      },
      [enablePreviewFeatures as any]: (state, payload: IPreviewSettings) => {
        return util.merge(state, ['preview'], payload);
      },
      [enableBSIPATweaks as any]: (state, payload: IBSIPASettings) => {
        return util.merge(state, ['bsipa'], payload);
      },
      [setSyncSettings as any]: (state, payload: ISyncSettings) => {
        return util.merge(state, ['sync'], payload);
      },
      [acceptTerms as any]: (state, payload: boolean) => {
        return util.setSafe(state, ['skipTerms'], payload);
      },
      [enableDirectDownloader as any]: (state, payload: boolean) => {
        return util.setSafe(state, ['downloadDirect'], payload);
      }
    },
    defaults: {
      enableOCI: {enableMaps: false, enableModels: false, enablePlaylists: false} as ILinkHandling,
      metaserver: {enableServer: true, serverUrl: 'https://meta.beatvortex.dev'} as IMetaserverSettings,
      preview: { enablePlaylistManager: false } as IPreviewSettings,
      bsipa: { enableYeetDetection: true, disableUpdates: true, applyToConfig: false } as IBSIPASettings,
      sync: { syncOnDeploy: false } as ISyncSettings,
      skipTerms: false,
      downloadDirect: false
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
  enableSync?: boolean;
}

export interface IBSIPASettings {
  enableYeetDetection?: boolean;
  disableUpdates?: boolean;
  disableYeeting?: boolean;
  applyToConfig?: boolean;
}

export interface ISyncSettings {
  beastSaberUsername?: string;
  syncOnDeploy?: boolean;
}