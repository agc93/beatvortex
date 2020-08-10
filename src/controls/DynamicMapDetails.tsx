import { tooltip as tt, ToolbarIcon, Icon, util, ComponentEx, FlexLayout, log } from "vortex-api";
import { withTranslation } from 'react-i18next';

import * as React from 'react';
import { IMapDetails, BeatSaverClient } from "../beatSaverClient";
import { traceLog } from "../util";
import { IState, IExtensionApi } from "vortex-api/lib/types/api";
import LoadingSpinner from "./LoadingSpinner";
import { MapDetails } from ".";

interface IBaseProps {
  ident: string;
  api: IExtensionApi;
}

interface IComponentState {
  details?: IMapDetails;
  isLoading: boolean;
}

type IProps = IBaseProps;

class DynamicMapDetails extends ComponentEx<IProps, IComponentState> {
  constructor(props) {
    super(props);
    
    this.state = {
        isLoading: true
    };
  }

  public render(): JSX.Element {
    // const { t, ident } = this.props;
    const {details, isLoading} = this.state;
    return (
    <div className='map-details-container' style={{height: '100%'}}>
        {
            isLoading
            ? <LoadingSpinner />
            : <MapDetails details={details} />
        }
    </div>
    );
  }

    async componentDidMount() {
        this.setState({isLoading: true});
        traceLog('dynamic map details mounted. fetching!')
        var { ident, api } = this.props;
        var { details } = this.state;
        if (ident && !details) {
            await this.refreshMap();
        }
        this.setState({isLoading: false});
    }

    async componentDidUpdate(prevProps: IProps) {
        if (prevProps.ident != this.props.ident) {
            this.setState({isLoading: true, details: undefined});
            await this.refreshMap();
        }
    }

    private async refreshMap() {
        var { api, ident } = this.props;
        var client = new BeatSaverClient(api);
        var details = await client.getMapDetails(ident);
        this.setState({details, isLoading: false});

    }
}

export default
  withTranslation([ 'beatvortex', 'common' ])(DynamicMapDetails) as React.ComponentClass<IBaseProps>;
