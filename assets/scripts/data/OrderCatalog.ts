import { LEVEL_CATALOG } from './LevelCatalog';
import type { ItemDefinition, LevelDefinition, ScoreRule } from './LevelDefinition';
import type { OrderDefinition } from './OrderDefinition';
import type { CableDefinition, CableStyle, DragPairDefinition, PointDefinition, StageDefinition } from './StageDefinition';

export const STAGE_BOUNDS = Object.freeze({ halfWidth: 360, halfHeight: 400 });

function pair(item: ItemDefinition): DragPairDefinition {
    return { id: item.id, itemLabel: item.label, targetLabel: item.targetLabel,
        itemStart: { ...item.startPosition }, targetPosition: { ...item.targetPosition } };
}

function migrate(level: LevelDefinition): OrderDefinition {
    return { id: level.id, key: `day3-${level.id}`, chapterTitle: '基础订单', title: level.title,
        scoreRule: { ...level.scoreRule }, stages: [{
            id: `drag-${level.id}`, kind: 'drag-match', title: level.title, instruction: level.instruction,
            tutorial: '拖动物品到对应区域', defaultSnapDistance: level.snapDistance,
            pairs: [pair(level.items[0]), pair(level.items[1]), pair(level.items[2])],
        }] };
}

function score(threeTime: number, threeMistakes: number, twoTime: number, twoMistakes: number): ScoreRule {
    return { threeStarMaxTimeSeconds: threeTime, threeStarMaxMistakes: threeMistakes,
        twoStarMaxTimeSeconds: twoTime, twoStarMaxMistakes: twoMistakes };
}

function cable(id: string, label: string, port: string, startY: number, portY: number,
    style: CableStyle, x: number = 260): CableDefinition {
    return { id, cableLabel: label, portLabel: port, cableStart: { x: -x, y: startY },
        portPosition: { x, y: portY }, snapDistance: 72, style };
}

function fourPair(id: string, label: string, target: string, x: number): DragPairDefinition {
    return { id, itemLabel: label, targetLabel: target,
        itemStart: { x, y: -230 }, targetPosition: { x, y: 150 } };
}

function freezeTree<T>(value: T): T {
    if (typeof value === 'object' && value !== null) {
        for (const key of Object.keys(value)) {
            const child: unknown = Object.getOwnPropertyDescriptor(value, key)?.value;
            freezeTree(child);
        }
        Object.freeze(value);
    }
    return value;
}

