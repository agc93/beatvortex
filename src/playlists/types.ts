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

/**
 * Returns the name of a given playlist map/entry.
 * 
 * @remarks
 * - This is necessary because the bplist format is very loose, and there's no consensus on name vs songName
 * - There's also no actual formal requirement to include a name, so this will fallback to the key, then to the hash.
 * 
 * @param map The playlist map to retrieve a name for.
 */
export function getSongName(map: IPlaylistEntry) {
    return map.songName ?? map.name ?? map.key ?? map.hash;
}

