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