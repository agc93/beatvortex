import { MainPage, log, FlexLayout, Icon, actions, Spinner, ComponentEx } from 'vortex-api';
const { ListGroup, ListGroupItem, Panel, Button, InputGroup, Breadcrumb, ButtonGroup, FormControl, FormGroup, ControlLabel } = require('react-bootstrap');
import React, { Component } from 'react';
import * as Redux from 'redux';
import { connect } from 'react-redux';
import { IExtensionApi, IMod, IState } from 'vortex-api/lib/types/api';
import { IModDetails, BeatModsClient, IVersionList } from '../beatModsClient';
import { traceLog, supportsModVersion, getCompatibleModVersion } from '../util';
import { util } from "vortex-api";
import { setDownloadModInfo, GAME_ID, directDownloadInstall } from '..';
import { rsort } from "semver";
import { withTranslation } from 'react-i18next';
import { ThunkDispatch } from 'redux-thunk';

interface IConnectedProps {
    installed: { [modId: string]: IMod; };
    mods: { [modName: string]: IModDetails; };
    availableVersions: IVersionList,
    gameVersion: string;
}

interface IActionProps {
    onStartInstall?: (mod: IModDetails) => void;
}

interface IBaseProps {
    api: IExtensionApi;
}

interface IBeatModsListState {
    selected?: string; //mod ID
    // gameVersion: string;
    modVersion: string;
    isLoading: boolean;
    searchFilter: string;
}

type IProps = IConnectedProps & IActionProps & IBaseProps;

class BeatModsList extends ComponentEx<IProps, {}> {

    // there is a pretty brutal bug in the BeatMods API that's led to some very convoluted logic in this component.
    // Essentially, BeatMods reports completely different values for `gameVersion` based on the query.
    // If you *don't* specify a game version in the query, it reports a much older value.
    // so as it stands, we do an extra round trip to get all the available versions, then we can use the more specific query to get compatible mods.

    // from v0.3.3 onwards, this turns into even more of a mess.
    // since the introduction of session state, it *should* be possible to cache BeatMods API requests for specific versions.
    // the problem is that the only way of getting the actually correct values is by asking for a version, not the global request.

    header: React.Component<{}, any, any> = null;
    mainPage: React.Component<{}, any, any> = null;

