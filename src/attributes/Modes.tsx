// import { byTypeIndex, typeDescription } from './filetypes';

import * as React from 'react';
import { ComponentEx, tooltip, types, util } from 'vortex-api';
import { toTitleCase } from "../util";
import { IExtensionApi, IMod } from 'vortex-api/lib/types/api';

interface IModesProps {
  mod: types.IMod;
}

class MapModes extends ComponentEx<IModesProps, {}> {
  public render() {
    const { mod } = this.props;
    const IconX: any = tooltip.Icon;
    var content: JSX.Element | JSX.Element[];
    var variants = util.getSafe(mod.attributes, ['variants'], []) as string[];
    if (variants.length == 0) {
        content = <div></div>
    } else {
        content = variants
            .map(d => {
            return (
                <IconX
                    className='icon-map-mode'
                    key={d}
                    set='beatvortex'
                    name={d}
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

export default MapModes;

export function modesRenderer(api: IExtensionApi, mod: IMod) {
    // const state = api.store.getState();
    return <MapModes mod={mod} />;
}