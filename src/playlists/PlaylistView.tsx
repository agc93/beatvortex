import { MainPage, log, FlexLayout, Icon, actions, Spinner, ComponentEx } from 'vortex-api';
import path = require('path');
const { ListGroup, ListGroupItem, Panel, Button, InputGroup, Breadcrumb, ButtonGroup, FormControl, FormGroup, ControlLabel } = require('react-bootstrap');
import React, { Component } from 'react';
import * as Redux from 'redux';
import { connect } from 'react-redux';
import { IExtensionApi, IMod, IState } from 'vortex-api/lib/types/api';

import { traceLog } from '../util';
import { util } from "vortex-api";
import { GAME_ID } from '..';
import { withTranslation } from 'react-i18next';
import { ThunkDispatch } from 'redux-thunk';
import { PlaylistManager, installMaps } from './playlistManager';
import { BeatSaverClient, IMapDetails } from '../beatSaverClient';
import { ILocalPlaylist, IPlaylistEntry } from './types';
import PlaylistMapList from "./PlaylistMapList";
import { installPlaylistMaps } from '../install';

interface IConnectedProps {
    installed: { [modId: string]: IMod; };
    gamePath: string;
}

interface IActionProps {
    onStartInstall?: (songsKeys: string[]) => void;
}

interface IBaseProps {
    api: IExtensionApi;
}

interface IBeatModsListState {
    playlists: ILocalPlaylist[];
    selected?: string; //playlist fileName
    isLoading: boolean;
    searchFilter: string;
}

type IProps = IConnectedProps & IActionProps & IBaseProps;

class PlaylistView extends ComponentEx<IProps, {}> {

    // there is a pretty brutal bug in the BeatMods API that's led to some very convoluted logic in this component.
    // Essentially, BeatMods reports completely different values for `gameVersion` based on the query.
    // If you *don't* specify a game version in the query, it reports a much older value.
    // so as it stands, we do an extra round trip to get all the available versions, then we can use the more specific query to get compatible mods

    header: React.Component<{}, any, any> = null;
    mainPage: React.Component<{}, any, any> = null;

    playlists: ILocalPlaylist[];
    state: IBeatModsListState = {
        playlists: [],
        selected: '', //title
        isLoading: true,
        searchFilter: ''
    };

    private highlightMod = (modId: string) => {
        // const modId = evt.currentTarget.getAttribute('data-modid');
        const api = (this.props as IProps).api;
        api.events.emit('show-main-page', 'Mods');
        // give it time to transition to the mods page but also this is a workaround
        // for the fact that the mods page might not be mounted yet
        setTimeout(() => {
            api.events.emit('mods-scroll-to', modId);
            api.highlightControl(
                `#${util.sanitizeCSSId(modId)} > .cell-name`, 4000);
        }, 200);
    }

    async refreshPlaylists(version?: string) {
        var { gamePath, installed } = this.props;
        var client = new PlaylistManager(gamePath);
        var playlists = await client.getInstalledPlaylists();
        var titles = playlists.map(p => p.title);
        /* var playlistMods = Object.values(installed).filter(m => m.type == 'bs-playlist');
        var titles = playlistMods.map(m => m.attributes['name']);
        var playlists = playlistMods.map((m: IMod): ILocalPlaylist => {
            return {
                title: m.attributes['name']
            }
        }) */
        log('debug', 'beatvortex fetched installed playlists', { count: playlists.length, titles: titles });
        this.setState({ playlists: playlists });
    }

    selectPlaylist = (playlistName: string) => {
        //need to handle this being an id
        var { playlists } = this.state;
        var mod = playlists.find(m => m.title == playlistName || playlistName.startsWith(path.basename(m.filePath, '.bplist')));
        this.setState({ selected: mod.title });
    }

