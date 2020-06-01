import { ITool } from 'vortex-api/lib/types/ITool';
import { IInstruction } from 'vortex-api/lib/types/api';

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
        id: 'syncsaber-service',
        name: 'SyncSaber Service',
        shortName: 'SyncSaber',
        executable: () => 'SyncSaberConsole.exe',
        requiredFiles: ['SyncSaberConsole.exe'],
        relative: false,
        shell: true,
        exclusive: false
    }
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
    EnablePlaylists: 'bs_oci_playlist',
    AllowUnknown: 'bs_allow_unknown'
};