import { log, util } from "vortex-api";
import { IExtensionApi, AttributeExtractor } from "vortex-api/lib/types/api";
import { GAME_ID } from ".";
import { traceLog } from "./util";

/*
Extractors (in BeatVortex specifically) should *only* be used for where concepts in an external source and in Vortex exist, but don't align.

For example, we use it to map BeatMods's _id field into Vortex's fileId.
Likewise we *could* use it to map a field in the BeatSaver response to the version field.
We *do not* use it for primary metadata because installations from files won't have that.
*/


export const beatModsExtractor = (modInfo: any, modPath: string):  Promise<any> => {
    let downloadGame: string = util.getSafe(modInfo, ['download', 'game'], util.getSafe(modInfo, ['download', 'modInfo', 'game'], undefined));
    traceLog('running attribute extractor', {game: downloadGame});
    if (downloadGame && downloadGame == GAME_ID) {
        return Promise.resolve({
            fileId: util.getSafe(modInfo, ['download', 'modInfo', 'beatmods', '_id'], undefined)
          });
    } else {
        return Promise.resolve({});
    }
}