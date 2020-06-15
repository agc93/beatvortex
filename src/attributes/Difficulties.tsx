// import { byTypeIndex, typeDescription } from './filetypes';

import * as React from 'react';
import { ComponentEx, tooltip, types, util } from 'vortex-api';
import { toTitleCase } from "../util";
import { IExtensionApi, IMod } from 'vortex-api/lib/types/api';

const diffSort = ['easy', 'normal', 'hard', 'expert', 'expertPlus'];

interface IDifficultiesProps {
  mod: types.IMod;
}

class MapDifficulties extends ComponentEx<IDifficultiesProps, {}> {
  public render() {
    const { mod } = this.props;
    const IconX: any = tooltip.Icon;
    var content: JSX.Element | JSX.Element[];
    var difficulties = util.getSafe(mod.attributes, ['difficulties'], []) as string[];
    if (difficulties.length == 0) {
        content = <div></div>
    } else {
        content = difficulties
            .sort((a, b) => {
                return diffSort.indexOf(a) - diffSort.indexOf(b);
            })
            .map(d => {
            return (
                <IconX
                    key={d}
                    set='beatvortex'
                    name={d}
                    tooltip={toTitleCase(d)}
                />
            )
        });
    }


    return (
      <div className='bs-difficulties-icons'>
        {content}
      </div>
    );
  }
}

export default MapDifficulties;

export function difficultiesRenderer(api: IExtensionApi, mod: IMod) {
    const state = api.store.getState();
    /* if ((mod.state === 'installed')
        && (util.getSafe(mod, ['attributes', 'content'], undefined) === undefined)
        && (mod.installationPath !== undefined)) {
        setTimeout(() => updateContent(state, mod), 0);
    } */
    return <MapDifficulties mod={mod} />;
}