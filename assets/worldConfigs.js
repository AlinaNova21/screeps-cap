/* Copied from screeps renderer demo */
/**
 * Created by vedi on 07/04/2017.
 */

require('@screeps/renderer-metadata');

module.exports = {
    ATTACK_PENETRATION: 10,
    CELL_SIZE: 100,
    RENDER_SIZE: {
        width: 2048,
        height: 2048,
    },
    VIEW_BOX: 5000,
    BADGE_URL: '/api/user/badge-svg?username=%1',
    metadata: RENDERER_METADATA,
    gameData: {
        player: '', //561e4d4645f3f7244a7622e8',
        showMyNames: {
            spawns: false,
            creeps: false,
        },
        showEnemyNames: {
            spawns: false,
            creeps: false,
        },
        showFlagsNames: true,
        showCreepSpeech: true,
        swampTexture: 'animated',
        // swampTexture: 'disabled',
    },
    // lighting: 'disabled',
    lighting: 'normal',
    forceCanvas: false,
};