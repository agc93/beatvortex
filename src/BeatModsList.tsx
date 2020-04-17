import { MainPage, log, FlexLayout, Icon, actions, Spinner } from 'vortex-api';
const { ListGroup, ListGroupItem, Panel, Button, Table, Breadcrumb, ButtonGroup } = require('react-bootstrap');
import React, { Component } from 'react';
import Async, { useAsync } from "react-async";
import { IExtensionApi, IModTable, IMod } from 'vortex-api/lib/types/api';
import { IModDetails, BeatModsClient } from './beatModsClient';
import { getGameVersion } from './util';
import { IconButton } from 'vortex-api/lib/controls/TooltipControls';
import { util } from "vortex-api";
import { handleDownloadInstall, setDownloadModInfo } from '.';
import { rsort } from "semver";
// import { opn } from 'vortex-api/lib/util/api';

class Props {
    api: IExtensionApi;
    mods: IModDetails[];
    installed: IModTable;
}

interface IBeatModsListState {
    mods: IModDetails[];
    selected?: string; //mod ID
    gameVersion: string;
    availableVersions: string[];
    isLoading: boolean;
}

export class BeatModsList extends React.Component {
    header: React.Component<{}, any, any> = null;
    mainPage: React.Component<{}, any, any> = null;

    mods: IModDetails[];
    state: IBeatModsListState = {
        mods: [],
        selected: '',
        gameVersion: '',
        availableVersions: [],
        isLoading: true
    };

    getGame() {
        const api = (this.props as Props).api;
        const state = api.store.getState();
        const gameId = state.persistent.profiles[state.settings.profiles.activeProfileId].gameId;
        console.log(gameId);
        return gameId;
    }

    async refreshMods() {
        var client = new BeatModsClient();
        var version = getGameVersion((this.props as Props).api);
        var availableVersions = [version];
        var mods = await client.getAllMods(version);
        if (!mods || mods.length == 0) {
            var mods = await client.getAllMods();
            var availableVersions = rsort([...new Set(mods.map(m => m.gameVersion))], {loose: true});
            version = null;
        }
        this.setState({ mods: mods, selected: '', gameVersion: version, availableVersions });
        return mods;
    }

    forceGameVersion = (version: string) => {
        this.setState({gameVersion: version});
    }

    selectMod = (modName: string) => {
        //need to handle this being an id
        var { mods } = this.state;
        var mod = mods.find(m => m.name == modName);
        this.setState({selected: mod._id});
    }

    startInstall = (mod: IModDetails) => {
        var { api } = this.props as Props;
        var downloadLinks = BeatModsClient.getDownloads(mod);
        log('debug', 'emitting download events for selected mod', { mod: mod.name, links: downloadLinks});
        api.events.emit('start-download', 
            downloadLinks, 
            {
                game: 'beatsaber',
                name: mod.name
            }, 
            mod.name, 
            (err: Error, id?: string) => {
                handleDownloadInstall(api, mod, err, id, (api) => {
                    setDownloadModInfo(api.store, id, {...mod, source: 'beatmods'});
                    this.refreshMods();
                });
            }, 
            true);
    }

