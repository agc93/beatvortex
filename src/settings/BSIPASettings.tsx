import * as React from 'react';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util } from 'vortex-api';
import { enableBSIPATweaks, IBSIPASettings } from './actions';
import { IState } from 'vortex-api/lib/types/api';
const { HelpBlock, FormGroup, ControlLabel, InputGroup, FormControl } = require('react-bootstrap');

interface IConnectedProps {
    bsipaSettings: IBSIPASettings
}

interface IActionProps {
    onDisableYeeting: (enable: boolean) => void;
    onDisableUpdates: (enable: boolean) => void;
}

type IProps = IConnectedProps & IActionProps;

class BSIPASettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t, bsipaSettings, onDisableUpdates, onDisableYeeting } = this.props;
        const { disableUpdates, disableYeeting } = bsipaSettings;
        return (
            <form>
                <FormGroup>
                    <ControlLabel>{t('bs:Settings:BSIPATitle')}</ControlLabel>
                    <HelpBlock>
                        {t('bs:Settings:BSIPAHelp')}
                    </HelpBlock>
                    <Toggle
                        checked={disableYeeting}
                        onToggle={onDisableYeeting}
                    >
                        {t("bs:Settings:BSIPAYeeting")}
                        <More id='more-bsipa-yeeting' name='BSIPA Mod Yeeting'>
                            {t('bs:Settings:BSIPAYeetingHelp')}
                        </More>
                    </Toggle>
                    <Toggle
                        checked={disableUpdates}
                        onToggle={onDisableUpdates}
                    >
                        {t("bs:Settings:BSIPAUpdates")}
                        <More id='more-bsipa-updates' name='BSIPA Mod Updates'>
                            {t('bs:Settings:BSIPAUpdatesHelp')}
                        </More>
                    </Toggle>
                </FormGroup>
                <HelpBlock>
                    {t('bs:Settings:BSIPARestoreSettings')}
                </HelpBlock>
            </form>
        );
    }
}


function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        bsipaSettings: state.settings['beatvortex']['bsipa']
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>): IActionProps {
    // log('debug', 'mapping beatvortex dispatch to props', {ownProps});
    return {
        onDisableUpdates: (disable: boolean) => {
            return dispatch(enableBSIPATweaks({disableUpdates: disable}));
        },
        onDisableYeeting: (disable: boolean) => {
            return dispatch(enableBSIPATweaks({disableYeeting: disable}));
        }
    }
}

export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(BSIPASettings));
