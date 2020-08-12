import { createAction } from 'redux-act';
import { util, actions } from "vortex-api";
import { IReducerSpec } from 'vortex-api/lib/types/api';

export const acknowledgeNotice =
    createAction('BS_ACK_NOTICE', (noticeId: string) => noticeId);

/**
* reducer for general app state
*/
export const noticeReducer : IReducerSpec = {
    reducers: {
        [acknowledgeNotice as any]: (state, noticeId: string) => {
            return util.addUniqueSafe(state, ['hidden'], noticeId);
        },
    },
    defaults: {
        hidden: []
    },
};

export const noticeStatePath = {
    root: ['persistent', 'beatvortex', 'notices'],
    hidden: ['beatvortex', 'notices', 'hidden']
}