    public render() {
        log('debug', 'rendering mod list');
        const { selected, mods, gameVersion, availableVersions, isLoading } = this.state;
        const mod: IModDetails = (selected == undefined || !selected || mods.length == 0)
            ? null
            : mods.find(iter => iter._id == selected);
        if (mod) {
            log('debug', 'matched mod from list entry selection', { name: mod?.name, category: mod?.category });
        }
        return (
            <MainPage ref={(mainPage) => { this.mainPage = mainPage; }}>
                <MainPage.Header ref={(header) => { this.header = header; }}>
                    <FlexLayout type="column">
                        <>Vortex doesn't install dependencies automatically! If a mod has dependencies, make sure you install them.</>
                        {this.renderVersionSwitcher(gameVersion, availableVersions)}
                    </FlexLayout>
                    {/* <Button onClick={(event: React.MouseEvent<HTMLElement>) => {
                        return true;
                    }}>Back</Button>
                    <Button onClick={(event: React.MouseEvent<HTMLElement>) => {
                        return true;
                    }}>Forward</Button> */}
                </MainPage.Header>
                <MainPage.Body>
                    {isLoading
                    ? this.renderLoadingSpinner()
                    :
                    <Panel id="beatmods-browse">
                        <Panel.Body>
                            {gameVersion 
                            ?
                            <FlexLayout type="row">
                                {/* <FlexLayout.Flex> */}
                                <FlexLayout.Fixed className="beatmods-modlist" style={{maxWidth: '40%'}}>
                                    {/* <FlexLayout type='column' style={{maxWidth: '40%'}}> */}
                                    <FlexLayout type='column'>
                                        {/* <div style={{ maxHeight: '100%', overflow: 'scroll' }}> */}
                                            {this.state.mods.length > 0
                                                ? <ListGroup>
                                                    {this.state.mods
                                                        // .sort(this.beatModsSort)
                                                        .filter(m => gameVersion ? m.gameVersion == gameVersion : true)
                                                        .map(this.renderListEntry)} {/* only returns ListGroupEntry */}
                                                </ListGroup>
                                                : "If you don't see any mods, "
                                            }
                                        {/* </div> */}
                                        <div className='beatmods-list-status'>
                                            {`Loaded ${mods.length} mods for ${gameVersion ? `Beat Saber v${gameVersion}` : 'unknown version'}.`}
                                            <Button icon='refresh' tooltip={'Refresh'} onClick={() => this.refreshMods()}>Refresh</Button>
                                        </div>
                                    </FlexLayout>
                                </FlexLayout.Fixed>
                                <FlexLayout.Flex fill={true}>
                                    {/* THIS SHOULD BE CONDITIONAL ON `current`, NOT `mod` YOU ASSHAT*/}
                                    {/* <div> */}
                                        {((selected == undefined || !selected) || (mod == undefined || !mod)) ? null : this.renderDescription(mod)}
                                    {/* </div> */}
                                </FlexLayout.Flex>
                            </FlexLayout>
                            : <>Could not detect compatible mods for game version! Choose a version above to filter the mod list.</>
                            }
                        </Panel.Body>
                    </Panel>
                    }
                </MainPage.Body>
            </MainPage>
        );
    }

    private beatModsSort = (lhs: IModDetails, rhs: IModDetails): number => {
        if (lhs.required && !rhs.required) {
            return 1;
        }
        return lhs.name.localeCompare(rhs.name);
    }

    private isInstalled = (mod: IModDetails): boolean => {
        var {installed} = (this.props as Props);
        // var installedMods = Object.keys(installed);
        var keys = Object.keys(installed);
        // var installedMods = ((Object.values(installed) as any) as IMod[]).filter(im => im.type == 'bs-mod').map(m => m.attributes);
        // var isInstalled = Object.keys(installed).some(mi => mi == `${mod.name}-${mod.version}`);
        var isInstalled = Object.keys(installed).filter(BeatModsClient.isBeatModsArchive).some(m => m == `${mod.name}-${mod.version}`);
        log('debug', 'pulled installed mod list', {match: isInstalled ?? 'unknown', count: keys.length, keys});
        return isInstalled;
    }

    private isCompatible = (mod: IModDetails): boolean => {
        var {gameVersion} = this.state;
        return gameVersion == mod.gameVersion;
    }

    private selectListEntry = (evt: React.MouseEvent<any>, modId: string) => {
        const modIdStr = modId ?? evt.currentTarget.getAttribute('data-modid');
        log('debug', 'new mod selected', { mod: modIdStr });
        // const modId = modIdStr !== null ? parseInt(modIdStr, 10) : undefined;
        this.setState({ selected: modIdStr });
    }

