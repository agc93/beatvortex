import { tooltip as tt, ToolbarIcon, Icon, util, ComponentEx } from "vortex-api";
import { IState } from "vortex-api/lib/types/api";
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';

import update from 'immutability-helper';
import * as React from 'react';
const { FormControl } = require('react-bootstrap');
import * as Redux from 'redux';
import { ThunkDispatch } from 'redux-thunk';

export interface IBaseProps {
  id: string;
  tooltip: string;
  onConfirmed: (input: string) => void;
  initialValue?: string;
}

interface IComponentState {
  input: string;
}

type IProps = IBaseProps;

class InputButton extends ComponentEx<IProps, IComponentState> {
  constructor(props) {
    super(props);

    this.state = {
      input: props?.initialValue ?? '',
    };
  }

  public render(): JSX.Element {
    const { t, id, tooltip } = this.props;
      const { input } = this.state;
      return (
        <div className='inline-form'>
          <div style={{ flexGrow: 0 }}>
            <FormControl
              id={id}
              autoFocus
              type='text'
              value={input}
              onChange={this.updateInput}
              onKeyPress={this.handleKeypress}
            />
          </div>
          <tt.Button
            id='accept-input'
            tooltip={t('Confirm')}
            onClick={this.confirmInput}
          >
            <Icon name='input-confirm' />
          </tt.Button>
          <tt.Button
            id='cancel-input'
            tooltip={t('Cancel')}
            onClick={this.clearInput}
          >
            <Icon name='input-cancel' />
          </tt.Button>
        </div>
      );
  }

  private updateInput = (event) => {
    this.setState(update(this.state, {
      input: { $set: event.target.value },
    }));
  }

  private clearInput = () => {
    this.setState(update(this.state, {
      input: { $set: '' },
    }));
  }

  private handleKeypress = (evt: React.KeyboardEvent<any>) => {
    if (evt.which === 13) {
      evt.preventDefault();
      this.confirmInput();
    }
  }

  private confirmInput = () => {
    this.props.onConfirmed(this.state.input);
  }
}

export default
  withTranslation([ 'common' ])(InputButton) as React.ComponentClass<IBaseProps>;
