import { IExtensionApi } from "vortex-api/lib/types/api";
import { BeatSaverClient } from "./beatSaverClient";
import { log } from "vortex-api";
import { directDownloadInstall, setDownloadModInfo, handleDownloadInstall } from ".";
import { ProfileClient } from "vortex-ext-common";
import { PROFILE_SETTINGS } from "./meta";
import { ModelSaberClient } from "./modelSaberClient";
import { ILinkHandling } from "./settings";

/**
 * Handles One-Click install links for maps (i.e. the beatsaver protocol). Adds metadata and triggers the download.
 *
 * @remarks
 * This method, on successful completion, will trigger the 'start-download' event to actually perform the download.
 *
 * @param api - The extension API.
 * @param url - The One-Click (beatsaver) URI to install.
 * @param install - currently unused, should always be true
 */
async function handleMapLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
    log('info', `handling link launch from ${url} (install: ${install})`);
    var client = new BeatSaverClient(api);
    var re = /\w+:\/\/([a-f0-9]{4,6}).*/;
    var match = re.exec(url);
    if (!match || match.length != 2) {
        //err
        log('error', 'could not parse URL');
        return;
    }
    var mapKey = match[1];
    log('debug', `fetching details for map ${mapKey}`);
    var details = await client.getMapDetails(mapKey);
    if (details != null) {
        log('debug', `got details from beatsaver API`, details);
        log('info', `downloading ${details.name}`);
        var mapLink = client.buildDownloadLink(details);
        // log('debug', `attempting proxy: ${map}`);
        api.events.emit('start-download',
            [mapLink],
            {
                game: 'beatsaber',
                name: details.name
            },
            null,
            (err: Error, id?: string) => directDownloadInstall(api, details, err, id, (api) => setDownloadModInfo(api.store, id, { ...details, source: 'beatsaber', id: details.id })),
            true);
    } else {
        var allowUnknown = new ProfileClient(api).getProfileSetting(PROFILE_SETTINGS.AllowUnknown, false);
        if (allowUnknown) {
            api.sendNotification({
                message: `Installing unknown map ${mapKey}. No metadata will be available!`,
                type: 'warning',
            })
            //TODO: handle this
        } else {
            api.showErrorNotification(`Could not fetch details for ${mapKey}!`, `We couldn't get details from BeatSaver for that song. It may have been removed or currently unavailable.`, { allowReport: false });
        }
    }
}

/**
 * Handles One-Click install links for models (i.e. the modelsaber protocol). Adds metadata and triggers the download.
 * @remarks
 * This method, on successful completion, will trigger the 'start-download' event to actually perform the download.
 *
 * @param api - The extension API.
 * @param url - The One-Click (modelsaber) URI to install.
 * @param install - currently unused, should always be true
 */
async function handleModelLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
    log('info', `handling link launch from ${url} (install: ${install})`);
    var client = new ModelSaberClient();
    if (!client.isModelSaberLink(url)) {
        log('error', 'could not parse URL', url);
        return null;
    }
    log('debug', `fetching details for link`);
    var modelDetails = await client.getModelDetails(url);
    if (modelDetails != null) {
        log('debug', `got details from modelsaber API`, modelDetails);
        log('info', `downloading ${modelDetails.name}`);
        var modelLink = client.buildDownloadLink(modelDetails);
        // log('debug', `attempting proxy: ${map}`);
        api.events.emit('start-download',
            [modelLink],
            {
                game: 'beatsaber',
                name: modelDetails.name
            },
            null,
            (err: Error, id?: string) => handleDownloadInstall(api, modelDetails, err, id, (api) => setDownloadModInfo(api.store, id, { ...modelDetails, source: 'modelsaber', id: modelDetails.id.toString() })),
            true);
    } else {
        var allowUnknown = new ProfileClient(api).getProfileSetting(PROFILE_SETTINGS.AllowUnknown, false);
        if (allowUnknown) {
            api.sendNotification({
                message: `Installing unknown model ${modelDetails.name}. No metadata will be available!`,
                type: 'warning',
            })
            //TODO: handle this
        } else {
            api.showErrorNotification(`Could not fetch details for ${modelDetails.name}!`, `We couldn't get details from ModelSaber for that link. It may have been removed or currently unavailable.`, { allowReport: false });
        }
    }
}

async function handlePlaylistLinkLaunch(api: IExtensionApi, url: string, install: boolean) {
    log('info', 'handling playlist oneclick install', { url });
    await api.emitAndAwait('install-playlist-url', url);
}

/**
 * An event handler to register/deregister protocols for OneClick installation based on user settings.
 * 
 * @param api - The extension API.
 * @param enableLinks - The link handling settings to apply.
 */
export function registerProtocols(api: IExtensionApi, enableLinks: ILinkHandling) {
    if (enableLinks != undefined) {
        log('debug', 'beatvortex: initialising oneclick', { enableLinks });
        if (enableLinks?.enableMaps) {
            api.registerProtocol('beatsaver', true, (url: string, install: boolean) => handleMapLinkLaunch(api, url, install));
        }
        else if (enableLinks?.enableMaps === false) {
            api.deregisterProtocol('beatsaver');
        }
        if (enableLinks?.enableModels) {
            api.registerProtocol('modelsaber', true, (url: string, install: boolean) => handleModelLinkLaunch(api, url, install));
        }
        else if (enableLinks?.enableModels === false) {
            api.deregisterProtocol('modelsaber');
        }
        if (enableLinks?.enablePlaylists) {
            api.registerProtocol('bsplaylist', true, (url: string, install: boolean) => handlePlaylistLinkLaunch(api, url, install));
        }
        else if (enableLinks?.enablePlaylists === false) {
            api.deregisterProtocol('bsplaylist');
        }
    }
}