import { log, FlexLayout, Icon, Spinner, ComponentEx } from 'vortex-api';
const { ListGroup, ListGroupItem } = require('react-bootstrap');
import React, { Component } from 'react';
import { connect } from "react-redux";
import { IExtensionApi, IModTable, IMod, IState } from 'vortex-api/lib/types/api';

import { GAME_ID } from '..';
import { BeatSaverClient, IMapDetails } from '../beatSaverClient';
import { ILocalPlaylist, IPlaylistEntry } from './types';
import { MapDetails, LoadingSpinner } from "../controls";
import {getDifficulties} from "../util";

interface IConnectedProps {
    installed: { [modId: string]: IMod; };
}

interface IBaseProps {
    playlist: IPlaylistEntry[];
    api: IExtensionApi;
}

interface IPlaylistMapListState {
    isLoading: boolean;
    details: IMapDetails[];
    selected: string; //key
    currentMap: IMapDetails;
}

type IProps = IBaseProps & IConnectedProps;

class PlaylistMapList extends ComponentEx<IProps, {}> {

    playlists: ILocalPlaylist[];
    state: IPlaylistMapListState = {
        selected: '',
        isLoading: true,
        details: [],
        currentMap: null
    };

    async refreshMaps() {
        var { playlist, api } = this.props
        var client = new BeatSaverClient(api);
        var details = await Promise.all(playlist.map(async pl => {
            var mapDetails = await client.getMapDetails(pl.hash ?? pl.key);
            return mapDetails
        }));
        this.setState({ details: details, isLoading: false });
    }

    public render() {
        const { isLoading, details, selected, currentMap } = this.state;
        return (
            <div className='pv-detail-base'>
                {isLoading
                    ? <LoadingSpinner />
                    :
                    <FlexLayout type="row">
                        <FlexLayout.Fixed className="pv-maps-list" style={{ maxWidth: '40%' }}>
                            {details.length > 0
                                ? <ListGroup>
                                    {details
                                        .map((d) => this.renderPlaylistMap(d))} {/* only returns ListGroupEntry */}
                                </ListGroup>
                                : <>This playlist doesn't seem to contain any maps!</>}
                        </FlexLayout.Fixed>
                        <FlexLayout.Flex fill={true}>
                            {((selected == undefined || !selected) || (currentMap == undefined || !currentMap)) ? null : this.renderDescription(currentMap)}
                        </FlexLayout.Flex>
                    </FlexLayout>
                }
            </div>
        );
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

    private renderPlaylistMap = (detail: IMapDetails) => {
        // log('debug', 'attempting render of mod', {mod: mod.name});
        const { selected } = this.state;
        const { installed } = this.props
        return detail?.id
            ? (
            <ListGroupItem
                key={detail.id}
                className={"pv-playlist-map"}
                active={detail.id == selected}
                onClick={(e) => this.selectListEntry(e, detail.id)}
            >
                <div className="pv-maplist-header">
                    <span className='pv-installed-status'>
                        <Icon name={Object.keys(installed).some(i => i == detail.id)
                        ? 'checkbox-checked' : 'checkbox-unchecked'} />
                        <>  </>
                    </span>
                    <span className='pv-maplist-title'>{detail.name}</span>
                </div>
            </ListGroupItem>
        ) : (<></>)
    }

    private selectListEntry = (evt: React.MouseEvent<any>, mapKey: string) => {
        var { details } = this.state;
        const selected = mapKey ?? evt.currentTarget.getAttribute('key');
        var currentMap = (selected == undefined || !selected || details.length == 0)
            ? null
            : details.filter(d => d?.id).find(iter => iter.id == selected);
        this.setState({ selected, currentMap } as IPlaylistMapListState);
    }

    async componentDidMount() {
        log('debug', 'mod list component mounted');
        await this.refreshMaps();
        this.setState({ isLoading: false });
    }

    async componentDidUpdate(prevProps: IProps) {
        if (prevProps.playlist != this.props.playlist) {
            this.setState({isLoading: true, currentMap: undefined});
            await this.refreshMaps();
        }
    }

    private renderDescription = (detail: IMapDetails) => {
        return (
            <MapDetails details={detail}></MapDetails>
        )
    }

    private renderDifficulties = (detail: IMapDetails) => {
        var difficultyMap = getDifficulties(detail);
        return (
            difficultyMap.map(dm => {
                return (
                    <span className="pv-difficulty-name">{dm.abbrev}:<Icon name={dm.present
                        ? 'checkbox-checked' : 'checkbox-unchecked'} /> </span>
                )
            })
        );
    }
}

function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        installed: state.persistent.mods[GAME_ID]
    };
}

// export default PlaylistMapList;
export default (connect(mapStateToProps)(PlaylistMapList));