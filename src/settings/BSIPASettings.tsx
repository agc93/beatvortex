import * as React from 'react';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import path = require('path');
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util, selectors } from 'vortex-api';
import { enableBSIPATweaks, IBSIPASettings } from './actions';
import { IState, IProfile } from 'vortex-api/lib/types/api';
import { GAME_ID } from '..';
import { isGameManaged } from '../util';
const { HelpBlock, FormGroup, ControlLabel, InputGroup, FormControl } = require('react-bootstrap');

interface IConnectedProps {
    bsipaSettings: IBSIPASettings,
    installPath: string|undefined,
    profiles: {[profileId: string]: IProfile}
}

interface IActionProps {
    onDisableYeeting: (enable: boolean) => void;
    onDisableUpdates: (enable: boolean) => void;
    onEnableYeetDetection: (enable: boolean) => void;
}

type IProps = IConnectedProps & IActionProps;

class BSIPASettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t, bsipaSettings, onDisableUpdates, onDisableYeeting, onEnableYeetDetection, installPath, profiles } = this.props;
        const { disableUpdates, disableYeeting, enableYeetDetection } = bsipaSettings;
        if (installPath == undefined || !isGameManaged(profiles)) {
            /* this happens when the extension is installed but either
            ** a) Beat Saber isn't, or
            ** b) it's not managed, but has been before or something. 
            ** in short: this needs improving.
            */
            return (<></>)
        }
        var configPath = path.join(installPath, 'UserData', 'Beat Saber IPA.json');
        return (
            <form>
                <FormGroup>
                    <ControlLabel>{t('bs:Settings:BSIPATitle')}</ControlLabel>
                    <Toggle
                        checked={enableYeetDetection}
                        onToggle={onEnableYeetDetection}
                        >
                            {t("bs:Settings:BSIPAYeetDetection")}
                            <More id='more-bsipa-yeetdetection' name='BSIPA Mod Yeeting'>
                                {t('bs:Settings:BSIPAYeetDetectionHelp')}
                            </More>
                        </Toggle>
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
                <HelpBlock>
                    Your BSIPA Configuration file is at {configPath}
                </HelpBlock>
            </form>
        );
    }
}


function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        bsipaSettings: state.settings['beatvortex']['bsipa'],
        installPath: util.getSafe(state.settings, ['gameMode', 'discovered', GAME_ID, 'path'], undefined),
        profiles: util.getSafe(state.persistent, ['profiles'], {})
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
        },
        onEnableYeetDetection: (enable: boolean) => {
            return dispatch(enableBSIPATweaks({enableYeetDetection: enable}));
        }
    }
}

export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(BSIPASettings));
