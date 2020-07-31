import { MainPage, log, FlexLayout, Icon, actions, Spinner, ComponentEx } from 'vortex-api';
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
import { IBookmark } from './beastSaberClient';
import { SyncService } from './syncService';
import { ISyncSettings } from '../settings';
import { LoadingSpinner, DynamicMapDetails } from '../controls';

interface IConnectedProps {
    installed: { [modId: string]: IMod; };
    userName: string;
    bookmarks: BookmarkCache
}

interface IBaseProps {
    api: IExtensionApi;
    service: SyncService;
}

interface ISyncViewState {
    // playlists: ILocalPlaylist[];
    selected?: string; //hash
    isLoading: boolean;
    isSyncing: boolean;
    searchFilter: string;
    // currentPlaylist: ILocalPlaylist;
    // maps: IPlaylistEntry[];
}

type IProps = IConnectedProps & IBaseProps;

type BookmarkCache = {[user: string]: IBookmark[]};

class SyncView extends ComponentEx<IProps, {}> {

    /**
     *
     */
   /*  constructor(props) {
        super(props);
        this.state.isLoading = true;
        // this.setState({isLoading: true});
    } */

    header: React.Component<{}, any, any> = null;
    mainPage: React.Component<{}, any, any> = null;

    state: ISyncViewState = {
        selected: '', //hash
        isLoading: true,
        searchFilter: '',
        isSyncing: false
    };

    async refreshBookmarks() {
        var { userName, api, service } = this.props;
        if (userName) {
            await service.getBookmarks(userName);
        }
        // this.setState({ playlists: playlists });
    }

    public render() {
        const { isLoading, selected, searchFilter, isSyncing } = this.state;
        const { t, userName, api, service } = this.props;
        var cache = this.props.bookmarks;
        let bookmarks: IBookmark[] = [];
        if (cache && userName) {
            bookmarks = cache[userName];
        }
        return (
            <MainPage ref={(mainPage) => { this.mainPage = mainPage; }}>
                <MainPage.Header ref={(header) => { this.header = header; }}>
                    {!userName && 
                    <FlexLayout type="column">
                        <>Make sure you configure your username in Settings first!</>
                    </FlexLayout>
                    }
                </MainPage.Header>
                <MainPage.Body>
                    {isLoading
                        ? <LoadingSpinner />
                        : userName
                            ?
                                <Panel id="bookmarks-browse">
                                    <Panel.Heading>
                                        {isSyncing 
                                            ? <LoadingSpinner />
                                            : <FlexLayout type="row" className="sv-actions-bar">
                                                <Button icon='refresh' tooltip={'Refresh'} onClick={() => this.refreshBookmarks()}>Refresh</Button>
                                                <Button onClick={() => this.syncBookmarks()}>Sync</Button>
                                                <Button onClick={() => this.installBookmarks()}>Install</Button>
                                            </FlexLayout>
                                        }
                                    </Panel.Heading>
                                    <Panel.Body>
                                        <FlexLayout type="column">
                                            <FlexLayout.Fixed>BeastSaber Bookmarks {userName ? `(${userName})` : ''}</FlexLayout.Fixed>
                                            <FlexLayout.Flex>
                                        <FlexLayout type="row">
                                            <FlexLayout.Fixed className="sv-bookmarklist">
                                                <FlexLayout type='column'>
                                                    {bookmarks && bookmarks.length > 0
                                                        ? <ListGroup>
                                                            {bookmarks
                                                                .filter(s => searchFilter ? s.title.toLowerCase().indexOf(searchFilter.toLowerCase()) !== -1 : true)
                                                                .map(this.renderListEntry)} {/* only returns ListGroupEntry */}
                                                        </ListGroup>
                                                        : t("bs:SyncView:NoBookmarks")
                                                    }
                                                    {bookmarks && 
                                                        <div className='bv-list-status'>
                                                            {`Loaded ${bookmarks.length} bookmarks`}
                                                            <Button icon='refresh' tooltip={'Refresh'} onClick={() => this.refreshBookmarks()}>Refresh</Button>
                                                        </div>
                                                    }
                                                </FlexLayout>
                                            </FlexLayout.Fixed>
                                            <FlexLayout.Flex fill={true}>
                                                {((selected == undefined || !selected) ? null : <DynamicMapDetails api={api} ident={selected} />)}
                                            </FlexLayout.Flex>
                                        </FlexLayout>
                                        </FlexLayout.Flex>
                                        </FlexLayout>
                                    </Panel.Body>
                                </Panel>
                            : <></>
                    }
                </MainPage.Body>
            </MainPage>
        );
    }

    private selectListEntry = (evt: React.MouseEvent<any>, hash: string) => {
        // var { selected } = this.state;
        var { bookmarks, userName } = this.props;
        const modIdStr = hash ?? evt.currentTarget.getAttribute('data-hash');
        traceLog('new bookmark selected', { mod: modIdStr });
        var bm = bookmarks[userName].find(m => m.hash == modIdStr);
        this.setState({ selected: bm.hash } as ISyncViewState);
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

    private renderListEntry = (bookmark: IBookmark) => {
        // log('debug', 'attempting render of mod', {mod: mod.name});
        const { selected } = this.state;
        return (
            <ListGroupItem
                key={bookmark.hash}
                data-hash={bookmark.hash}
                className={"sv-bookmark-item"}
                active={bookmark.hash == selected}
                onClick={(e: React.MouseEvent<any, MouseEvent>) => this.selectListEntry(e, bookmark.hash)}
            >
                <div className='sv-item-header'>
                    <div>
                        <span className='sv-item-title'>{bookmark.title}</span><span className='sv-item-extra'>{bookmark.song_key}</span>
                        {/* <span className='pv-playlist-item-length'>{playlist.maps.length} songs</span> */}
                    </div>
                </div>
                <div className='sv-item-footer'>
                    <div className='sv-item-footer-text'>{bookmark.level_author_name ?? 'Unknown'}</div>
                </div>
            </ListGroupItem>
        )
    }

    async componentDidMount() {
        log('debug', 'mod list component mounted');
        await this.refreshBookmarks();
        this.setState({ isLoading: false, selected: '' });
    }

    private syncBookmarks = async () => {
        const { userName, service } = this.props;
        this.setState({isSyncing: true});
        await service.syncBookmarks(userName, false)
        this.setState({isSyncing: false});
    }
    private installBookmarks = async () => {
        const { userName, service } = this.props;
        this.setState({isSyncing: true});
        await service.syncBookmarks(userName, true)
        this.setState({isSyncing: false});
    }
}

function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        installed: state.persistent.mods[GAME_ID],
        bookmarks: util.getSafe<BookmarkCache>(state.session, ['beatvortex', 'bookmarks'], {}),
        userName: (util.getSafe<ISyncSettings>(state.settings, ['beatvortex', 'sync'], undefined))?.beastSaberUsername ?? ''
    };
}

export default withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps)(SyncView));