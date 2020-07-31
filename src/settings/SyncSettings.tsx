import * as React from 'react';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util, FormTextItem } from 'vortex-api';
import { IPreviewSettings, ISyncSettings, setSyncSettings } from './actions';
import { IState, IProfile } from 'vortex-api/lib/types/api';
import { isGameManaged, getUserName } from '../util';
import { InputButton } from '../controls';
const { HelpBlock, FormGroup, ControlLabel, InputGroup, FormControl } = require('react-bootstrap');

interface IConnectedProps {
    previewSettings: IPreviewSettings;
    syncSettings: ISyncSettings;
    profiles: {[profileId: string]: IProfile}
    userName: string;
}

interface IActionProps {
    onSetUsername: (name: string) => void;
}

type IProps = IConnectedProps & IActionProps;

class SyncSettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t, previewSettings, syncSettings, profiles, onSetUsername, userName } = this.props;
        const { beastSaberUsername } = syncSettings;
        return (
            isGameManaged(profiles)
            ? <form>
                <FormGroup>
                    <ControlLabel>{t('bs:Settings:SyncHelp')}</ControlLabel>
                    <HelpBlock>
                        {t('bs:Settings:PreviewFeaturesHelp')}
                    </HelpBlock>
                    <InputButton
                        initialValue={beastSaberUsername}
                        label="BeastSaber Username"
                        id='input-set-username'
                        key='input-set-username'
                        tooltip={t('Set your BeastSaber username')}
                        onConfirmed={onSetUsername}
                    />
                    {/* <Toggle
                        checked={enableSyncOnDeploy}
                        onToggle={onEnableSyncOnDeploy}
                    >
                        {t("bs:Settings:EnablePreviewPlaylists")}
                        <More id='more-oci-maps' name='Playlist Management Preview'>
                            {t('bs:Settings:EnablePreviewPlaylistsHelp')}
                        </More>
                    </Toggle> */}
                </FormGroup>
            </form>
            : <></>
        );
    }

    private handleChange = (key, value) => {
        log('debug', 'handling username change');
        this.props.onSetUsername(value);
    }


}


function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        previewSettings: state.settings['beatvortex']['preview'],
        profiles: util.getSafe(state.persistent, ['profiles'], {}),
        syncSettings: util.getSafe<ISyncSettings>(state.settings, ['beatvortex','sync'], {}),
        userName: getUserName(state)
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>): IActionProps {
    // log('debug', 'mapping beatvortex dispatch to props', {ownProps});
    return {
        onSetUsername: (name: string) => {
            return dispatch(setSyncSettings({beastSaberUsername: name}));
        }
    }
}

export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(SyncSettings));