export const ORDER_CATALOG: readonly OrderDefinition[] = freezeTree<readonly OrderDefinition[]>([
    migrate(LEVEL_CATALOG[0]), migrate(LEVEL_CATALOG[1]), migrate(LEVEL_CATALOG[2]),
    {
        id: 4, key: 'keyboard-clean', chapterTitle: '维护入门', title: '键盘除尘', scoreRule: score(25, 0, 50, 1),
        stages: [{ id: 'keyboard-clean', kind: 'clean-swipe', title: '键盘除尘',
            instruction: '按住并滑动，清除键盘灰尘', tutorial: '按住并滑动，清除污渍',
            brushRadius: 46, requiredRatio: 0.85,
            areas: [{ id: 'keyboard', position: { x: 0, y: 0 }, size: { width: 520, height: 260 }, columns: 8, rows: 4 }] }],
    },
    {
        id: 5, key: 'computer-cables', chapterTitle: '维护入门', title: '主机接线', scoreRule: score(35, 0, 65, 2),
        stages: [{ id: 'computer-cables', kind: 'cable-connect', title: '主机接线',
            instruction: '将线头连接到对应接口', tutorial: '拖动线头连接到对应接口',
            cables: [cable('power', '电源线', '电源接口', 180, -180, 'red'),
                cable('display', '显示线', '显示接口', 0, 180, 'blue'),
                cable('network', '网线', '网络接口', -180, 0, 'yellow')] }],
    },
    {
        id: 6, key: 'mouse-maintenance', chapterTitle: '维护入门', title: '鼠标保养', scoreRule: score(55, 1, 95, 3),
        stages: [
            { id: 'shell-clean', kind: 'clean-swipe', title: '清洁外壳', instruction: '清除鼠标表面的污渍',
                tutorial: '按住并滑动，清除污渍', brushRadius: 44, requiredRatio: 0.85,
                areas: [{ id: 'mouse', position: { x: 0, y: 20 }, size: { width: 300, height: 260 }, columns: 5, rows: 4 }] },
            { id: 'mouse-parts', kind: 'drag-match', title: '装回部件', instruction: '将电池和滚轮装回对应位置',
                tutorial: '拖动物品到对应区域', defaultSnapDistance: 72,
                pairs: [
                    { id: 'battery', itemLabel: '电池', targetLabel: '电池仓', itemStart: { x: -160, y: -220 }, targetPosition: { x: -160, y: 150 } },
                    { id: 'wheel', itemLabel: '滚轮', targetLabel: '滚轮槽', itemStart: { x: 160, y: -220 }, targetPosition: { x: 160, y: 150 } },
                ] },
        ],
    },
    {
        id: 7, key: 'router-cables', chapterTitle: '综合维修', title: '路由器布线', scoreRule: score(40, 0, 75, 2),
        stages: [{ id: 'router-cables', kind: 'cable-connect', title: '路由器布线',
            instruction: '把线头接到路由器对应接口', tutorial: '拖动线头连接到对应接口',
            cables: [cable('power', '电源线', '电源口', 180, 0, 'red'),
                cable('wan', '入户网线', 'WAN 口', 0, -180, 'blue'),
                cable('lan', '电脑网线', 'LAN 口', -180, 180, 'green')] }],
    },
    {
        id: 8, key: 'streaming-desk', chapterTitle: '综合维修', title: '直播桌急救', scoreRule: score(65, 1, 115, 4),
        stages: [
            { id: 'streaming-devices', kind: 'drag-match', title: '设备归位', instruction: '把直播设备放回对应位置',
                tutorial: '拖动物品到对应区域', defaultSnapDistance: 78,
                pairs: [fourPair('microphone', '麦克风', '麦克风位', -240), fourPair('camera', '摄像头', '摄像头位', -80),
                    fourPair('light', '补光灯', '补光灯位', 80), fourPair('soundcard', '声卡', '声卡位', 240)] },
            { id: 'streaming-cables', kind: 'cable-connect', title: '连接设备', instruction: '将直播设备的线头接到对应接口',
                tutorial: '拖动线头连接到对应接口',
                cables: [cable('microphone', '麦克风线', '声卡输入', 120, -120, 'purple', 220),
                    cable('camera', '摄像头线', 'USB 接口', -120, 120, 'orange', 220)] },
        ],
    },
    {
        id: 9, key: 'computer-repair', chapterTitle: '综合维修', title: '电脑综合维修', scoreRule: score(100, 2, 170, 6),
        stages: [
            { id: 'case-clean', kind: 'clean-swipe', title: '清理机箱', instruction: '清除风扇区域积灰',
                tutorial: '按住并滑动，清除污渍', brushRadius: 48, requiredRatio: 0.90,
                areas: [{ id: 'case', position: { x: 0, y: 20 }, size: { width: 460, height: 340 }, columns: 7, rows: 5 }] },
            { id: 'case-cables', kind: 'cable-connect', title: '连接内部线缆', instruction: '将机箱线头接到对应接口',
                tutorial: '拖动线头连接到对应接口',
                cables: [cable('motherboard', '主板电源', '主板接口', 240, -80, 'red'),
                    cable('cpu', 'CPU 电源', 'CPU 接口', 80, 240, 'blue'),
                    cable('sata', 'SATA 线', '硬盘接口', -80, -240, 'yellow'),
                    cable('fan', '风扇线', '风扇接口', -240, 80, 'green')] },
            { id: 'case-parts', kind: 'drag-match', title: '部件归位', instruction: '将电脑部件装回对应位置',
                tutorial: '拖动物品到对应区域', defaultSnapDistance: 78,
                pairs: [fourPair('fan', '风扇', '风扇位', -240), fourPair('memory', '内存', '内存槽', -80),
                    fourPair('drive', '硬盘', '硬盘位', 80), fourPair('gpu', '显卡', '显卡槽', 240)] },
        ],
    },
]);

function requireValue(condition: boolean, message: string): void {
    if (!condition) throw new RangeError(`[OrderCatalog] ${message}`);
}

function positive(value: number, name: string): void {
    requireValue(Number.isFinite(value) && value > 0, `${name} must be finite and positive.`);
}

function text(value: string, name: string): void {
    requireValue(typeof value === 'string' && value.trim().length > 0, `${name} must be nonempty.`);
}

function point(value: PointDefinition, name: string): void {
    requireValue(Number.isFinite(value.x) && Number.isFinite(value.y)
        && Math.abs(value.x) <= STAGE_BOUNDS.halfWidth && Math.abs(value.y) <= STAGE_BOUNDS.halfHeight,
    `${name} is outside the StageHost bounds.`);
}

function uniqueElements(elements: readonly { readonly id: string }[], stageId: string): void {
    const ids = new Set<string>();
    for (const element of elements) {
        text(element.id, `${stageId} element id`);
        requireValue(!ids.has(element.id), `${stageId} contains duplicate element id ${element.id}.`);
        ids.add(element.id);
    }
}

