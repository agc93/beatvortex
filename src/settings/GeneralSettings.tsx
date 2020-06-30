import * as React from 'react';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util } from 'vortex-api';
import { IMetaserverSettings, enableMetaserverIntegration } from './actions';
import { IState } from 'vortex-api/lib/types/api';
const { HelpBlock, FormGroup, ControlLabel, InputGroup, FormControl } = require('react-bootstrap');

interface IConnectedProps {
    metaSettings: IMetaserverSettings;
}

interface IActionProps {
    onSetMetaSettings: (enable: boolean, server?: string) => void;
}

interface IComponentState {
    enableServer: boolean;
    serverUrl: boolean;
}

type IProps = IConnectedProps & IActionProps;

class GeneralSettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t } = this.props;
        const { enableServer, serverUrl } = (this.props as IProps).metaSettings;
        return (
            <form>
                <FormGroup>
                    <ControlLabel>{t('bs:Settings:EnableMetaserverTitle')}</ControlLabel>
                    <HelpBlock>
                        {t('bs:Settings:EnableMetaserverHelp')}
                    </HelpBlock>
                    <Toggle
                        checked={enableServer}
                        onToggle={this.toggleServer}
                    >
                        {t("bs:Settings:EnableMetaserver")}
                    </Toggle>
                </FormGroup>
            </form>
        );
    }

    private getServerUrl = (serverUrl: string) => {
        const { metaSettings } = this.props as IProps;
        return serverUrl ?? metaSettings.serverUrl ?? '';
    }

    private toggleServer = (enable: boolean) => {
        const { onSetMetaSettings, metaSettings } = this.props as IProps;
        onSetMetaSettings(enable, metaSettings.serverUrl);
    }


}


function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        metaSettings: state.settings['beatvortex']['metaserver']
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>): IActionProps {
    // log('debug', 'mapping beatvortex dispatch to props', {ownProps});
    return {
        onSetMetaSettings: (enable: boolean, server?: string) => {
            log('debug', 'beatvortex: setting metaserver integration', { enable, server });
            return dispatch(enableMetaserverIntegration({ enableServer: enable, serverUrl: server }));
        }
    }
}

export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(GeneralSettings));
