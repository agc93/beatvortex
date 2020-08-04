import { IState } from "vortex-api/lib/types/api";
import { ThunkDispatch } from "redux-thunk";
import { connect } from 'react-redux';
import * as Redux from 'redux';
import { withTranslation } from "react-i18next";
import { ComponentEx, Modal, FlexLayout, log } from "vortex-api";
import { IStatResult } from "./types";
import { LoadingSpinner } from "../controls";
import { Button, ListGroup, PanelGroup, Jumbotron, Panel, Well, Label, Badge } from "react-bootstrap";
const { Breadcrumb } = require('react-bootstrap');
import { StattyClient } from "./stattyClient";
import update from 'immutability-helper';
import React, { Component } from 'react';
import { toTitleCase } from "../util";

const average = (array: number[]) => array.reduce((a, b) => a + b) / array.length;


export interface IBaseProps {
    visible: boolean;
    onHide: () => void;

}

interface IConnectedProps {
    language: string;
    // showDialog: boolean;
}

interface IComponentState {
    services: IStatResult[];
    isLoading: boolean;
    //   sessionIdx: number;
}

interface IActionProps {
    //   onShowError: (message: string, details?: string | Error) => void;
}

type IProps = IBaseProps & IActionProps & IConnectedProps;

class ServiceStatusDialog extends ComponentEx<IProps, IComponentState> {

    state: IComponentState = {
        services: [],
        isLoading: true
    }

    public render(): JSX.Element {
        const { t, visible } = this.props;
        const { services, isLoading } = this.state;

        let body: JSX.Element;

        if (isLoading) {
            body = (
                <LoadingSpinner />
            );
        } else if (!services || services.length == 0) {
            body = (
                <Modal.Body id='diagnostics-files'>
                    <Jumbotron className='diagnostics-files-error'>
                        {t('An error occurred loading Statty results.')}
                    </Jumbotron>
                </Modal.Body>
            );
        } else if (services.length > 0) {
            /* const sessionsSorted = logSessions
              .sort((lhs, rhs) => rhs.from.getTime() - lhs.from.getTime()); */
            const liveServices = services.filter(s => s.description && s.description.startsWith('http'));
            body = (

                <FlexLayout.Flex>
                    {/* <ListGroup className='diagnostics-files-sessions-panel'>
                      {services.map(this.renderService)}
                  </ListGroup> */}
                    <PanelGroup accordion>
                        {liveServices.map(this.renderService)}
                    </PanelGroup>
                </FlexLayout.Flex>
            );
        }

        return (
            <Modal bsSize='lg' onHide={this.props.onHide} show={visible} >
                <Modal.Header>
                    <Modal.Title>
                        {t('Services Status')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {body}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        id='close'
                        onClick={this.props.onHide}
                    >
                        {t('Close')}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }

    private renderService = (service: IStatResult, index: number) => {
        const { t, language } = this.props;
        const style = service.status == "operational" ? "success" : "warning";
        const recentResults = service.data.slice(0, 10);
        const uptime = Math.round(service.uptime * 100);
        const uptimeStyle = uptime == 100 ? "success" : uptime > 80 ? "warning" : "danger";
        return (
            <Panel bsStyle={style} eventKey={index}>
                <Panel.Heading>
                    <Panel.Title toggle>{service.id}</Panel.Title>
                </Panel.Heading>
                <Panel.Body collapsible>
                    <h3>{service.description}{' '}<Label bsStyle={style}>{toTitleCase(service.status)}</Label>{' '}</h3>
                    {/* <div>Last Response Time: <Badge>{service.data[0][1]}</Badge></div> */}
                    <div><b>Last Updated: </b><Label className="bv-pad-lateral">{new Date(recentResults[0][0]).toLocaleString(language)}</Label>{'  '}<b>Uptime: </b><Label className="bv-pad-lateral" bsStyle={uptimeStyle}>{uptime}%</Label></div>
                    <div><h5>Recent Response Time:</h5>
                        <Breadcrumb>
                            <Breadcrumb.Item active>⬇{Math.min(...recentResults.map(di => di[1]))}ms</Breadcrumb.Item>
                            <Breadcrumb.Item active>~{average(recentResults.map(di => di[1]))}ms</Breadcrumb.Item>
                            <Breadcrumb.Item active>⬆{Math.max(...recentResults.map(di => di[1]))}ms</Breadcrumb.Item>
                        </Breadcrumb>
                    </div>
                </Panel.Body>
            </Panel>
        );
    }

    private async updateStats(): Promise<void> {
        this.state.isLoading = true;
        var client = new StattyClient('https://stats.jackbaron.com');
        try {
            const resp = await client.getAllServices();
            this.setState(update(this.state, {
                services: { $set: resp },
                isLoading: { $set: false }
            }));
        }
        catch (err) {
            log('error', 'error while updating stats', { err });
            this.state.isLoading = false;
        }
    }

    /* public componentWillReceiveProps(nextProps: IProps) {
        this.updateStats();
    } */
    public componentDidMount() {
        this.updateStats();
    }

}








function mapStateToProps(state: IState): IConnectedProps {
    return {
        language: state.settings.interface.language
    };
}

function mapDispatchToProps(dispatch: ThunkDispatch<any, null, Redux.Action>): IActionProps {
    return {
        onShowError: (message: string, details?: string | Error) => {

        }
            // showError(dispatch, message, details),
    };
}

export default withTranslation(['common'])(connect(mapStateToProps, mapDispatchToProps)(ServiceStatusDialog));