function validateStage(stage: StageDefinition): void {
    text(stage.id, 'Stage id');
    text(stage.title, 'Stage title');
    text(stage.instruction, 'Stage instruction');
    text(stage.tutorial, 'Stage tutorial');
    switch (stage.kind) {
        case 'drag-match':
            positive(stage.defaultSnapDistance, 'defaultSnapDistance');
            requireValue(stage.pairs.length >= 2 && stage.pairs.length <= 4, 'Drag stages require 2–4 pairs.');
            uniqueElements(stage.pairs, stage.id);
            for (const item of stage.pairs) {
                text(item.itemLabel, 'itemLabel'); text(item.targetLabel, 'targetLabel');
                point(item.itemStart, 'itemStart'); point(item.targetPosition, 'targetPosition');
                if (item.snapDistance !== undefined) positive(item.snapDistance, 'snapDistance');
            }
            return;
        case 'cable-connect':
            requireValue(stage.cables.length >= 2 && stage.cables.length <= 4, 'Cable stages require 2–4 cables.');
            uniqueElements(stage.cables, stage.id);
            for (const item of stage.cables) {
                text(item.cableLabel, 'cableLabel'); text(item.portLabel, 'portLabel');
                point(item.cableStart, 'cableStart'); point(item.portPosition, 'portPosition');
                positive(item.snapDistance, 'snapDistance');
                requireValue(['red', 'blue', 'yellow', 'green', 'purple', 'orange'].indexOf(item.style) >= 0, 'Unknown CableStyle.');
            }
            return;
        case 'clean-swipe': {
            positive(stage.brushRadius, 'brushRadius');
            requireValue(Number.isFinite(stage.requiredRatio) && stage.requiredRatio >= 0.5 && stage.requiredRatio <= 1,
                'requiredRatio must lie within 0.5–1.0.');
            requireValue(stage.areas.length > 0, 'Clean stages require at least one area.');
            uniqueElements(stage.areas, stage.id);
            let count = 0;
            for (const area of stage.areas) {
                point(area.position, 'Clean area position');
                positive(area.size.width, 'Area width'); positive(area.size.height, 'Area height');
                requireValue(Number.isInteger(area.columns) && area.columns > 0
                    && Number.isInteger(area.rows) && area.rows > 0, 'Clean grids require positive integer dimensions.');
                requireValue(Math.abs(area.position.x) + area.size.width / 2 <= STAGE_BOUNDS.halfWidth
                    && Math.abs(area.position.y) + area.size.height / 2 <= STAGE_BOUNDS.halfHeight,
                'Clean area extends outside StageHost.');
                count += area.columns * area.rows;
            }
            requireValue(Number.isFinite(count) && count >= 1 && count <= 64, 'Clean stages require 1–64 cells.');
            return;
        }
        default:
            throw new RangeError('[OrderCatalog] Unknown stage kind.');
    }
}

/** Pure validation; neither mutates nor freezes caller-owned catalogs. */
export function validateOrderCatalog(orders: readonly OrderDefinition[]): void {
    requireValue(orders.length > 0, 'An order catalog cannot be empty.');
    const ids = new Set<number>();
    const keys = new Set<string>();
    for (const order of orders) {
        requireValue(Number.isInteger(order.id) && order.id > 0 && !ids.has(order.id), 'Order ids must be positive and unique.');
        ids.add(order.id);
        text(order.key, 'Order key');
        requireValue(!keys.has(order.key), `Duplicate order key ${order.key}.`);
        keys.add(order.key);
        text(order.title, 'Order title'); text(order.chapterTitle, 'Chapter title');
        const rule = order.scoreRule;
        requireValue(Number.isFinite(rule.threeStarMaxTimeSeconds) && rule.threeStarMaxTimeSeconds >= 0
            && Number.isFinite(rule.twoStarMaxTimeSeconds) && rule.twoStarMaxTimeSeconds >= rule.threeStarMaxTimeSeconds
            && Number.isInteger(rule.threeStarMaxMistakes) && rule.threeStarMaxMistakes >= 0
            && Number.isInteger(rule.twoStarMaxMistakes) && rule.twoStarMaxMistakes >= rule.threeStarMaxMistakes,
        'Score thresholds must be finite, nonnegative and ordered.');
        requireValue(order.stages.length >= 1 && order.stages.length <= 3, 'Orders require 1–3 stages.');
        uniqueElements(order.stages, order.key);
        order.stages.forEach(validateStage);
    }
}

validateOrderCatalog(ORDER_CATALOG);
