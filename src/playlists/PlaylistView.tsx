import { MainPage, log, FlexLayout, Icon, actions, Spinner, ComponentEx, tooltip as tt } from 'vortex-api';
import path = require('path');
const { ListGroup, ListGroupItem, Panel, Button, FormControl } = require('react-bootstrap');
import React, { Component } from 'react';
import * as Redux from 'redux';
import { connect } from 'react-redux';
import { IExtensionApi, IMod, IState } from 'vortex-api/lib/types/api';

import { traceLog } from '../util';
import { util } from "vortex-api";
import { GAME_ID } from '..';
import { withTranslation } from 'react-i18next';
import { ThunkDispatch } from 'redux-thunk';
import { PlaylistManager } from './playlistManager';
import { BeatSaverClient, IMapDetails } from '../beatSaverClient';
import { ILocalPlaylist, IPlaylistEntry } from './types';
import PlaylistMapList from "./PlaylistMapList";
import { installPlaylistMaps } from '../install';
import { LoadingSpinner } from '../controls';

interface IConnectedProps {
    installed: { [modId: string]: IMod; };
    gamePath: string;
}

interface IBaseProps {
    api: IExtensionApi;
}

interface IBeatModsListState {
    playlists: ILocalPlaylist[];
    selected?: string; //playlist fileName
    isLoading: boolean;
    searchFilter: string;
    currentPlaylist: ILocalPlaylist;
    maps: IPlaylistEntry[];
}

type IProps = IConnectedProps & IBaseProps;

class PlaylistView extends ComponentEx<IProps, {}> {

    header: React.Component<{}, any, any> = null;
    mainPage: React.Component<{}, any, any> = null;

    playlists: ILocalPlaylist[];
    state: IBeatModsListState = {
        playlists: [],
        selected: '', //title
        currentPlaylist: null,
        isLoading: true,
        searchFilter: '',
        maps: []
    };

    async refreshPlaylists(version?: string) {
        var { gamePath, api } = this.props;
        var client = new PlaylistManager(api);
        var playlists = await client.getInstalledPlaylists();
        // var titles = playlists.map(p => p.title);
        // log('debug', 'beatvortex fetched installed playlists', { count: playlists.length, titles: titles });
        this.setState({ playlists: playlists });
    }

    /* selectPlaylist = (playlistName: string) => {
        //need to handle this being an id
        var { playlists } = this.state;
        var mod = playlists.find(m => m.title == playlistName || playlistName.startsWith(path.basename(m.filePath, '.bplist')));
        this.setState({ selected: mod.title, currentPlaylist: mod } as IBeatModsListState);
    } */

    public render() {
        const { selected, playlists, currentPlaylist, isLoading, searchFilter } = this.state;
        const { t } = this.props;
        traceLog('rendering playlist list', { searchFilter: searchFilter ?? 'none' });
        /* if (mod) {
            traceLog('matched mod from list entry selection', { name: mod?.title, path: mod?.filePath });
        } */
        return (
            <MainPage ref={(mainPage) => { this.mainPage = mainPage; }}>
                <MainPage.Header ref={(header) => { this.header = header; }}>
                    <FlexLayout type="column">
                        <>Vortex will only show playlists you already have installed/deployed locally!</>
                        <FlexLayout type="row">
                            {this.renderSearchBox()}
                        </FlexLayout>
                    </FlexLayout>
                </MainPage.Header>
                <MainPage.Body>
                    {isLoading
                        ? <LoadingSpinner />
                        :
                        <Panel id="playlists-browse">
                            <Panel.Body>
                                <FlexLayout type="row">
                                    {/* <FlexLayout.Flex> */}
                                    <FlexLayout.Fixed className="pv-playlistlist">
                                        <FlexLayout type='column'>
                                            {this.state.playlists.length > 0
                                                ? <ListGroup>
                                                    {this.state.playlists
                                                        .filter(s => searchFilter ? s.title.toLowerCase().indexOf(searchFilter.toLowerCase()) !== -1 : true)
                                                        .map(this.renderListEntry)} {/* only returns ListGroupEntry */}
                                                </ListGroup>
                                                : t("bs:PlaylistView:NoPlaylists")
                                            }
                                            <div className='pv-list-status'>
                                                {`Loaded ${playlists.length} playlists`}
                                                <Button icon='refresh' tooltip={'Refresh'} onClick={() => this.refreshPlaylists()}>Refresh</Button>
                                            </div>
                                        </FlexLayout>
                                    </FlexLayout.Fixed>
                                    <FlexLayout.Flex fill={true}>
                                        {((selected == undefined || !selected) || (currentPlaylist == undefined || !currentPlaylist)) ? null : this.renderDescription(currentPlaylist)}
                                    </FlexLayout.Flex>
                                </FlexLayout>
                            </Panel.Body>
                        </Panel>
                    }
                </MainPage.Body>
            </MainPage>
        );
    }

    private selectListEntry = (evt: React.MouseEvent<any>, modId: string) => {
        var { playlists } = this.state;
        const modIdStr = modId ?? evt.currentTarget.getAttribute('data-title');
        traceLog('new playlist selected', { mod: modIdStr });
        var mod = playlists.find(m => m.title == modIdStr || modIdStr.startsWith(path.basename(m.filePath, '.bplist')));
        this.setState({ selected: mod.title, currentPlaylist: mod, maps: mod.maps } as IBeatModsListState);
        // this.setState({ selected: modIdStr });
    }

