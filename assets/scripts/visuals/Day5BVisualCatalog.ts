import type { Day5BDevice } from '../data/Day5BStageDefinition';

/** Separate stable namespace; the existing 49 VisualCatalog keys remain intact. */
export const DAY5B_VISUAL_KEYS = Object.freeze([
    'day5b/devices/controller', 'day5b/devices/printer', 'day5b/devices/keyboard',
    'day5b/devices/fan', 'day5b/devices/headset', 'day5b/devices/livestream',
    'day5b/layers/joystick', 'day5b/layers/paper-crumpled', 'day5b/layers/paper-test',
    'day5b/layers/keycap', 'day5b/layers/screw', 'day5b/layers/fan-blades',
    'day5b/layers/fan-cover', 'day5b/layers/trace-handle', 'day5b/layers/slider-thumb',
] as const);

export type Day5BVisualKey = typeof DAY5B_VISUAL_KEYS[number];

export function day5BDeviceKey(device: Day5BDevice): Day5BVisualKey {
    switch (device) {
        case 'controller': return 'day5b/devices/controller';
        case 'printer': return 'day5b/devices/printer';
        case 'keyboard': return 'day5b/devices/keyboard';
        case 'fan': return 'day5b/devices/fan';
        case 'headset': return 'day5b/devices/headset';
        case 'livestream': return 'day5b/devices/livestream';
    }
}

export function day5BVisualPath(key: Day5BVisualKey): string {
    return `assets/art/${key}.png`;
}