    private openMoreInfo = (evt: React.MouseEvent<any>) => {
        var link = evt.currentTarget.getAttribute('data-infolink');
        if (!link) {
            let modIdStr = evt.currentTarget.getAttribute('data-modid');
            const { mods } = this.state;
            link = mods.find(m => m._id == modIdStr)?.link;
        }
        log('debug', 'opening more info link', { link });
        if (link) {
            util.opn(link);
        }
        // opn(link);
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

    private renderVersionSwitcher = (gameVersion: string, availableVersions: string[]) => {
        return (<FlexLayout type="row">
            <span style={{fontWeight: 'bold', margin: '0.25em'}}>Beat Saber Version: </span>
            <ButtonGroup aria-label="Game Version" className="version-switcher">
                {availableVersions.map(av => {
                    return <Button variant={gameVersion == av ? "" : "secondary"} onClick={() => this.forceGameVersion(av)}>{av}</Button>
                })}
            </ButtonGroup>
        </FlexLayout>
        );
    }

    private renderListEntry = (mod: IModDetails) => {
        // log('debug', 'attempting render of mod', {mod: mod.name});
        const { selected } = this.state;
        return (
            <ListGroupItem
                // className={classes.join(' ')}
                key={mod._id}
                data-modid={mod._id}
                className={"beatmods-item"}
                active={mod._id == selected}
                onClick={(e) => this.selectListEntry(e, mod._id)}
            // disabled={installed || incompatible}
            >
                <div className='beatmods-header'>
                    <div>
                        <span className='beatmods-name'>{mod.name}</span>
                        <span className='beatmods-version'>{mod.version}</span>
                        {mod.required 
                            ? <span className='beatmods-required'>
                                <Icon name='attention-required' />
                                {'Required'}</span>
                            : ''}
                    </div>
                </div>
                <div className='beatmods-description'>{mod.description}</div>
                <div className='beatmods-footer'>
                    <div className='beatmods-author'>{mod.author?.username ?? 'Unknown'}</div>
                    {/* {action} */}
                </div>
            </ListGroupItem>
        )
    }

    private renderDescription = (mod: IModDetails) => {
        log('debug', 'attempting render of mod details', { name: mod.name, author: mod.author.username, category: mod.category, description: mod.description });
        var ready = {
            compatible: this.isCompatible(mod),
            installed: this.isInstalled(mod),
        };
        let mods = this.state.mods;
        var installedVersion = getGameVersion((this.props as Props).api);
        // ready.installReady = ready.compatible && !ready.installed
        return (
            <FlexLayout type='column'>
                <FlexLayout.Fixed>
                    <FlexLayout type='row' className='description-header' fill={false}>
                        {/* <FlexLayout.Fixed>
                        </FlexLayout.Fixed> */}
                        <FlexLayout.Flex>
                            <FlexLayout type='column' className='description-header-content'>
                                <div className='description-title'>
                                    <span className='description-name'>{mod.name}</span>
                                    <span className='description-author'>{'by '}{mod.author.username}</span>
                                </div>
                                <div>
                                <div className='description-short'>
                                    {mod.category}
                                </div>
                                <div className='description-actions'>
                                    <a
                                        className='extension-browse'
                                        data-modid={mod._id}
                                        data-infolink={mod.link}
                                        onClick={this.openMoreInfo}
                                    >
                                        <Icon name='open-in-browser' />
                                        {'More Info...'}
                                    </a>
                                </div>
                                </div>
                            </FlexLayout>
                        </FlexLayout.Flex>
                    </FlexLayout>
                </FlexLayout.Fixed>
                <FlexLayout.Flex>
                    <div className='description-text'>
                        {mod.description}
                    </div>
                </FlexLayout.Flex>
                <FlexLayout.Fixed className="description-footer">
                    <FlexLayout type="row">
                        <FlexLayout.Flex>
                            <FlexLayout type="column" className="description-footer-deps">
                                {mod.dependencies && mod.dependencies.length > 0 &&
                                    <Breadcrumb>
                                        <Breadcrumb.Item active>Dependencies</Breadcrumb.Item>
                                        {mod.dependencies.map(d => {
                                            return <Breadcrumb.Item onClick={() => this.selectMod(d.name)}>{d.name}</Breadcrumb.Item>
                                        })}
                                    </Breadcrumb>
                                /* BeatModsClient.getDependencies(mods, mod).map(d => {
                                    log('debug', 'parsing dependency', {dependency: d})
                                    return <Breadcrumb>
                                        {d.map(di => {
                                            log('debug', 'parsing child dependency', { child: di});
                                            return <Breadcrumb.Item>{di.name}</Breadcrumb.Item>
                                        })}
                                    </Breadcrumb>
                                }) */
                                }
                            </FlexLayout>
                        </FlexLayout.Flex>
                        <FlexLayout.Fixed className="description-version-warning">
                            {installedVersion == mod.gameVersion
                                ? <></>
                                : <>This mod is built for Beat Saber {mod.gameVersion}! Make sure it is compatible with {installedVersion} before installing!</>}
                        </FlexLayout.Fixed>
                        <FlexLayout.Fixed>
                            {ready && <Button 
                                className='description-footer-action'
                                onClick={() => this.startInstall(mod)}
                                disabled={!ready.compatible || ready.installed}
                            >{ready.installed
                                ? 'Installed'
                                : ready.compatible
                                    ? 'Ready to Install'
                                    : 'Not compatible' }
                            </Button>}
                        </FlexLayout.Fixed>
                    </FlexLayout>
                </FlexLayout.Fixed>
            </FlexLayout>

        );
    }

    async componentDidMount() {
        log('debug', 'mod list component mounted');
        var response = await this.refreshMods();
        log('debug', `setting state with ${response?.length} mods`, { currentCount: this.state.mods?.length ?? '0' });
        // (this.props as Props).mods = new BeatModsClient()
        // log('debug', 'set new state', { count: this.state.mods.length });
        this.setState({isLoading: false});
        
    }
}

export default BeatModsList;