    private handleSearchFilter = (evt: React.ChangeEvent<any>) => {
        log('debug', 'setting mod list filter', { searchFilter: evt.target.value });
        this.setState({ searchFilter: evt.target.value });
    }

    private renderSearchBox = () => {
        const { searchFilter } = this.state;
        return (
            <div style={{ display: 'inline-block', position: 'relative', height: 30 }}>
                <FormControl
                    className='search-box-input'
                    type='text'
                    placeholder='Search'
                    value={searchFilter || ''}
                    onChange={(e) => this.handleSearchFilter(e)}
                />
                <Icon className='search-icon' name='search' />
            </div>
        )
    }

    private renderListEntry = (playlist: ILocalPlaylist) => {
        const { installed } = this.props;
        const { selected } = this.state;
        return (
            <ListGroupItem
                key={playlist.title}
                data-title={playlist.title}
                className={"pv-playlist-item"}
                active={playlist.title == selected}
                onClick={(e) => this.selectListEntry(e, playlist.title)}
            >
                <div className='pv-playlist-item-header'>
                    <div>
                        <span className='pv-playlist-item-title'>{playlist.title}</span>
                        <span className='pv-playlist-item-length'>{playlist.maps.length} songs</span>
                    </div>
                </div>
                <div className='pv-playlist-item-footer'>
                    <div className='pv-playlist-item-author'>{playlist.authorName ?? 'Unknown'}</div>
                    <div className='pv-playlist-item-status'>
                        {this.isInstalled(playlist) 
                            ? <tt.Icon tooltip="Vortex-managed" name="vortex" set="beatvortex" />
                            // : <tt.Icon tooltip="External" name="override" />
                            : <></>
                        }
                    </div>
                </div>
            </ListGroupItem>
        )
    }

    private renderDescription = (playlist: ILocalPlaylist) => {
        // traceLog('attempting render of mod details', { name: mod.name, author: mod.author.username, category: mod.category, description: mod.description });
        const { t, installed, api } = this.props;
        var client = new BeatSaverClient(api);
        var isInstalled = playlist.maps.every(e => Object.keys(installed).some(id => id == e.key) || Object.values(installed).some(m => m.attributes["mapHash"] == e.hash));
        var isPartiallyInstalled = playlist.maps.some(e => Object.keys(installed).some(id => id == e.key) || Object.values(installed).some(m => m.attributes["mapHash"] == e.hash));
        return (
            <FlexLayout type='column' className='pv-detail'>
                <FlexLayout.Fixed>
                    <FlexLayout type='row' className='pv-detail-header' fill={false}>
                        <FlexLayout.Flex>
                            <FlexLayout type='column' className='pv-detail-header-content'>
                                <div className='pv-detail-title'>
                                    <span className='pv-detail-name'>{playlist.title}</span>
                                    <span className='pv-detail-author'>{' by '}{playlist.authorName}</span>
                                </div>
                                <div className='pv-detail-source'>
                                    <>from {path.basename(playlist.filePath)} (in {path.dirname(playlist.filePath) == "." ? "Default" : path.dirname(playlist.filePath)} group)</>
                                </div>
                            </FlexLayout>
                        </FlexLayout.Flex>
                        <FlexLayout.Fixed>
                            <Button 
                                className='pv-detail-install-action'
                                onClick={() => this.startInstall(playlist)}
                                disabled={isInstalled}
                            >{isInstalled
                                ? 'Installed'
                                : isPartiallyInstalled
                                    ? 'Install Missing Maps'
                                    : 'Ready to Install'}
                            </Button>
                        </FlexLayout.Fixed>
                    </FlexLayout>
                </FlexLayout.Fixed>
                <FlexLayout.Flex>
                    <div className="pv-detail-base">
                        <PlaylistMapList api={this.props.api} playlist={this.state.maps}></PlaylistMapList>
                    </div>
                </FlexLayout.Flex>
                <FlexLayout.Fixed className="pv-detail-footer">
                    <FlexLayout type="row">
                        <FlexLayout.Fixed>
                        </FlexLayout.Fixed>
                    </FlexLayout>
                </FlexLayout.Fixed>
            </FlexLayout>

        );
    }

    private startInstall = async (playlist: ILocalPlaylist) => {
        const { api, installed } = this.props;
        installPlaylistMaps(api, playlist.maps);
    }

    async componentDidMount() {
        log('debug', 'mod list component mounted');
        await this.refreshPlaylists();
        this.setState({ isLoading: false });
    }

    private isInstalled = (pl: ILocalPlaylist) => {
        const { installed } = this.props;
        if (installed && Object.keys(installed).length > 0) {
            return Object.values(installed).filter(m => m.type == 'bs-playlist').some(m => util.getSafe(m.attributes, ['name'], '') == pl.title);
        }
        return false;
    }
}

function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        gamePath: state.settings.gameMode.discovered[GAME_ID].path,
        installed: state.persistent.mods[GAME_ID]
    };
}

export default withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps)(PlaylistView));