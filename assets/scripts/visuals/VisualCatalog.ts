/** Stable gameplay identifiers only. Labels may change without changing artwork. */
export const DEVICE_KEYS = Object.freeze([
    'mouse', 'keyboard', 'headset', 'power', 'network', 'usb', 'router', 'controller', 'speaker',
    'battery', 'wheel', 'microphone', 'camera', 'light', 'soundcard', 'fan', 'memory', 'drive', 'gpu',
] as const);

const DRAG: Readonly<Record<string, readonly string[]>> = Object.freeze({
    'drag-1': ['mouse', 'keyboard', 'headset'],
    'drag-2': ['power', 'network', 'usb'],
    'drag-3': ['router', 'controller', 'speaker'],
    'mouse-parts': ['battery', 'wheel'],
    'streaming-devices': ['microphone', 'camera', 'light', 'soundcard'],
    'case-parts': ['fan', 'memory', 'drive', 'gpu'],
});
const CABLE: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
    'computer-cables': { power: 'power', display: 'display', network: 'network' },
    'router-cables': { power: 'power', wan: 'network', lan: 'network' },
    'streaming-cables': { microphone: 'audio', camera: 'usb' },
    'case-cables': { motherboard: 'motherboard', cpu: 'cpu', sata: 'sata', fan: 'fan' },
});
const CLEAN: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
    'keyboard-clean': { keyboard: 'keyboard-clean' },
    'shell-clean': { mouse: 'mouse-clean' },
    'case-clean': { case: 'case-clean' },
});

function missing(kind: string, stage: string, id: string): never {
    throw new Error(`[VisualCatalog] Missing ${kind} artwork mapping for ${stage}/${id}.`);
}

export function dragVisualKey(stageId: string, pairId: string): string {
    return DRAG[stageId] && DRAG[stageId].indexOf(pairId) >= 0 ? `devices/${pairId}` : missing('drag', stageId, pairId);
}

export function cableVisualKey(stageId: string, cableId: string, role: 'head' | 'port'): string {
    const shape = CABLE[stageId]?.[cableId];
    return shape ? `ports/${shape}-${role}` : missing('cable', stageId, cableId);
}

export function cleanVisualKey(stageId: string, areaId: string): string {
    const shape = CLEAN[stageId]?.[areaId];
    return shape ? `workbench/${shape}` : missing('clean', stageId, areaId);
}
