import type { LevelDefinition } from './LevelDefinition';

export const LEVEL_CATALOG: readonly [LevelDefinition, LevelDefinition, LevelDefinition] = [
    {
        id: 1,
        title: '桌面整理',
        instruction: '把设备拖到对应区域',
        snapDistance: 96,
        scoreRule: { threeStarMaxTimeSeconds: 20, twoStarMaxTimeSeconds: 40,
            threeStarMaxMistakes: 0, twoStarMaxMistakes: 2 },
        items: [
            { id: 'mouse', label: '鼠标', targetLabel: '鼠标区域',
                startPosition: { x: -220, y: -300 }, targetPosition: { x: -220, y: 170 } },
            { id: 'keyboard', label: '键盘', targetLabel: '键盘区域',
                startPosition: { x: 0, y: -300 }, targetPosition: { x: 0, y: 170 } },
            { id: 'headset', label: '耳机', targetLabel: '耳机区域',
                startPosition: { x: 220, y: -300 }, targetPosition: { x: 220, y: 170 } },
        ],
    },
    {
        id: 2,
        title: '线缆急救',
        instruction: '将线缆接回正确接口',
        snapDistance: 64,
        scoreRule: { threeStarMaxTimeSeconds: 25, twoStarMaxTimeSeconds: 45,
            threeStarMaxMistakes: 0, twoStarMaxMistakes: 2 },
        items: [
            { id: 'power', label: '电源线', targetLabel: '电源接口',
                startPosition: { x: 220, y: -300 }, targetPosition: { x: -220, y: 170 } },
            { id: 'network', label: '网线', targetLabel: '网络接口',
                startPosition: { x: -220, y: -300 }, targetPosition: { x: 0, y: 170 } },
            { id: 'usb', label: 'USB 线', targetLabel: 'USB 接口',
                startPosition: { x: 0, y: -300 }, targetPosition: { x: 220, y: 170 } },
        ],
    },
    {
        id: 3,
        title: '维修订单',
        instruction: '把设备放回正确维修位',
        snapDistance: 64,
        scoreRule: { threeStarMaxTimeSeconds: 30, twoStarMaxTimeSeconds: 50,
            threeStarMaxMistakes: 1, twoStarMaxMistakes: 3 },
        items: [
            { id: 'router', label: '路由器', targetLabel: '路由器维修位',
                startPosition: { x: 0, y: -300 }, targetPosition: { x: 220, y: 170 } },
            { id: 'controller', label: '手柄', targetLabel: '手柄维修位',
                startPosition: { x: 220, y: -300 }, targetPosition: { x: -220, y: 170 } },
            { id: 'speaker', label: '音箱', targetLabel: '音箱维修位',
                startPosition: { x: -220, y: -300 }, targetPosition: { x: 0, y: 170 } },
        ],
    },
];
