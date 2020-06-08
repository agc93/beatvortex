export interface ILocalPlaylist {
    filePath: string;
    title: string;
    authorName: string;
    image: string;
    maps: IPlaylistEntry[];
}

export interface IPlaylistEntry {
    songName: string;
    name: string;
    hash: string;
    key: string;
}

export function getSongName(map: IPlaylistEntry) {
    return map.songName ?? map.name;
}

