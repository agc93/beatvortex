import { tooltip as tt, Icon, util, ComponentEx } from "vortex-api";
import { withTranslation } from 'react-i18next';

import update from 'immutability-helper';
import * as React from 'react';
import {Form, FormControl, ControlLabel, FormGroup, InputGroup} from "react-bootstrap";

export interface IBaseProps {
  id: string;
  tooltip: string;
  onConfirmed: (input: string) => void;
  initialValue?: string;
  label?: string
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
    const { t, id, tooltip, label } = this.props;
      const { input } = this.state;
      return (
        <div className='inline-form'>
          <div style={{ flexGrow: 0 }}>
            <Form inline>
              <FormGroup controlId={id + "-group"}>
                {label &&
                  <ControlLabel style={{marginRight: '1.2em'}}>{label}</ControlLabel>
                }{' '}
                <InputGroup>
                  <FormControl
                    id={id}
                    type='text'
                    value={input}
                    onChange={this.updateInput}
                    onKeyPress={this.handleKeypress}
                  />{' '}
                  <InputGroup.Button>
                    <tt.Button
                      id='accept-input'
                      tooltip={t('Confirm')}
                      onClick={this.confirmInput}
                    >
                      <Icon name='input-confirm' />
                    </tt.Button>
                  </InputGroup.Button>
                  <InputGroup.Button>
                    <tt.Button
                      id='cancel-input'
                      tooltip={t('Clear')}
                      onClick={this.clearInput}
                    >
                      <Icon name='input-cancel' />
                    </tt.Button>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>{' '}
            </Form>
          </div>
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
    this.props.onConfirmed('');
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
