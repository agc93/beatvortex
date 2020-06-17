import * as React from 'react';
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { withTranslation } from 'react-i18next';
import { Toggle, log, ComponentEx, More, util } from 'vortex-api';
import { enablePreviewFeatures, IPreviewSettings } from './actions';
import { IState } from 'vortex-api/lib/types/api';
const { HelpBlock, FormGroup, ControlLabel, InputGroup, FormControl } = require('react-bootstrap');

interface IConnectedProps {
    previewSettings: IPreviewSettings;
}

interface IActionProps {
    onEnablePlaylists: (enable: boolean) => void;
    onEnableUpdates: (enable: boolean) => void;
}

type IProps = IConnectedProps & IActionProps;

class PreviewSettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t, previewSettings, onEnablePlaylists, onEnableUpdates } = this.props;
        const { enablePlaylistManager: enablePlaylists, enableUpdates } = previewSettings;
        return (
            <form>
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
                    <Toggle
                        checked={enableUpdates}
                        onToggle={onEnableUpdates}
                    >
                        {t("bs:Settings:EnablePreviewUpdates")}
                        <More id='more-preview-updates' name='Mod Updates Preview'>
                            {t('bs:Settings:EnablePreviewUpdatesHelp')}
                        </More>
                    </Toggle>
                </FormGroup>
            </form>
        );
    }
}


function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        previewSettings: state.settings['beatvortex']['preview']
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>): IActionProps {
    // log('debug', 'mapping beatvortex dispatch to props', {ownProps});
    return {
        onEnablePlaylists: (enable: boolean) => {
            log('warn', 'beatvortex: enabling preview playlists view');
            return dispatch(enablePreviewFeatures({enablePlaylistManager: enable}));
        },
        onEnableUpdates: (enable: boolean) => {
            log('warn', 'beatvortex: enabling preview updates support!');
            return dispatch(enablePreviewFeatures({enableUpdates: enable}));
        }
    }
}

export default
    withTranslation(['beatvortex', 'common'])(connect(mapStateToProps, mapDispatchToProps)(PreviewSettings));
