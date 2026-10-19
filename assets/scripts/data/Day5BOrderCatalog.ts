import type { PlayableOrderDefinition as OrderDefinition } from './Day5BStageDefinition';
import type { HotspotDefinition } from './Day5BStageDefinition';
import { ORDER_CATALOG, validateOrderCatalog as validateLegacyOrderCatalog } from './OrderCatalog';
import { validateDay5BStage } from './Day5BStageValidation';

function control(id: string, label: string, x: number, y: number, width: number = 120, height: number = 110): HotspotDefinition {
    return { id, label, position: { x, y }, size: { width, height } };
}
function freeze<T>(value: T): T {
    if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) freeze(Object.getOwnPropertyDescriptor(value, key)?.value);
        Object.freeze(value);
    }
    return value;
}

/** Advanced orders use the same scoring and StageRuntime contract as the frozen prefix. */
export const DAY5B_ORDERS: readonly OrderDefinition[] = freeze<readonly OrderDefinition[]>([
    { id: 10, key: 'controller-drift', chapterTitle: '进阶维修', title: '手柄摇杆漂移',
        scoreRule: { threeStarMaxTimeSeconds: 28, threeStarMaxMistakes: 0, twoStarMaxTimeSeconds: 55, twoStarMaxMistakes: 2 },
        stages: [
            { id: 'controller-align', kind: 'rotary-control', mode: 'align', device: 'controller', title: '摇杆校准',
                instruction: '转动校准环，让指针回到绿色刻度', tutorial: '沿圆环旋转，松手后保持绿色0.6秒',
                center: { x: -100, y: 30 }, radius: 125, ringWidth: 70, initialAngle: 55, targetAngle: 0, toleranceDegrees: 12, holdSeconds: 0.6 },
            { id: 'controller-input-test', kind: 'sequence-test', device: 'controller', title: '方向键检测',
                instruction: '按提示逐个测试方向键', tutorial: '当前目标一直显示，点错不清空已完成步骤',
                choices: [control('up', '↑', 0, 30), control('left', '←', -160, -110), control('down', '↓', 0, -250), control('right', '→', 160, -110)],
                sequence: ['up', 'left', 'down', 'right'] },
        ] },
    { id: 11, key: 'printer-paper-jam', chapterTitle: '进阶维修', title: '打印机卡纸救援',
        scoreRule: { threeStarMaxTimeSeconds: 40, threeStarMaxMistakes: 0, twoStarMaxTimeSeconds: 80, twoStarMaxMistakes: 2 },
        stages: [
            { id: 'printer-find-jam', kind: 'fault-spot', device: 'printer', title: '定位卡纸',
                instruction: '观察纸张，找出卡住的位置', tutorial: '点选有明显皱纸的出纸口', faultId: 'output', clueText: '出纸口有皱纸！请选择真正卡住的位置',
                hotspots: [control('input', '进纸口', -210, -70, 150, 130), control('roller', '滚轮区', 0, -70, 150, 130), control('output', '出纸口', 210, -70, 150, 130)] },
            { id: 'printer-extract-paper', kind: 'guided-trace', device: 'printer', title: '沿轨抽纸',
                instruction: '按住纸张手柄，沿轨道通过三个检查点', tutorial: '离轨会回到已通过的检查点，不扣失误',
                points: [{ x: -180, y: 150 }, { x: -135, y: 60 }, { x: -15, y: -40 }, { x: 155, y: -150 }],
                tolerance: 48, checkpointRadius: 48, maxSampleDistance: 180 },
            { id: 'printer-align-roller', kind: 'rotary-control', mode: 'align', device: 'printer', title: '校准滚轮',
                instruction: '沿圆环转动滚轮，松手对准绿色刻度', tutorial: '松手后稳定0.6秒，测试纸才会顺利吐出',
                center: { x: 0, y: -20 }, radius: 125, ringWidth: 70, initialAngle: 55, targetAngle: 0, toleranceDegrees: 12, holdSeconds: 0.6 },
        ] },
    { id: 12, key: 'keyboard-double-press', chapterTitle: '进阶维修', title: '键盘连击故障',
        scoreRule: { threeStarMaxTimeSeconds: 30, threeStarMaxMistakes: 0, twoStarMaxTimeSeconds: 60, twoStarMaxMistakes: 2 },
        stages: [
            { id: 'keyboard-find-key', kind: 'fault-spot', device: 'keyboard', title: '找出连击键',
                instruction: '逐个试按，观察输出，再确认故障键', tutorial: '试按不计失误；观察输出后，点击确认故障键', faultId: 'S',
                clueText: '逐个试按，观察输出结果', diagnosticMode: 'test-and-confirm',
                hotspots: [control('S', 'S', -210, -70), control('A', 'A', 0, -70), control('D', 'D', 210, -70),
                    control('F', 'F', -210, -220), control('J', 'J', 0, -220), control('K', 'K', 210, -220)] },
            { id: 'keyboard-test-keys', kind: 'sequence-test', device: 'keyboard', title: '按键复检',
                instruction: '按当前提示测试 S、A、D 和空格', tutorial: '按下大键帽，点错只提示当前目标',
                choices: [control('S', 'S', -210, -70), control('A', 'A', 0, -70), control('D', 'D', 210, -70), control('space', '空格', 0, -230, 330, 110)],
                sequence: ['S', 'A', 'D', 'space'] },
        ] },
    { id: 13, key: 'cooling-fan-noise', chapterTitle: '进阶维修', title: '散热风扇异响',
        scoreRule: { threeStarMaxTimeSeconds: 38, threeStarMaxMistakes: 0, twoStarMaxTimeSeconds: 75, twoStarMaxMistakes: 2 },
        stages: [
            { id: 'fan-unscrew-cover', kind: 'rotary-control', mode: 'unscrew', device: 'fan', title: '旋松护盖',
                instruction: '按箭头方向旋松两枚螺丝', tutorial: '沿圆环逆时针旋转，每枚需要 270°', radius: 70, ringWidth: 60,
                screws: [control('left', '左螺丝', -170, -100, 210, 210), control('right', '右螺丝', 170, -100, 210, 210)],
                requiredDegrees: 270, direction: 'counterclockwise' },
            { id: 'fan-tune', kind: 'gauge-tune', mode: 'fan', device: 'fan', title: '温度与噪声调节',
                instruction: '调节转速和风道，让温度与噪声同时达标', tutorial: '观察实时指数，双绿后松手保持 0.7 秒', initialControls: [90, 20], holdSeconds: 0.7 },
        ] },
    { id: 14, key: 'headphone-channel-balance', chapterTitle: '进阶维修', title: '耳机左右声道失衡',
        scoreRule: { threeStarMaxTimeSeconds: 32, threeStarMaxMistakes: 0, twoStarMaxTimeSeconds: 65, twoStarMaxMistakes: 2 },
        stages: [
            { id: 'headset-find-channel', kind: 'fault-spot', device: 'headset', title: '声道定位',
                instruction: '观察左右波形，找出声音过小的一侧', tutorial: '左侧波形明显大，右侧几乎没有声音', faultId: 'R', clueText: '左侧正常，右侧波形很小；请选择故障声道',
                hotspots: [control('L', 'L 左', -170, -100, 180, 150), control('R', 'R 右', 170, -100, 180, 150)] },
            { id: 'headset-balance', kind: 'gauge-tune', mode: 'stereo', device: 'headset', title: '左右声道平衡',
                instruction: '调节 L 与 R，保持适中响度和左右平衡', tutorial: '左右差不超过 8，平均响度在 45–75，松手保持 0.7 秒', initialControls: [85, 20], holdSeconds: 0.7 },
        ] },
    { id: 15, key: 'livestream-rescue', chapterTitle: '进阶维修', title: '直播间紧急救场',
        scoreRule: { threeStarMaxTimeSeconds: 60, threeStarMaxMistakes: 1, twoStarMaxTimeSeconds: 110, twoStarMaxMistakes: 4 },
        stages: [
            { id: 'live-route-signal', kind: 'guided-trace', device: 'livestream', title: '恢复信号走线',
                instruction: '沿走线槽依次穿过三个引导环', tutorial: '避开红色障碍，离轨会返回已确认的检查点',
                points: [{ x: -265, y: -185 }, { x: -160, y: -70 }, { x: 15, y: 45 }, { x: 230, y: 160 }],
                tolerance: 48, checkpointRadius: 48, maxSampleDistance: 180 },
            { id: 'live-tune-stream', kind: 'gauge-tune', mode: 'broadcast', device: 'livestream', title: '画面与音量调节',
                instruction: '调好画面稳定度与直播音量', tutorial: '画面 65–85、音量 50–75，双绿后松手保持 0.7 秒', initialControls: [20, 25], holdSeconds: 0.7 },
            { id: 'live-final-check', kind: 'sequence-test', device: 'livestream', title: '开播前功能检查',
                instruction: '按提示依次输入、同步、检查、开播', tutorial: '当前目标一直显示，四步检测后恢复直播',
                choices: [control('input', '输入', -160, -70, 180, 110), control('sync', '同步', 160, -70, 180, 110),
                    control('check', '检查', -160, -230, 180, 110), control('go', '开播', 160, -230, 180, 110)],
                sequence: ['input', 'sync', 'check', 'go'] },
        ] },
]);

