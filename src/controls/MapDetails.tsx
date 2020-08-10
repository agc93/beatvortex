import { tooltip as tt, ToolbarIcon, Icon, util, ComponentEx, FlexLayout } from "vortex-api";
import { withTranslation } from 'react-i18next';

import * as React from 'react';
import { IMapDetails } from "../beatSaverClient";

export interface IBaseProps {
  details: IMapDetails;
}

interface IComponentState {
  input: string;
}

type IProps = IBaseProps;

class MapDetails extends ComponentEx<IProps, IComponentState> {
  constructor(props) {
    super(props);

    this.state = {
      input: props?.initialValue ?? '',
    };
  }

  public render(): JSX.Element {
    const { t, details } = this.props;
    return (
    // <div className='map-details'>
        this.renderDescription(details)
    // </div>
    );
  }

    private renderDescription = (detail: IMapDetails) => {
        var d = new Date(detail.uploaded)
        return (
            <FlexLayout type="column">
                <FlexLayout.Fixed>
                    <FlexLayout type="column">
                        <div className="pv-map-meta">
                            <div className="pv-map-meta-title">{detail.name} by {detail.metadata?.levelAuthorName ?? 'an unknown user'}</div>
                            <div className="pv-map-meta-extra">
                                <div className="pv-map-meta-source">Uploaded to BeatSaver as {detail.key} on {d.toLocaleDateString()}</div>
                                <div className="pv-map-meta-difficulties">Difficulties: {this.renderDifficulties(detail)}</div>
                            </div>
                        </div>
                    </FlexLayout>
                </FlexLayout.Fixed>
                <FlexLayout.Flex>
                    <div className='pv-map-description'>
                        {detail.description}
                    </div>
                </FlexLayout.Flex>
            </FlexLayout>
        )
    }

    private renderDifficulties = (detail: IMapDetails) => {
        var difficultyMap: {abbrev: string, present: boolean}[] = [
            {abbrev: "E", present: detail.metadata.difficulties.easy},
            {abbrev: "N", present: detail.metadata.difficulties.normal},
            {abbrev: "H", present: detail.metadata.difficulties.hard},
            {abbrev: "Ex", present: detail.metadata.difficulties.expert},
            {abbrev: "Ex+", present: detail.metadata.difficulties.expertPlus}
        ];
        return (
            difficultyMap.map(dm => {
                return (
                    <span className="pv-difficulty-name">{dm.abbrev}:<Icon name={dm.present
                        ? 'checkbox-checked' : 'checkbox-unchecked'} /> </span>
                )
            })
        );
    }
}

export default
  withTranslation([ 'beatvortex', 'common' ])(MapDetails) as React.ComponentClass<IBaseProps>;
