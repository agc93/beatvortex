import * as React from 'react';
// import { ControlLabel, FormGroup, HelpBlock } from 'react-bootstrap';
// import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util } from 'vortex-api';
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
        const { t } = this.props;
        const { enableMaps, enableModels } = (this.props as IProps).linkHandling;
        return (
            <form>
                <FormGroup>
                <ControlLabel>{t('Enable OneClick Installations')}</ControlLabel>
                <HelpBlock>
            {t('These settings will register (or deregister) Vortex to handle'
              + ' OneClick links on BeatSaver, BeastSaber and ModelSaber.\n'
              + 'This will conflict with Mod Assistant if you also have it configured for OneClick. '
              + 'Enable OneClick in whichever app you want to use, and disable it in any others.\n')}
            </HelpBlock>
                <Toggle
                    checked={enableMaps}
                    onToggle={this.toggleMaps}
                >
                    {t("Enable OneClick links for maps")}
                    <More id='more-oci-maps' name='OneClick Installs'>
                        {t('Enabling this option will register Vortex to handle the \'beatsaver\' URLs used by OneClick links on BeatSaver and BeastSaber.\n\n')}
                    </More>
                </Toggle>
                <Toggle
                    checked={enableModels}
                    onToggle={this.toggleModels}
                >
                    {t("Enable OneClick links for custom models")}
                    <More id='more-oci-models' name='OneClick Installs'>
                        {t('Enabling this option will register Vortex to handle the \'modelsaber\' URLs used by OneClick links on ModelSaber.\n'
                          + 'This option includes custom notes, walls and avatars.')}
                    </More>
                </Toggle>
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
    // log('debug', 'mapping beatvortex state to props');
    return {
        linkHandling: state.settings['beatvortex']['enableOCI']
    };
  }
  
  function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>, ownProps: IBaseProps): IActionProps {
    // log('debug', 'mapping beatvortex dispatch to props', {ownProps});
    return {
        onSetOneClick: (enable: boolean, scheme: string) => {
            return dispatch(
                registerOneClickInstall(
                    scheme == 'beatsaver' 
                        ? {enableMaps: enable} 
                        : scheme == 'modelsaber' 
                            ? {enableModels: enable} 
                            : scheme == 'bsplaylist' 
                                ? {enablePlaylists: enable} 
                                : null)
                )
            // dispatch(registerOneClickInstall({enableMaps: enable}));
    }
  }
}
  
  export default
    withTranslation(['beatvortex', 'common'])(connect(mapStateToProps, mapDispatchToProps)(OneClickSettings));
