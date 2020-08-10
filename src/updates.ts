import { IExtensionApi, IMod } from "vortex-api/lib/types/api";
import { actions, util, log } from "vortex-api";
import { BeatModsClient, IModDetails } from "./beatModsClient";
import * as semver from "semver";
import { traceLog } from "./util";
import { GAME_ID, directDownloadInstall, setDownloadModInfo } from ".";

const UPDATE_CHECK_DELAY = 60 * 60 * 1000;

export async function checkForBeatModsUpdates(api: IExtensionApi, gameId: string, mods: { [id: string]: IMod }) {
    if (gameId !== GAME_ID) {
        return Promise.resolve();
    }
    var now = Date.now()
    var store = api.store;
    var client = new BeatModsClient();
    var filteredMods = Object.values(mods)
        .filter(mod => {
            var versionAttr = util.getSafe(mod.attributes, ['version'], undefined);
            return versionAttr && (semver.valid(versionAttr) != null)
        })
        .filter(mod => util.getSafe(mod.attributes, ['source'], undefined) === 'beatmods');
        // .filter(mod =>(now - (util.getSafe(mod.attributes, ['lastUpdateTime'], 0) || 0)) > UPDATE_CHECK_DELAY);
    log('debug', 'running beatvortex update check', {count: filteredMods.length});
    // const filteredIds = new Set(mods.map(mod => mod.id));
    if (filteredMods.length == 0) {
        return Promise.resolve();
    }
    let pos = 0;
    const progress = () => {
    store.dispatch(actions.addNotification({
        id: 'bs-check-update-progress',
        type: 'activity',
        message: 'Checking Beat Saber mods for update',
        progress: (pos * 100) / filteredMods.length,
    }));
    ++pos;
    };
    progress();
    var modList = await Promise.all(filteredMods.map(async (mod: IMod) => {
        var modId = util.getSafe(mod.attributes, ['modId'], '');
        var versions = await client.getModVersionsByName(util.getSafe(mod.attributes, ['modId'], null));
        traceLog(`pulled data for ${modId}`, {updates: versions.length});
        return {mod, versions}
    }));
    var updates = modList.filter(su => {
        if (!su.versions || su.versions.length == 0) {
            return false;
        }
        su.versions.sort((a,b) => semver.rcompare(a.version, b.version));
        return semver.gt(su.versions[0].version, util.getSafe(su.mod.attributes, ['version'], '0.0.0'))
    })
    .map(su => {
        return {update: su.versions[0], mod: su.mod};
    });
    for await (const modSummary of updates) {
        log('info', 'found update for mod', {mod: modSummary.mod.id, update: modSummary.update.version})
        store.dispatch(actions.setModAttribute(gameId, modSummary.mod.id, 'newestVersion', modSummary.update.version));
        store.dispatch(actions.setModAttribute(gameId, modSummary.mod.id, 'newestFileId', modSummary.update._id));
        store.dispatch(actions.setModAttribute(gameId, modSummary.mod.id, 'lastUpdateTime', now));
        progress();
    };
    store.dispatch(actions.dismissNotification('bs-check-update-progress'));
}

export async function installBeatModsUpdate(api: IExtensionApi, gameId: string, modId: string) {
    if (gameId !== GAME_ID) {
        return Promise.resolve();
    }
    var mods = api.getState().persistent.mods[GAME_ID];
    var mod = mods[modId] ?? Object.values(mods).find(m => util.getSafe(m.attributes, ['modId'], '') == modId);
    if (util.getSafe(mod.attributes, ['source'], undefined) !== 'beatmods') {
        return Promise.resolve();
    }
    var client = new BeatModsClient();
    var versions = await client.getModVersionsByName(modId);
    var update = versions.find(v => v._id == util.getSafe(mod.attributes, ['newestFileId'], undefined));
    var downloadLinks = BeatModsClient.getDownloads(update);
    log('debug', 'emitting download events for selected mod', { mod: update.name, links: downloadLinks});
    api.events.emit('start-download', 
        downloadLinks, 
        {
            game: 'beatsaber',
            source: 'beatmods',
            name: update.name
        }, 
        update.name, 
        (err: Error, id?: string) => {
            directDownloadInstall(api, update, err, id, (api) => {
                setDownloadModInfo(api.store, id, {...update, source: 'beatmods'});
            });
        }, 
        true);
}