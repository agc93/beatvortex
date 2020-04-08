import axios from 'axios';
import { log } from 'vortex-api';

export async function getMapName(modName: any, targetName: string) {
    await axios.get(`https://beatsaver.com/api/maps/by-hash/${modName}`)
        .then((resp) => {
            log('debug', resp.data);
            targetName = `${resp.data.name} [${resp.data.key}]`;
        })
        .catch((err) => {
            log('warn', err);
        });
    return targetName;
}

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