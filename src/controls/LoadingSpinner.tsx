import { ComponentEx, Spinner } from "vortex-api";
import { withTranslation } from 'react-i18next';

import * as React from 'react';


export interface IBaseProps {
    enabled?: boolean;
}

type IProps = IBaseProps;

class LoadingSpinner extends ComponentEx<IProps, {}> {

    static defaultProps: IProps = {enabled: true};
    
    constructor(props) {
        super(props);

    }

    public render(): JSX.Element {
        var { enabled } = this.props;
        return (
            enabled
                ?
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Spinner
                        style={{
                            width: '64px',
                            height: '64px',
                        }}
                    />
                </div>
                : <></>
        );
    }


}

export default
    withTranslation(['beatvortex', 'common'])(LoadingSpinner) as React.ComponentClass<IBaseProps>;
