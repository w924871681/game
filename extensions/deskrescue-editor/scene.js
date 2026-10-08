'use strict';

const { join } = require('path');
// Scene contributions share the editor's engine and registered project classes.
module.paths.push(join(Editor.App.path, 'node_modules'));

// Creator's default_panel is a plain rounded block; default_sprite contains scenery.
const SPRITE_FRAME_UUID = 'b730527c-3233-41c2-aaf7-7cdab58f9749@f9941';
let building = false;

exports.load = function () {};
exports.unload = function () {};

async function loadBlockSpriteFrame(cc) {
    const frame = await new Promise((resolve, reject) => {
        cc.assetManager.loadAny(SPRITE_FRAME_UUID, (error, asset) => {
            if (error) reject(error);
            else resolve(asset);
        });
    });
    if (!(frame instanceof cc.SpriteFrame)) {
        throw new Error('Creator 内置色块 SpriteFrame 不可用；未修改当前场景。');
    }
    return frame;
}

exports.methods = {
    async correctDay4Appearance() {
        return require('./day4-appearance').run(require('cc'));
    },
    async buildDay4() {
        return require('./day4-scene').build(require('cc'));
    },
    inspectDay4() {
        const cc = require('cc');
        const scene = cc.director.getScene();
        const classes = {};
        for (const name of ['LevelManager', 'StageHost', 'DragMatchStageController', 'CableConnectStageController',
            'CleanSwipeStageController', 'DraggableItem', 'CableConnector', 'RunController', 'GameController', 'Day1Prototype']) {
            const Type = cc.js.getClassByName(name);
            if (!Type) throw new Error(`Class not registered: ${name}`);
            classes[name] = cc.js._getClassId(Type);
        }
        const manager = scene.getComponentInChildren(cc.js.getClassByName('LevelManager'));
        if (!manager?.stageHost) throw new Error('Day 4 LevelManager is not bound.');
        // OrderCatalog validates on import; read the actual compiled component's catalog.
        return { ok: true, classes, orders: manager.orders.map(order => ({ id: order.id, key: order.key,
            stages: order.stages.map(stage => ({ id: stage.id, kind: stage.kind })) })),
            hostUuid: manager.stageHost.node.uuid, sceneUuid: scene.uuid };
    },
    probeDay4() {
        return require('./day4-probe').run(require('cc'));
    },
    runEngineProbe() {
        if (building) return { ok: false, error: '场景操作正在执行，不能重复调用。' };
        building = true;
        try {
            return require('./probe').run(require('cc'));
        } finally {
            building = false;
        }
    },
    async correctAppearance() {
        if (building) return { ok: false, error: '场景操作正在执行，不能重复调用。' };
        building = true;
        const previousSprites = [];
        let canvasGeometry = null;
        try {
            const cc = require('cc');
            const scene = cc.director.getScene();
            if (!scene) throw new Error('没有打开的编辑器场景。');
            const canvases = scene.getComponentsInChildren(cc.Canvas)
                .filter((component) => component.node.name === 'Canvas');
            if (canvases.length !== 1) throw new Error('当前场景必须有且只有一个 Canvas。');
            const canvasComponent = canvases[0];
            const canvas = canvasComponent.node;
            const camera = canvasComponent.cameraComponent;
            const transform = canvas.getComponent(cc.UITransform);
            const playArea = canvas.getChildByName('PlayArea');
            const tutorialHint = canvas.getChildByName('TutorialHint');
            const completePanel = canvas.getChildByName('CompletePanel');
            const nextButton = completePanel && completePanel.getChildByName('NextButton');
            if (!transform || !camera || !cc.isValid(camera) || !playArea || !tutorialHint || !completePanel || !nextButton) {
                throw new Error('当前场景不是完整的 Day 3 固定场景；需要 Canvas、已绑定 UI Camera、PlayArea、TutorialHint、CompletePanel 和 NextButton。');
            }
            const fixedNodes = [canvas];
            for (let index = 1; index <= 3; index += 1) {
                const target = playArea.getChildByName(`Target${index}`);
                const item = playArea.getChildByName(`Item${index}`);
                if (!target || !item) throw new Error(`缺少 Target${index} 或 Item${index}，未执行外观校正。`);
                fixedNodes.push(target, item);
            }
            fixedNodes.push(tutorialHint, completePanel, nextButton);
            const sprites = fixedNodes.map((node) => {
                const sprite = node.getComponent(cc.Sprite);
                if (!sprite) throw new Error(`${node.name} 缺少 Sprite；外观校正只修改已有固定节点。`);
                return sprite;
            });
            const spriteFrame = await loadBlockSpriteFrame(cc);
            if (cc.director.getScene() !== scene || !cc.isValid(canvas)) {
                throw new Error('加载内置素材期间场景发生变化，请重新执行。');
            }
            canvasGeometry = {
                node: canvas, transform,
                position: canvas.position.clone(),
                width: transform.width, height: transform.height,
                cameraNode: camera.node, cameraName: camera.node.name,
            };
            for (const sprite of sprites) {
                previousSprites.push({ sprite, spriteFrame: sprite.spriteFrame, type: sprite.type, sizeMode: sprite.sizeMode });
                sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sprite.type = cc.Sprite.Type.SLICED;
                sprite.spriteFrame = spriteFrame;
                // Sprite color, node identity, input components and all refs stay intact.
            }
            transform.setContentSize(720, 1280);
            canvas.setPosition(360, 640, 0);
            camera.node.name = 'UI Camera';
            return {
                ok: true,
                message: '固定 UI 已替换为内置纯色色块，Canvas 已校正为 720 × 1280；原节点、颜色和组件引用保留。',
                correctedSpriteCount: sprites.length,
                spriteFrameUuid: SPRITE_FRAME_UUID,
                saved: false,
            };
        } catch (error) {
            for (const entry of previousSprites) {
                entry.sprite.sizeMode = entry.sizeMode;
                entry.sprite.type = entry.type;
                entry.sprite.spriteFrame = entry.spriteFrame;
            }
            if (canvasGeometry) {
                canvasGeometry.transform.setContentSize(canvasGeometry.width, canvasGeometry.height);
                canvasGeometry.node.setPosition(canvasGeometry.position);
                canvasGeometry.cameraNode.name = canvasGeometry.cameraName;
            }
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[DeskRescue] 外观校正失败：${message}`);
            return { ok: false, error: message };
        } finally {
            building = false;
        }
    },
    async buildScene() {
        if (building) return { ok: false, error: '场景装配已在执行，不能重复调用。' };
        building = true;
        const createdRoots = [];
        const addedComponents = [];
        const disabledPrototypes = [];
        const disabledDefaultNodes = [];
        let canvasGeometry = null;
        try {
            const cc = require('cc');
            const scene = cc.director.getScene();
            if (!scene) throw new Error('没有打开的编辑器场景。');
            const canvases = scene.getComponentsInChildren(cc.Canvas)
                .filter((component) => component.node.name === 'Canvas');
            if (canvases.length !== 1) {
                throw new Error('当前场景必须有且只有一个编辑器创建的 Canvas；请先使用“创建 → UI → Canvas”。');
            }
            const canvasComponent = canvases[0];
            const canvas = canvasComponent.node;
            const camera = canvasComponent.cameraComponent;
            if (!camera || !cc.isValid(camera) || !(camera.visibility & cc.Layers.Enum.UI_2D)) {
                throw new Error('Canvas 必须保留编辑器生成并绑定的 UI Camera，且 Camera Visibility 包含 UI_2D。请在 Inspector 检查后重试。');
            }
            for (const name of ['Header', 'PlayArea', 'TutorialHint', 'CompletePanel']) {
                if (canvas.getChildByName(name)) {
                    throw new Error(`Canvas 已有 ${name}；拒绝重复创建或覆盖已有节点。`);
                }
            }

            const canvasTransform = canvas.getComponent(cc.UITransform);
            if (!canvasTransform) throw new Error('Canvas 缺少 UITransform，请使用 Creator 内置 Canvas 模板。');

            const classes = {};
            for (const name of ['GameController', 'RunController', 'LevelManager', 'DraggableItem']) {
                const type = cc.js.getClassByName(name);
                if (!type) throw new Error(`项目组件 ${name} 尚未注册。请等待脚本导入完成并修复 Creator 编译错误后重试。`);
                classes[name] = type;
            }
            for (const name of ['GameController', 'RunController', 'LevelManager']) {
                if (canvas.getComponent(classes[name])) {
                    throw new Error(`Canvas 已有 ${name}；请保留该场景，使用单独的空 Canvas 装配。`);
                }
            }
            const spriteFrame = await loadBlockSpriteFrame(cc);
            // Asset loading can yield; recheck the same scene before any mutations.
            if (cc.director.getScene() !== scene || !cc.isValid(canvas)) {
                throw new Error('加载内置素材期间场景发生变化，请在目标场景重新执行。');
            }
            for (const name of ['Header', 'PlayArea', 'TutorialHint', 'CompletePanel']) {
                if (canvas.getChildByName(name)) {
                    throw new Error(`加载内置素材期间已出现 ${name}；未创建重复节点，请检查当前场景。`);
                }
            }

            canvasGeometry = {
                node: canvas, transform: canvasTransform,
                position: canvas.position.clone(),
                width: canvasTransform.width, height: canvasTransform.height,
                cameraNode: camera.node, cameraName: camera.node.name,
            };
            canvasTransform.setContentSize(720, 1280);
            canvas.setPosition(360, 640, 0);
            camera.node.name = 'UI Camera';

            // Default 3D template nodes can otherwise render a second camera behind the UI.
            // Preserve them and their previous active flags so a failed attempt can restore them.
            for (const node of scene.children) {
                const isDefaultCamera = ['Main Camera', 'MainCamera'].includes(node.name) && node.getComponent(cc.Camera);
                const isDefaultLight = ['Main Light', 'MainLight'].includes(node.name) && node.getComponent(cc.DirectionalLight);
                if (node !== canvas && node !== camera.node && (isDefaultCamera || isDefaultLight)) {
                    disabledDefaultNodes.push({ node, active: node.active });
                    node.active = false;
                }
            }

            const nodes = [];
            const color = (r, g, b, a = 255) => new cc.Color(r, g, b, a);
            const textColor = color(239, 245, 250);
            function uiNode(parent, name, x, y, width, height) {
                const node = new cc.Node(name);
                node.layer = cc.Layers.Enum.UI_2D;
                node.setPosition(x, y, 0);
                node.setScale(1, 1, 1);
                const transform = node.addComponent(cc.UITransform);
                transform.setContentSize(width, height);
                transform.setAnchorPoint(0.5, 0.5);
                node.parent = parent;
                nodes.push(node);
                if (parent === canvas) createdRoots.push(node);
                return node;
            }
            function label(parent, name, x, y, width, height, fontSize, text) {
                const node = uiNode(parent, name, x, y, width, height);
                const component = node.addComponent(cc.Label);
                component.string = text;
                component.fontSize = fontSize;
                component.lineHeight = fontSize + 10;
                component.useSystemFont = true;
                component.fontFamily = 'Microsoft YaHei';
                component.horizontalAlign = cc.HorizontalTextAlignment.CENTER;
                component.verticalAlign = cc.VerticalTextAlignment.CENTER;
                component.overflow = cc.Label.Overflow.SHRINK;
                component.enableWrapText = true;
                component.color = textColor;
                return component;
            }
            function block(node, tint) {
                const sprite = node.addComponent(cc.Sprite);
                sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sprite.type = cc.Sprite.Type.SLICED;
                sprite.spriteFrame = spriteFrame;
                sprite.color = tint;
                return sprite;
            }
            function projectComponent(node, type) {
                const component = node.addComponent(type);
                addedComponents.push(component);
                return component;
            }

            const prototypeClass = cc.js.getClassByName('Day1Prototype');
            if (prototypeClass) {
                for (const prototype of scene.getComponentsInChildren(prototypeClass)) {
                    disabledPrototypes.push({ component: prototype, enabled: prototype.enabled });
                    prototype.enabled = false;
                }
            }
            // Keep the existing Canvas adapter and UI Camera unchanged.
            if (!canvas.getComponent(cc.Sprite)) {
                addedComponents.push(block(canvas, color(24, 33, 47)));
            }

            const header = uiNode(canvas, 'Header', 0, 0, 720, 1280);
            label(header, 'GameTitle', 0, 560, 660, 64, 44, '桌面急救站');
            const levelLabel = label(header, 'LevelLabel', 0, 495, 660, 48, 28, '订单 1 / 3');
            const levelTitleLabel = label(header, 'LevelTitleLabel', 0, 435, 660, 52, 32, '桌面整理');
            const statusLabel = label(header, 'StatusLabel', 0, 350, 660, 76, 26, '把设备拖到对应区域');
            const stats = uiNode(header, 'Stats', 0, 0, 720, 640);
            const timeLabel = label(stats, 'TimeLabel', -170, 285, 300, 44, 24, '用时：0.0 秒');
            const mistakeLabel = label(stats, 'MistakeLabel', 170, 285, 300, 44, 24, '失误：0');

            const playArea = uiNode(canvas, 'PlayArea', 0, 0, 720, 1000);
            const positions = [-220, 0, 220];
            const names = ['鼠标', '键盘', '耳机'];
            const targets = positions.map((x, index) => {
                const target = uiNode(playArea, `Target${index + 1}`, x, 170, 180, 140);
                block(target, color(57, 80, 100));
                return target;
            });
            const targetLabels = targets.map((target, index) =>
                label(target, 'Label', 0, 0, 170, 100, 26, `${names[index]}区域`));
            const itemNodes = positions.map((x, index) => {
                const item = uiNode(playArea, `Item${index + 1}`, x, -300, 180, 140);
                block(item, color(35, 112, 142));
                return item;
            });
            const itemLabels = itemNodes.map((item, index) =>
                label(item, 'Label', 0, 0, 170, 100, 34, names[index]));

            const tutorialHint = uiNode(canvas, 'TutorialHint', 0, -40, 600, 70);
            block(tutorialHint, color(42, 56, 72));
            label(tutorialHint, 'TutorialLabel', 0, 0, 580, 60, 26, '拖动物品到对应区域');

            const completePanel = uiNode(canvas, 'CompletePanel', 0, -40, 660, 520);
            block(completePanel, color(34, 48, 66));
            const completeLabel = label(completePanel, 'CompleteLabel', 0, 180, 620, 64, 38, '订单完成');
            const completeDetailLabel = label(completePanel, 'CompleteDetailLabel', 0, 20, 600, 260, 26, '');
            completeDetailLabel.lineHeight = 40;
            const buttonNode = uiNode(completePanel, 'NextButton', 0, -190, 300, 88);
            block(buttonNode, color(31, 125, 132));
            const nextButton = buttonNode.addComponent(cc.Button);
            nextButton.transition = cc.Button.Transition.NONE;
            nextButton.target = buttonNode;
            nextButton.clickEvents = [];
            nextButton.interactable = true;
            const actionButtonLabel = label(buttonNode, 'Label', 0, 0, 280, 72, 30, '下一张订单');
            completePanel.active = false;

            const gameController = projectComponent(canvas, classes.GameController);
            gameController.statusLabel = statusLabel;
            gameController.totalItems = 3;
            const runController = projectComponent(canvas, classes.RunController);
            runController.timeLabel = timeLabel;
            runController.mistakeLabel = mistakeLabel;
            const items = itemNodes.map((node, index) => {
                const item = projectComponent(node, classes.DraggableItem);
                item.target = targets[index];
                item.gameController = gameController;
                item.snapDistance = 96;
                item.animationsEnabled = true;
                item.enabled = true;
                return item;
            });
            const levelManager = projectComponent(canvas, classes.LevelManager);
            Object.assign(levelManager, {
                gameController, runController, levelLabel, levelTitleLabel,
                items, itemLabels, targets, targetLabels,
                completePanel, completeLabel, completeDetailLabel,
                nextButton, actionButtonLabel, tutorialHint,
            });
            levelManager.enabled = true;

            return {
                ok: true,
                message: 'Day 3 固定场景已装配，全部 Inspector 引用已绑定。',
                sceneName: scene.name,
                canvasUuid: canvas.uuid,
                createdNodeCount: nodes.length,
                itemCount: items.length,
                targetCount: targets.length,
                disabledPrototypeCount: disabledPrototypes.length,
                disabledDefaultNodeCount: disabledDefaultNodes.length,
                saved: false,
            };
        } catch (error) {
            // Remove only this attempt's additions; preserve existing scene content.
            for (const root of createdRoots) {
                root.removeFromParent();
                root.destroy();
            }
            for (const component of addedComponents) component.destroy();
            for (const entry of disabledPrototypes) entry.component.enabled = entry.enabled;
            for (const entry of disabledDefaultNodes) entry.node.active = entry.active;
            if (canvasGeometry) {
                canvasGeometry.transform.setContentSize(canvasGeometry.width, canvasGeometry.height);
                canvasGeometry.node.setPosition(canvasGeometry.position);
                canvasGeometry.cameraNode.name = canvasGeometry.cameraName;
            }
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[DeskRescue] 场景装配失败：${message}`);
            return { ok: false, error: message };
        } finally {
            building = false;
        }
    },
};
