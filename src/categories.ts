import { IExtensionApi, IDialogResult } from "vortex-api/lib/types/api";
import { actions, selectors } from "vortex-api";
import { GAME_ID } from ".";
import { BeatModsClient } from "./beatModsClient";

interface ICategory {
    name: string;
    parentCategory: string;
    order: number;
  }

interface ICategoryDictionary {
    [id: string]: ICategory;
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
            retrieveCategories(api)
                .then(cat => {
                    api.events.emit('update-categories', GAME_ID, cat, isUpdate);
                })
        } else {
            return;
        }
    });
}

export async function retrieveCategories(api: IExtensionApi): Promise<ICategoryDictionary> {
    
    var client = new BeatModsClient(api);
    var categories = await client.getCategories();
    const res: ICategoryDictionary = {};
    let counter: number = 2;
    res["BeatMods"] = {
        name: "BeatMods",
        order: 1,
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