import { HttpClient } from "../httpClient";
import { IExtensionApi, INotificationAction } from "vortex-api/lib/types/api";
import { util, log } from "vortex-api";
import { noticeStatePath, acknowledgeNotice } from "./store";
import { renderMarkdown } from "../util";

export class NoticeClient extends HttpClient {
    private _api: IExtensionApi;
    /**
     *
     */
    constructor(api: IExtensionApi) {
        super();
        this._api = api;
    }

    getNotices = async (): Promise<INoticeSet> => {
        var url = 'https://beatvortex.dev/notices';
        var resp = await this.getApiResponse<INoticeSet>(url, (data) => data, (err) => null);
        if (resp != null && Object.keys(resp).length > 0) {
            return resp;
        } else {
            return null;
        }
    }

    getUnreadNotices = async (): Promise<INoticeSet> => {
        var read = util.getSafe(this._api.getState().persistent, noticeStatePath.hidden, []);
        var notices = await this.getNotices();
        return notices == null
            ? {}
            : Object.keys(notices).filter((id) => read.indexOf(id) == -1).reduce((prev, id) => {
                prev[id] = notices[id];
                return prev;
            }, {});
    }

}

export async function showNotices(api: IExtensionApi) {
    try {
        var client = new NoticeClient(api);
        var notices = await client.getUnreadNotices();
        for (const id of Object.keys(notices)) {
            var notice = notices[id];
            var notifActions: INotificationAction[] = [
                {
                    title: 'Acknowledge', action: (dismiss) => {
                        api.store.dispatch(acknowledgeNotice(id));
                        dismiss();
                    }
                }
            ]
            if (notice.body) {
                notifActions.push({
                    title: 'More...',
                    action: (dismiss) => {
                        api.showDialog('info', 'BeatVortex Notice', {
                            htmlText: renderMarkdown(notice.body)
                        }, [
                            {label: 'Close'}
                        ])
                    }
                });
            }
            api.sendNotification({
                type: 'info',
                title: notice.title ?? 'BeatVortex Notice',
                message: notice.message,
                noDismiss: true,
                actions: notifActions.reverse()
            });
        }
    } catch (err) {
        log('error', 'error while fetching beatvortex notices', { err });
    }
}

interface INoticeSet {
    [key: string]: INotice;
}

interface INotice {
    title: string;
    message: string;
    body: string;
}