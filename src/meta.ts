import { ITool } from 'vortex-api/lib/types/ITool';
import { ITableAttribute } from 'vortex-api/lib/types/api';

export const STEAMAPP_ID = 620980;

export const tools : ITool[] = [
    {
        id: 'ma',
        name: 'Mod Assistant',
        shortName: 'Mod Assistant',
        executable: () => 'ModAssistant.exe',
        requiredFiles: [
            'ModAssistant.exe'
        ],
        relative: true,
        shell: false,
        exclusive: true
    },
    {
        id: 'ipa-install',
        name: 'Run IPA Installer',
        shortName: 'IPA Install',
        'executable': () => 'IPA.exe',
        requiredFiles: ['IPA.exe'],
        relative: true,
        shell: true,
        exclusive: true,
        parameters: ['-n']
    },
    {
        id: 'bs-beatsync-console',
        name: 'BeatSyncConsole',
        shortName: 'BeatSync',
        executable: () => 'BeatSyncConsole.exe',
        requiredFiles: ['BeatSyncConsole.exe'],
        relative: false,
        shell: true,
        exclusive: false
    }
    // we've removed SyncSaber Service, but need to add it back in once I understand BeatSync
]

export const gameMetadata = {
    name: 'Beat Saber',
    mergeMods: true,
    supportedTools: tools,
    queryModPath: () => '.',
    logo: 'gameart.png',
    executable: () => 'Beat Saber.exe',
    requiredFiles: [
        'Beat Saber.exe'
    ],
    details: {
        steamAppId: STEAMAPP_ID
    }
}

export const PROFILE_SETTINGS = {
    SkipTerms: 'bs_skip_terms',
    AllowUnknown: 'bs_allow_unknown'
};

const extraAttribute = {
    isGroupable: false,
    isSortable: false,
    isDefaultVisible: false,
    isToggleable: true
}

/**
 * Basic metadata for the Beat Saber-specific mod attributes
 */
export const tableAttributes: {[name: string]: ITableAttribute} = {
    difficulties: {
        id: 'bs-song-difficulties',
        edit: {},
        name: 'Difficulties',
        placement: 'table',
        icon: 'inspect',
        ...extraAttribute,
    },
    artist: {
        id: 'bs-song-artist',
        placement: 'both',
        name: 'Artist',
        help: 'Artist name for this map. Only available on BeatSaver maps!',
        edit: {},
        isToggleable: true,
        isSortable: true,
        isGroupable: true
    },
    bpm: {
        edit: {},
        id:'bs-song-bpm',
        name: 'BPM',
        placement: 'detail',
        help: 'Beats per minute average for this map. Only available on BeatSaver maps!'
    },
    modes: {
        edit: {},
        id: 'bs-song-variants',
        name: 'Map Modes',
        placement: 'both',
        icon: 'inspect',
        help: 'Available modes for this map, such as 360° or Single Saber. Only available on BeatSaver maps!',
        ...extraAttribute
    }
}