    public render() {
        const { selected, playlists, isLoading, searchFilter } = this.state;
        const { t } = this.props;
        traceLog('rendering playlist list', { searchFilter: searchFilter ?? 'none' });
        const mod: ILocalPlaylist = (selected == undefined || !selected || playlists.length == 0)
            ? null
            : playlists.find(iter => iter.title == selected);
        if (mod) {
            traceLog('matched mod from list entry selection', { name: mod?.title, path: mod?.filePath });
        }
        return (
            <MainPage ref={(mainPage) => { this.mainPage = mainPage; }}>
                <MainPage.Header ref={(header) => { this.header = header; }}>
                    <FlexLayout type="column">
                        <>Vortex will only show playlists you already have installed/deployed locally!</>
                        <FlexLayout type="row">
                            {/* {this.renderVersionSwitcher(gameVersion, availableVersions)} */}
                            {this.renderSearchBox()}
                        </FlexLayout>
                    </FlexLayout>
                </MainPage.Header>
                <MainPage.Body>
                    {isLoading
                        ? this.renderLoadingSpinner()
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
                                        {/* <div> */}
                                        {((selected == undefined || !selected) || (mod == undefined || !mod)) ? null : this.renderDescription(mod)}
                                        {/* </div> */}
                                    </FlexLayout.Flex>
                                </FlexLayout>
                            </Panel.Body>
                        </Panel>
                    }
                </MainPage.Body>
            </MainPage>
        );
    }

    private isInstalled = (song: IPlaylistEntry): boolean => {
        var { installed } = (this.props as IProps);
        var keys = Object.values(installed);
        var isInstalled = Object.values(installed).filter(m => m.type == 'bs-map').some(m => m.id == song.key);
        return isInstalled;
    }

    private selectListEntry = (evt: React.MouseEvent<any>, modId: string) => {
        const modIdStr = modId ?? evt.currentTarget.getAttribute('data-title');
        log('debug', 'new mod selected', { mod: modIdStr });
        // const modId = modIdStr !== null ? parseInt(modIdStr, 10) : undefined;
        this.setState({ selected: modIdStr });
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

    private renderLoadingSpinner = () => {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spinner
                    style={{
                        width: '64px',
                        height: '64px',
                    }}
                />
            </div>
        );
    }

    private renderListEntry = (playlist: ILocalPlaylist) => {
        // log('debug', 'attempting render of mod', {mod: mod.name});
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
                </div>
            </ListGroupItem>
        )
    }

    private renderDescription = (playlist: ILocalPlaylist) => {
        // traceLog('attempting render of mod details', { name: mod.name, author: mod.author.username, category: mod.category, description: mod.description });
        const { t, installed } = this.props;
        var client = new BeatSaverClient();
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
                                    <>from {playlist.filePath}</>
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
                        <PlaylistMapList installed={installed} playlist={playlist.maps}></PlaylistMapList>
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

    private renderPlaylistMap = (detail: IMapDetails) => {
        // log('debug', 'attempting render of mod', {mod: mod.name});
        const { selected } = this.state;
        return (
            <ListGroupItem
                key={detail.key}
                data-key={detail.key}
                className={"pv-playlist-map"}
                // active={playlist.title == selected}
                // onClick={(e) => this.selectListEntry(e, playlist.title)}
            >
                <span className='pv-playlist-map-title'>{detail.name}</span>
                <div className='pv-playlist-footer'>
                    <div className='pv-playlist-author'>{detail.description}</div>
                </div>
            </ListGroupItem>
        )
    }

    private startInstall = async (playlist: ILocalPlaylist) => {
        const { api, installed } = this.props;
        installPlaylistMaps(api, playlist.maps);
        /* var toInstall = playlist.maps.filter(plm => !Object.values(installed).some(i => (i.id == plm.key) || (i?.attributes['mapHash'] == plm.hash)));
        api.sendNotification({
            type: 'info',
            title: "Now installing playlist",
            message: `Installing ${toInstall.length} maps from BeatSaver`,
            noDismiss: true,
            displayMS: 4000
        });
        await installMaps(api, toInstall.map(i => i.hash ?? i.key)); */
    }

    async componentDidMount() {
        log('debug', 'mod list component mounted');
        await this.refreshPlaylists();
        this.setState({ isLoading: false });
    }
}

function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        gamePath: state.settings.gameMode.discovered[GAME_ID].path,
        installed: state.persistent.mods[GAME_ID]
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>, ownProps: IBaseProps): IActionProps {
    return {}
}

export default withTranslation(['beatvortex', 'common'])(connect(mapStateToProps)(PlaylistView));