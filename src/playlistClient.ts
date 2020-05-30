

export class PlaylistClient {
    _baseUrl: string;
    /**
     *
     */
    constructor(linkBase?: string) {
        this._baseUrl = linkBase ?? 'https://bsaber.com/PlaylistAPI/';
    }


}

export interface IPlaylistInfo {
    playlistTitle: string;
    playlistAuthor: string;
    image: string;
    songs: IPlaylistSongResponse[];
}

export interface IPlaylistSongResponse {
    name: string;
    hash: string;
    key: string;
    songName: string;
}