import { remote, webviewTag } from 'electron';
import { types, Webview, MainPage, FormInput, log } from 'vortex-api';
const { ListGroup, ListGroupItem, Panel, Button } = require('react-bootstrap');
import React = require("react");
import { IProps } from 'vortex-api/lib/controls/FormInput';
import { IExtensionApi } from 'vortex-api/lib/types/api';

class Props {
    api: IExtensionApi;
}

export default class BeatModsList extends React.Component {
    header: React.Component<{}, any, any> = null;
    mainPage: React.Component<{}, any, any> = null;

    getGame() {
        const api = (this.props as Props).api;
        const state = api.store.getState();
        const gameId = state.persistent.profiles[state.settings.profiles.activeProfileId].gameId;
        console.log(gameId);
        return gameId;
    }

    render() {
        return (
            <MainPage ref={(mainPage) => { this.mainPage = mainPage; }}>
                <MainPage.Header ref={(header) => { this.header = header; }}>
                    <Button onClick={(event: React.MouseEvent<HTMLElement>) => {
                        return true;
                    }}>Back</Button>
                    <Button onClick={(event: React.MouseEvent<HTMLElement>) => {
                        return true;
                    }}>Forward</Button>
                </MainPage.Header>
                <MainPage.Body>
                    
                </MainPage.Body>
            </MainPage>
        );
    }

    componentDidMount() {
        log('debug', 'mod list component mounted');
    }
}

