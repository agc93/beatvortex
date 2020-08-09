import * as React from 'react';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import path = require('path');
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util, selectors, actions } from 'vortex-api';
import { enableBSIPATweaks, IBSIPASettings } from './actions';
import { IState, IProfile, IExtensionApi } from 'vortex-api/lib/types/api';
import { GAME_ID } from '..';
import { isGameManaged } from '../util';
import { Button } from 'react-bootstrap';
import { BSIPAConfigManager } from '../ipa';
const { HelpBlock, FormGroup, ControlLabel, InputGroup, FormControl } = require('react-bootstrap');

interface IBaseProps {
    api: IExtensionApi;
}

interface IConnectedProps {
    bsipaSettings: IBSIPASettings,
    installPath: string|undefined,
    profiles: {[profileId: string]: IProfile}
}

interface IActionProps {
    onDisableYeeting: (enable: boolean) => void;
    onDisableUpdates: (enable: boolean) => void;
    onEnableYeetDetection: (enable: boolean) => void;
    onEnableConfigTweak: (enable: boolean) => void;
    onResetConfig: () => void;
}

type IProps = IConnectedProps & IActionProps & IBaseProps;

class BSIPASettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t, bsipaSettings, onDisableUpdates, onDisableYeeting, onEnableYeetDetection, onEnableConfigTweak, installPath, profiles } = this.props;
        const { disableUpdates, disableYeeting, enableYeetDetection, applyToConfig } = bsipaSettings;
        if (installPath == undefined || !isGameManaged(profiles)) {
            /* this happens when the extension is installed but either
            ** a) Beat Saber isn't, or
            ** b) it's a dummy install (hey Picky!)
            ** c) it's not managed, but has been before or something. 
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
                    <Toggle
                        style={{ marginTop: 10 }}
                        checked={applyToConfig}
                        onToggle={onEnableConfigTweak}
                    >
                        {t("bs:Settings:BSIPAConfigFile")}
                        <More id='more-bsipa-configfile' name='Appy to BSIPA Configuration'>
                            {t('bs:Settings:BSIPAConfigFileHelp')}
                        </More>
                    </Toggle>
                    <HelpBlock>
                        {t('bs:Settings:BSIPARestoreSettings')}
                    </HelpBlock>
                </FormGroup>
                {/* <hr />
                <FormGroup>
                    <HelpBlock>
                        Your BSIPA Configuration file is at {configPath}
                    </HelpBlock>
                    <div style={{ marginTop: 10 }}>
                        {t('bs:Settings:BSIPAReset')}
                        <More id='more-bs-config-reset' name={t('bs:Settings:BSIPAReset')}>
                            {t('bs:Settings:BSIPAResetHelp')}
                        </More>
                        <Button
                            id='bs-reset-config'
                            onClick={this.resetConfig}
                            style={{ marginLeft: 5 }}
                        >
                            {t('Force Reset')}
                        </Button>
                    </div>
                </FormGroup> */}
            </form>
        );
    }

    private resetConfig = () => {
        const {onResetConfig, api, installPath } = this.props;
        BSIPAConfigManager.deleteConfig(path.join(installPath, 'User Data', 'Beat Saber IPA.json'));
        onResetConfig();
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
        },
        onEnableConfigTweak: (enable: boolean) => {
            return dispatch(enableBSIPATweaks({applyToConfig: enable}));
        },
        onResetConfig: () => {
            return dispatch(actions.addNotification({
                title: 'BSPIA configuration cleared',
                message: 'Your BSIPA config file will be regenerated next time you run the game.',
                type: 'success'
            }));
        }
    }
}

export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(BSIPASettings));
