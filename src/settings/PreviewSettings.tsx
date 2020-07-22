import * as React from 'react';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util } from 'vortex-api';
import { enablePreviewFeatures, IPreviewSettings } from './actions';
import { IState, IProfile } from 'vortex-api/lib/types/api';
import { isGameManaged } from '../util';
const { HelpBlock, FormGroup, ControlLabel, InputGroup, FormControl } = require('react-bootstrap');

interface IConnectedProps {
    previewSettings: IPreviewSettings;
    profiles: {[profileId: string]: IProfile}
}

interface IActionProps {
    onEnablePlaylists: (enable: boolean) => void;
}

type IProps = IConnectedProps & IActionProps;

class PreviewSettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t, previewSettings, onEnablePlaylists, profiles } = this.props;
        const { enablePlaylistManager: enablePlaylists } = previewSettings;
        return (
            isGameManaged(profiles)
            ? <form>
                <FormGroup>
                    <ControlLabel>{t('bs:Settings:PreviewFeatures')}</ControlLabel>
                    <HelpBlock>
                        {t('bs:Settings:PreviewFeaturesHelp')}
                    </HelpBlock>
                    <Toggle
                        checked={enablePlaylists}
                        onToggle={onEnablePlaylists}
                    >
                        {t("bs:Settings:EnablePreviewPlaylists")}
                        <More id='more-oci-maps' name='Playlist Management Preview'>
                            {t('bs:Settings:EnablePreviewPlaylistsHelp')}
                        </More>
                    </Toggle>
                </FormGroup>
            </form>
            : <></>
        );
    }
}


function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        previewSettings: state.settings['beatvortex']['preview'],
        profiles: util.getSafe(state.persistent, ['profiles'], {})
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>): IActionProps {
    // log('debug', 'mapping beatvortex dispatch to props', {ownProps});
    return {
        onEnablePlaylists: (enable: boolean) => {
            log('warn', 'beatvortex: enabling preview playlists view');
            return dispatch(enablePreviewFeatures({enablePlaylistManager: enable}));
        }
    }
}

export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(PreviewSettings));
