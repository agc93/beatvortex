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
    onEnableUpdates: (enable: boolean) => void;
    onEnableCategories: (enable: boolean) => void;
}

type IProps = IConnectedProps & IActionProps;

class PreviewSettings extends ComponentEx<IProps, {}> {
    
    public render(): JSX.Element {
        const { t, previewSettings, onEnablePlaylists, onEnableUpdates, onEnableCategories, profiles } = this.props;
        const { enablePlaylistManager: enablePlaylists, enableUpdates, enableCategories } = previewSettings;
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
                    <Toggle
                        checked={enableUpdates}
                        onToggle={onEnableUpdates}
                    >
                        {t("bs:Settings:EnablePreviewUpdates")}
                        <More id='more-preview-updates' name='Mod Updates Preview'>
                            {t('bs:Settings:EnablePreviewUpdatesHelp')}
                        </More>
                    </Toggle>
                    <Toggle
                        checked={enableCategories}
                        onToggle={onEnableCategories}
                    >
                        {t("bs:Settings:EnablePreviewCategories")}
                        <More id='more-preview-categories' name='Mod Categories Preview'>
                            {t('bs:Settings:EnablePreviewCategoriesHelp')}
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
        },
        onEnableUpdates: (enable: boolean) => {
            log('warn', 'beatvortex: enabling preview updates support!');
            return dispatch(enablePreviewFeatures({enableUpdates: enable}));
        },
        onEnableCategories: (enable: boolean) => {
            log('warn', 'beatvortex: enabling preview categories support!');
            return dispatch(enablePreviewFeatures({enableCategories: enable}));
        }
    }
}

export default
    withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps, mapDispatchToProps)(PreviewSettings));
