import * as React from 'react';
// import { ControlLabel, FormGroup, HelpBlock } from 'react-bootstrap';
// import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Toggle, log, ComponentEx } from 'vortex-api';
import { ILinkHandling, registerOneClickInstall } from './actions';
import { IState } from 'vortex-api/lib/types/api';
const { HelpBlock, FormGroup, ControlLabel } = require('react-bootstrap');

interface IConnectedProps {
    linkHandling: ILinkHandling;
}

interface IActionProps {
    onSetOneClick: (enable: boolean, scheme: string) => void;
}

interface IBaseProps {
    enableMapLinks: boolean;
    enablePlaylistLinks: boolean;
    enableModelLinks: boolean;
}

type IProps = IBaseProps & IConnectedProps & IActionProps;

/* interface IBeatModsListState {
    mods: IModDetails[];
    selected?: string; //mod ID
    gameVersion: string;
    availableVersions: string[];
    isLoading: boolean;
    searchFilter: string;
}
 */
class OneClickSettings extends ComponentEx<IProps, {}> {
    public render() : JSX.Element {
        log('debug', 'rendering OneClick Settings');
        const { enableMaps, enableModels } = (this.props as IProps).linkHandling;
        return (
            <form>
                <FormGroup>
                <ControlLabel>Enable OneClick Installations</ControlLabel>
                <Toggle
                    checked={enableMaps}
                    onToggle={this.toggleMaps}
                >Enable OneClick links for maps</Toggle>
                <Toggle
                    checked={enableModels}
                    onToggle={this.toggleModels}
                >Enable OneClick links for custom models</Toggle>
                {/* <HelpBlock>
            {('By default Vortex will only remove empty directories during deployment '
              + 'if the game or related tools would otherwise not work correctly.\n'
              + 'Usually empty directories cause no harm and cleaning them up takes '
              + 'some extra time during deployment so '
              + 'we advise you only enable this option if you\'re experience problems we didn\'t '
              + 'anticipate. In that case please also inform us.')}
          </HelpBlock> */}
                </FormGroup>
            </form>
        );
    }

    private toggleMaps = (enable: boolean) => {
        const { onSetOneClick } = this.props as IProps;
        onSetOneClick(enable, 'beatsaver');
      }
    
      private toggleModels = (enable: boolean) => {
        const { onSetOneClick } = this.props as IProps;
        onSetOneClick(enable, 'modelsaber');
      }


}


function mapStateToProps(state: IState): IConnectedProps {
    log('debug', 'mapping beatvortex state to props');
    return {
        linkHandling: state.settings['beatvortex']['enableOCI']
    };
  }
  
  function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>, ownProps: IBaseProps): IActionProps {
    log('debug', 'mapping beatvortex dispatch to props', {ownProps});
    return {
        onSetOneClick: (enable: boolean, scheme: string) => {
            /* return dispatch(
                registerOneClickInstall(
                    scheme == 'beatsaver' 
                        ? {enableMaps: enable} 
                        : scheme == 'modelsaber' 
                            ? {enableModels: enable} 
                            : scheme == 'bsplaylist' 
                                ? {enablePlaylists: enable} 
                                : null)
                )} */
            dispatch(registerOneClickInstall({enableMaps: enable}));
    }
  }
}
  
  export default
    connect(mapStateToProps, mapDispatchToProps)(OneClickSettings);