    state: IBeatModsListState = {
        selected: '',
        isLoading: true,
        searchFilter: '',
        modVersion: ''
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

    async getVersions(): Promise<string> {
        var {api, gameVersion} = this.props as IProps;
        var client = new BeatModsClient(api);
        var allVersions = await client.getAllGameVersions();
        var modVersion = getCompatibleModVersion(gameVersion, allVersions)
        this.setState({gameVersion, modVersion});
        return modVersion;
    }

    async refreshMods(moddingVersion?: string) {
        var {api} = this.props as IProps;
        var client = new BeatModsClient(api);
        var version = moddingVersion ?? this.state.modVersion;
        traceLog('refreshing all mods', {modVersion: version});
        var mods = await client.getAllMods(version);
        this.setState({selected: '', modVersion: version});
        return mods;
    }

    forceGameVersion = async (version: string) => {
        const {availableVersions} = this.props
        var moddingVersion = getCompatibleModVersion(version, availableVersions);
        await this.refreshMods(moddingVersion);
        this.setState({modVersion: moddingVersion} as IBeatModsListState);
    }

    selectMod = (modName: string) => {
        var { mods } = this.props;
        // var mod = mods.find(m => m.name == modName);
        var mod = Object.values(mods).find(m => m.name == modName);
        this.setState({selected: mod._id});
    }

    startInstall = (mod: IModDetails) => {
        var { api } = this.props as IProps;
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
                directDownloadInstall(api, mod, err, id, (api) => {
                    setDownloadModInfo(api.store, id, {...mod, source: 'beatmods'}, {beatmods: mod});
                    this.refreshMods();
                });
            }, 
            true);
    }

    public render() {
        const { selected, modVersion, isLoading, searchFilter } = this.state;
        const { t, mods, availableVersions, gameVersion } = this.props;
        // traceLog('rendering mod list', {searchFilter: searchFilter ?? 'none'});
        const mod: IModDetails = (selected == undefined || !selected || Object.keys(mods).length == 0)
            ? null
            : Object.values(mods).find(iter => iter._id == selected);
        if (mod) {
            traceLog('matched mod from list entry selection', { name: mod?.name, category: mod?.category });
        }
        return (
            <MainPage ref={(mainPage) => { this.mainPage = mainPage; }}>
                <MainPage.Header ref={(header) => { this.header = header; }}>
                    <FlexLayout type="column">
                        <FlexLayout type="row">
                        {this.renderVersionSwitcher(gameVersion, Object.keys(availableVersions).concat(Object.values(availableVersions).flat()))}
                        {this.renderSearchBox()}
                        </FlexLayout>
                    </FlexLayout>
                </MainPage.Header>
                <MainPage.Body>
                    {isLoading
                    ? this.renderLoadingSpinner()
                    :
                    <Panel id="beatmods-browse">
                        <Panel.Body>
                            {gameVersion && this.props.mods != null
                            ?
                            <FlexLayout type="row">
                                <FlexLayout.Fixed className="beatmods-modlist" style={{maxWidth: '40%'}}>
                                    <FlexLayout type='column'>
                                            {Object.keys(this.props.mods).length > 0
                                                ? <ListGroup>
                                                    {Object.values(this.props.mods)
                                                        .filter(m => gameVersion ?  supportsModVersion(m.gameVersion, modVersion, availableVersions) : true)
                                                        .filter(s => searchFilter ? s.name.toLowerCase().indexOf(searchFilter.toLowerCase()) !== -1 : true)
                                                        .map(this.renderListEntry)} {/* only returns ListGroupEntry */}
                                                </ListGroup>
                                                : t("bs:BeatModsList:ChooseVersionHelp")
                                            }
                                        <div className='beatmods-list-status'>
                                            {`Loaded ${Object.keys(mods).length} mods for ${gameVersion ? `Beat Saber v${gameVersion}` : 'unknown version'} (mod version ${modVersion}).`}
                                            <Button icon='refresh' tooltip={'Refresh'} onClick={() => this.refreshMods()}>Refresh</Button>
                                        </div>
                                    </FlexLayout>
                                </FlexLayout.Fixed>
                                <FlexLayout.Flex fill={true}>
                                        {((selected == undefined || !selected) || (mod == undefined || !mod)) ? null : this.renderDescription(mod)}
                                </FlexLayout.Flex>
                            </FlexLayout>
                            : <>{t("bs:BeatModsList:ChooseVersionUnknown")}</>
                            }
                        </Panel.Body>
                    </Panel>
                    }
                </MainPage.Body>
            </MainPage>
        );
    }

    private isInstalled = (mod: IModDetails): boolean => {
        var {installed} = (this.props as IProps);
        if (installed && Object.keys(installed)) {
            var keys = Object.keys(installed);
            var isInstalled = installed && Object.keys(installed) && Object.keys(installed).filter(BeatModsClient.isBeatModsArchive).some(m => m == `${mod.name}-${mod.version}`);
            traceLog('pulled installed mod list', {match: isInstalled ?? 'unknown', count: keys.length, keys});
            return isInstalled;
        } else {
            log('debug', 'no installed mods found, assuming not already installed!');
            return false;
        }
    }

    private isCompatible = (mod: IModDetails): boolean => {
        var {modVersion} = this.state;
        var {availableVersions, gameVersion} = this.props;
        return supportsModVersion(gameVersion, modVersion, availableVersions);
    }

    private selectListEntry = (evt: React.MouseEvent<any>, modId: string) => {
        const modIdStr = modId ?? evt.currentTarget.getAttribute('data-modid');
        log('debug', 'new mod selected', { mod: modIdStr });
        this.setState({ selected: modIdStr });
    }

    private openMoreInfo = (evt: React.MouseEvent<any>) => {
        var link = evt.currentTarget.getAttribute('data-infolink');
        if (!link) {
            let modIdStr = evt.currentTarget.getAttribute('data-modid');
            const { mods } = this.props;
            link = mods[modIdStr]?.link;
        }
        log('debug', 'opening more info link', { link });
        if (link) {
            util.opn(link);
        }
    }

    private handleSearchFilter = (evt: React.ChangeEvent<any>) => {
        log('debug', 'setting mod list filter', {searchFilter: evt.target.value});
        this.setState({searchFilter: evt.target.value});
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

    private renderVersionSwitcher = (gameVersion: string, availableVersions: string[]) => {
        return (<FlexLayout type="row">
            <span style={{fontWeight: 'bold', margin: '0.25em'}}>Beat Saber Version: </span>
            <ButtonGroup aria-label="Game Version" className="version-switcher">
                {rsort(availableVersions, { loose: true}).slice(0,6).map(av => {
                    return <Button className={gameVersion == av ? "active" : ""} onClick={() => this.forceGameVersion(av)}>{av}</Button>
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
                key={mod._id}
                data-modid={mod._id}
                className={"beatmods-item"}
                active={mod._id == selected}
                onClick={(e) => this.selectListEntry(e, mod._id)}
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
                </div>
            </ListGroupItem>
        )
    }

    private renderDescription = (mod: IModDetails) => {
        traceLog('attempting render of mod details', { name: mod.name, author: mod.author.username, category: mod.category, description: mod.description });
        var ready = {
            compatible: this.isCompatible(mod),
            installed: this.isInstalled(mod),
        };
        const { t, gameVersion } = this.props;
        // ready.installReady = ready.compatible && !ready.installed
        return (
            <FlexLayout type='column'>
                <FlexLayout.Fixed>
                    <FlexLayout type='row' className='description-header' fill={false}>
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
                                        {t('bs:BeatModsList:MoreInfo')}
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
                                        <Breadcrumb.Item active>{t("bs:BeatModsList:Dependencies")}</Breadcrumb.Item>
                                        {mod.dependencies.map(d => {
                                            return <Breadcrumb.Item onClick={() => this.selectMod(d.name)}>{d.name}</Breadcrumb.Item>
                                        })}
                                    </Breadcrumb>
                                }
                            </FlexLayout>
                        </FlexLayout.Flex>
                        <FlexLayout.Fixed className="description-version-warning">
                            {gameVersion == mod.gameVersion
                                ? <></>
                                : t("bs:BeatModsList:VersionWarning", {gameVersion: mod.gameVersion, installedVersion: gameVersion ?? t('your version')})
                            }
                        </FlexLayout.Fixed>
                        <FlexLayout.Fixed>
                            {ready && <Button 
                                className='description-footer-action'
                                onClick={() => this.startInstall(mod)}
                                disabled={!ready.compatible || ready.installed}
                            >{ready.installed
                                ? 'Installed'
                                : ready.compatible
                                    ? t('bs:BeatModsList:ReadyToInstall')
                                    : t('bs:BeatModsList:NotCompatible')}
                            </Button>}
                        </FlexLayout.Fixed>
                    </FlexLayout>
                </FlexLayout.Fixed>
            </FlexLayout>

        );
    }

    async componentDidMount() {
        log('debug', 'mod list component mounted');
        var modVersion = await this.getVersions();
        var response = await this.refreshMods(modVersion); // we still need to do this, since this call is what populates the session store
        this.setState({isLoading: false});
        
    }
}

function mapStateToProps(state: IState): IConnectedProps {
    // log('debug', 'mapping beatvortex state to props');
    return {
        installed : util.getSafe(state.persistent, ['mods', GAME_ID], {}),
        mods: state.session['beatvortex']['mods'], //for the record, this not being a getSafe is intentional
        availableVersions: util.getSafe(state.session, ['beatvortex', 'modVersions'], {}),
        gameVersion: util.getSafe(state.session, ['beatvortex', 'gameVersion'], undefined)
    };
  }
  
  function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>, ownProps: IBaseProps): IActionProps {
    return {}
  }

export default withTranslation(['beatvortex', 'game-beatsaber', 'common'])(connect(mapStateToProps)(BeatModsList));