import { GAME_ID } from '.';

export const STEAMAPP_ID = 620980;

export const tools = [
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
    }
]

export const gameMetadata = {
    id: GAME_ID,
    name: 'Beat Saber',
    mergeMods: false,
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

