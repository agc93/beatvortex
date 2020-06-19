import { IExtensionApi, IDialogResult } from "vortex-api/lib/types/api";
import { actions, selectors, util } from "vortex-api";
import { GAME_ID } from ".";
import { BeatModsClient } from "./beatModsClient";
import { traceLog } from "./util";

interface ICategory {
    name: string;
    parentCategory: string;
    order: number;
  }

interface ICategoryDictionary {
    [id: string]: ICategory;
  }

export function checkBeatModsCategories(api: IExtensionApi): boolean {
    var categories: ICategoryDictionary = util.getSafe(api.getState().persistent, ['categories', GAME_ID], undefined)
    if (categories == undefined) {
        //Nexus hasn't even run yet, so our categories are either a) not there or b) soon to be not there.
        return false;
    } else {
        return categories.hasOwnProperty("BeatMods");
    }
}

export function updateCategories(api: IExtensionApi, isUpdate: boolean) : void {
    if (selectors.activeGameId(api.store.getState()) != GAME_ID) {
        return;
    }
    let askUser: Promise<boolean>;
    if (isUpdate) {
        askUser = api.store.dispatch(
            actions.showDialog('question', 'Load BeatMods Categories?', {
                text: 'If you continue, the categories used by BeatMods will REPLACE the existing mod categories and you will lose any customisations you have made.',
            }, [{ label: 'Cancel' }, { label: 'Retrieve' }]))
            .then((result: IDialogResult) => {
                return result.action === 'Retrieve';
            });
    } else {
        askUser = Promise.resolve(true);
    }

    askUser.then(toContinue => {
        if (toContinue) {
            var categories: ICategoryDictionary = util.getSafe(api.getState().persistent, ['categories', GAME_ID], undefined)
            if (categories == undefined) {
                //Nexus hasn't run yet, so our changes would get clobbered. returning.
                return;
            } else {
                var existingCategories = Object.keys(categories);
                traceLog('found existing categories', {count: existingCategories.length, names: existingCategories});
                retrieveCategories(api, existingCategories.length)
                .then(cat => {
                    var mergedCategories = {...categories,...cat};
                    api.events.emit('update-categories', GAME_ID, mergedCategories, isUpdate);
                })
            }
        } else {
            return;
        }
    });
}

export async function retrieveCategories(api: IExtensionApi, startingCount: number = 0): Promise<ICategoryDictionary> {
    
    var client = new BeatModsClient(api);
    var categories = await client.getCategories();
    const res: ICategoryDictionary = {};
    let counter: number = startingCount + 2;
    res["BeatMods"] = {
        name: "BeatMods",
        order: startingCount + 1,
        parentCategory: undefined
    };
    categories.forEach((category: string) => {
        res[category] = {
            name: category,
            order: counter,
            parentCategory: "BeatMods"
        };
        ++counter;
    });
    return res;
    

}