/** Legacy catalog stays identical for historical224 fixtures; formal Scene explicitly opts in. */
export const PLAYABLE_ORDER_CATALOG: readonly OrderDefinition[] = freeze([...ORDER_CATALOG, ...DAY5B_ORDERS]);
export function validatePlayableOrderCatalog(orders: readonly OrderDefinition[]): void {
    if (!orders.length) throw new RangeError('[Day5B] An order catalog cannot be empty.');
    const ids = new Set<number>(), keys = new Set<string>();
    for (const order of orders) {
        if (!Number.isInteger(order.id) || order.id <= 0 || ids.has(order.id)
            || typeof order.key !== 'string' || !order.key.trim() || keys.has(order.key)
            || !order.title?.trim() || !order.chapterTitle?.trim() || order.stages.length < 1 || order.stages.length > 3) {
            throw new RangeError('[Day5B] Invalid or duplicate order identity/stages.');
        }
        ids.add(order.id); keys.add(order.key);
        const rule = order.scoreRule;
        if (!Number.isFinite(rule.threeStarMaxTimeSeconds) || rule.threeStarMaxTimeSeconds < 0
            || !Number.isFinite(rule.twoStarMaxTimeSeconds) || rule.twoStarMaxTimeSeconds < rule.threeStarMaxTimeSeconds
            || !Number.isInteger(rule.threeStarMaxMistakes) || rule.threeStarMaxMistakes < 0
            || !Number.isInteger(rule.twoStarMaxMistakes) || rule.twoStarMaxMistakes < rule.threeStarMaxMistakes) {
            throw new RangeError('[Day5B] Invalid scoring thresholds.');
        }
        const stageIds = new Set<string>();
        for (const stage of order.stages) {
            if (!stage.id?.trim() || stageIds.has(stage.id) || !stage.title?.trim()
                || !stage.instruction?.trim() || !stage.tutorial?.trim()) throw new RangeError('[Day5B] Invalid stage identity/text.');
            stageIds.add(stage.id);
            switch (stage.kind) {
                case 'drag-match': case 'cable-connect': case 'clean-swipe':
                    validateLegacyOrderCatalog([{ ...order, stages: [stage] }]); break;
                case 'fault-spot': case 'rotary-control': case 'guided-trace': case 'gauge-tune': case 'sequence-test':
                    validateDay5BStage(stage); break;
                default: throw new RangeError('[Day5B] Unknown stage kind.');
            }
        }
    }
}
validatePlayableOrderCatalog(PLAYABLE_ORDER_CATALOG);
