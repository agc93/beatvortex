// import { byTypeIndex, typeDescription } from './filetypes';

import * as React from 'react';
import { ComponentEx, tooltip, types, util } from 'vortex-api';
import { toTitleCase } from "../util";
import { IExtensionApi, IMod } from 'vortex-api/lib/types/api';

const diffSort = ['easy', 'normal', 'hard', 'expert', 'expertplus'];

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
                return diffSort.indexOf(a.toLowerCase()) - diffSort.indexOf(b.toLowerCase());
            })
            .map(d => {
            return (
                <IconX
                    key={d}
                    set='beatvortex'
                    name={d.toLowerCase()}
                    tooltip={toTitleCase(d)}
                />
            )
        });
    }


    return (
      <div className='bs-attribute-icons'>
        {content}
      </div>
    );
  }
}

export default MapDifficulties;

export function difficultiesRenderer(api: IExtensionApi, mod: IMod) {
    const state = api.store.getState();
    return <MapDifficulties mod={mod} />;
}