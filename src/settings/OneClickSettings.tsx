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

class OneClickSettings extends ComponentEx<IProps, {}> {
    public render() : JSX.Element {
        const { t } = this.props;
        const { enableMaps, enableModels, enablePlaylists } = (this.props as IProps).linkHandling;
        return (
            <form>
                <FormGroup>
                <ControlLabel>{t('bs:Settings:EnableOCI')}</ControlLabel>
                <HelpBlock>
            {t('bs:Settings:EnableOCIHelp')}
            </HelpBlock>
                <Toggle
                    checked={enableMaps}
                    onToggle={this.toggleMaps}
                >
                    {t("bs:Settings:EnableOCIMaps")}
                    <More id='more-oci-maps' name='OneClick Installs'>
                        {t('bs:Settings:EnableOCIMapsHelp')}
                    </More>
                </Toggle>
                <Toggle
                    checked={enableModels}
                    onToggle={this.toggleModels}
                >
                    {t("bs:Settings:EnableOCIModels")}
                    <More id='more-oci-models' name='OneClick Installs'>
                        {t('bs:Settings:EnableOCIModelsHelp')}
                    </More>
                </Toggle>
                <Toggle
                    checked={enablePlaylists}
                    onToggle={this.togglePlaylists}
                >
                    {t("bs:Settings:EnableOCIPlaylists")}
                    <More id='more-oci-models' name='OneClick Installs'>
                        {t('bs:Settings:EnableOCIPlaylistsHelp')}
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

      private togglePlaylists = (enable: boolean) => {
        const { onSetOneClick } = this.props as IProps;
        onSetOneClick(enable, 'bsplaylist');
      }


}


function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        linkHandling: state.settings['beatvortex']['enableOCI']
    };
  }
  
  function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>, ownProps: IBaseProps): IActionProps {
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
    }
  }
}
  
  export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(OneClickSettings));
