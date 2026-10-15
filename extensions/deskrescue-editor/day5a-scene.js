'use strict';

const CLASS_NAMES = ['LevelManager', 'RunController', 'GameController', 'StageHost', 'DraggableItem', 'CableConnector',
    'DragMatchStageController', 'CableConnectStageController', 'CleanSwipeStageController',
    'HomeController', 'AudioFeedback', 'ResultStars', 'VisualAssetRegistry', 'ElementVisual', 'CleanDeviceVisual'];
const PREFABS = ['elements/DragItem', 'elements/DragTarget', 'elements/Port', 'elements/Cable', 'elements/DirtCell',
    'stages/DragMatchStage', 'stages/CableConnectStage', 'stages/CleanSwipeStage'];

function types(cc) {
    const found = {};
    for (const name of CLASS_NAMES) {
        found[name] = cc.js.getClassByName(name);
        if (!found[name]) throw new Error(`Wait for Creator script import: ${name}`);
    }
    return found;
}

async function load(cc, uuid, Type) {
    let lastError;
    for (let attempt = 0; attempt < 15; attempt += 1) {
        try {
            const value = await new Promise((resolve, reject) => cc.assetManager.loadAny(uuid,
                { reloadAsset: true }, (error, asset) => error ? reject(error) : resolve(asset)));
            if (!(value instanceof Type)) throw new Error(`Unexpected asset type for ${uuid}`);
            return value;
        } catch (error) {
            lastError = error;
            if (attempt < 14) await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    throw lastError;
}

function count(node) { return 1 + node.children.reduce((sum, child) => sum + count(child), 0); }

exports.apply = async function (cc, input) {
    const scene = cc.director.getScene();
    const canvas = scene?.getChildByName('Canvas');
    const prefabApi = (globalThis.cce || globalThis.EditorExtends)?.Prefab;
    if (!canvas?.getComponent(cc.Canvas)?.cameraComponent || !prefabApi?.generatePrefabDataFromNode
        || !prefabApi.removePrefabInfoFromNode) throw new Error('Open the saved Game.scene in Creator 3.8.8.');
    const C = types(cc);
    const frames = {}, clips = {};
    for (const binding of input.bindings) {
        const target = binding.type === 'SpriteFrame' ? frames : clips;
        target[binding.key] = await load(cc, binding.uuid, binding.type === 'SpriteFrame' ? cc.SpriteFrame : cc.AudioClip);
    }
    const block = await load(cc, 'b730527c-3233-41c2-aaf7-7cdab58f9749@f9941', cc.SpriteFrame);
    const color = hex => new cc.Color().fromHEX(hex);
    const nodeCountsBefore = {}, nodeCountsAfter = {}, addedNodesByResource = {};
    const coreUuids = {}, saved = {};

    function ui(parent, name, x, y, width, height) {
        const node = parent.getChildByName(name) || new cc.Node(name);
        node.parent = parent; node.layer = cc.Layers.Enum.UI_2D;
        node.setPosition(x, y, 0);
        (node.getComponent(cc.UITransform) || node.addComponent(cc.UITransform)).setContentSize(width, height);
        return node;
    }
    function sprite(node, frame, tint = '#FFFFFF', sliced = false) {
        const value = node.getComponent(cc.Sprite) || node.addComponent(cc.Sprite);
        value.spriteFrame = frame; value.type = sliced ? cc.Sprite.Type.SLICED : cc.Sprite.Type.SIMPLE;
        value.sizeMode = cc.Sprite.SizeMode.CUSTOM; value.color = color(tint);
        return value;
    }
    function label(parent, name, x, y, width, height, size, text, tint = '#263D50') {
        const node = ui(parent, name, x, y, width, height);
        const value = node.getComponent(cc.Label) || node.addComponent(cc.Label);
        Object.assign(value, { string: text, fontSize: size, lineHeight: size + 6, useSystemFont: true,
            fontFamily: 'Microsoft YaHei', horizontalAlign: cc.HorizontalTextAlignment.CENTER,
            verticalAlign: cc.VerticalTextAlignment.CENTER, overflow: cc.Label.Overflow.SHRINK,
            enableWrapText: true, color: color(tint) });
        return value;
    }
    function panel(parent, name, x, y, width, height, tint) {
        const node = ui(parent, name, x, y, width, height);
        sprite(node, frames['ui/card'], tint, true);
        return node;
    }
    function button(parent, name, x, y, width, height, text, primary = true) {
        const node = panel(parent, name, x, y, width, height, primary ? '#2EAAA8' : '#EAF5F5');
        if (primary) sprite(node, frames['ui/button'], '#FFFFFF', true);
        const component = node.getComponent(cc.Button) || node.addComponent(cc.Button);
        component.target = node; component.transition = cc.Button.Transition.COLOR;
        component.normalColor = color(primary ? '#FFFFFF' : '#EAF5F5');
        component.hoverColor = color(primary ? '#EBFFFF' : '#D3E9E9');
        component.pressedColor = color(primary ? '#C9EBEB' : '#BCD8D9');
        component.disabledColor = color(primary ? '#B6C7C7' : '#A6BFC2'); component.duration = 0.08;
        component.clickEvents = []; component.interactable = true;
        const caption = label(node, 'Label', 0, 0, width - 16, height - 12, primary ? 30 : 20, text, primary ? '#FFFFFF' : '#263D50');
        return { node, component, caption };
    }
    function decorateElement(node, width, height, target) {
        const rootSprite = node.getComponent(cc.Sprite);
        if (rootSprite) {
            rootSprite.spriteFrame = frames['ui/card']; rootSprite.type = cc.Sprite.Type.SLICED;
            rootSprite.color = color(target ? '#D9E8E5' : '#FFFFFF');
        }
        const iconNode = ui(node, 'Icon', 0, 12, width - 12, height - 32);
        const icon = sprite(iconNode, frames['devices/mouse']); iconNode.active = false;
        const caption = label(node, 'Label', 0, -height / 2 + 15, width - 6, 26, width <= 140 ? 18 : 21, target ? '对应位置' : '设备');
        const marker = ui(node, 'SuccessMark', width / 2 - 13, height / 2 - 13, 32, 32);
        sprite(marker, frames['ui/check']); marker.active = false;
        const visual = node.getComponent(C.ElementVisual) || node.addComponent(C.ElementVisual);
        Object.assign(visual, { icon, caption, checkMarker: marker });
    }

    async function editPrefab(relative, modify) {
        const assetPath = `assets/prefabs/${relative}.prefab`;
        const info = await Editor.Message.request('asset-db', 'query-asset-info', `db://${assetPath}`);
        if (!info?.uuid) throw new Error(`Existing core Prefab missing: ${relative}`);
        coreUuids[assetPath] = info.uuid;
        const source = await load(cc, info.uuid, cc.Prefab);
        const copy = cc.instantiate(source.data);
        nodeCountsBefore[assetPath] = count(copy);
        try {
            prefabApi.removePrefabInfoFromNode(copy, true);
            modify(copy);
            nodeCountsAfter[assetPath] = count(copy);
            addedNodesByResource[assetPath] = nodeCountsAfter[assetPath] - nodeCountsBefore[assetPath];
            const generated = prefabApi.generatePrefabDataFromNode(copy);
            if (typeof generated?.prefabData !== 'string') throw new Error(`Creator serialization failed: ${relative}`);
            const parsed = JSON.parse(generated.prefabData);
            function references(value) {
                if (!value || typeof value !== 'object') return;
                if (value.__uuid__ === info.uuid) throw new Error(`Self-nested Prefab: ${relative}`);
                if ('__id__' in value && (!Number.isInteger(value.__id__) || !parsed[value.__id__])) throw new Error(`Broken internal reference: ${relative}`);
                Object.values(value).forEach(references);
            }
            references(parsed);
            const confirmation = await Editor.Message.request('asset-db', 'save-asset', info.uuid, generated.prefabData);
            if (confirmation?.uuid !== info.uuid) throw new Error(`Creator did not preserve core Prefab UUID: ${relative}`);
            await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
            saved[relative] = await load(cc, info.uuid, cc.Prefab);
        } finally { if (cc.isValid(copy)) copy.destroy(); }
    }

    await editPrefab('elements/DragItem', node => decorateElement(node, 180, 140, false));
    await editPrefab('elements/DragTarget', node => decorateElement(node, 180, 140, true));
    await editPrefab('elements/Port', node => decorateElement(node, 130, 80, true));
    await editPrefab('elements/Cable', node => {
        const connector = node.getComponent(C.CableConnector);
        if (!connector?.head || !connector.line || !connector.anchor) throw new Error('Cable input bindings missing.');
        decorateElement(connector.head, 130, 80, false);
        sprite(connector.anchor, block, '#667D8C', true);
    });
    await editPrefab('elements/DirtCell', node => sprite(node, frames['dirt/dust']));
    await editPrefab('stages/DragMatchStage', node => {
        const component = node.getComponent(C.DragMatchStageController);
        Object.assign(component, { itemPrefab: saved['elements/DragItem'], targetPrefab: saved['elements/DragTarget'] });
    });
    await editPrefab('stages/CableConnectStage', node => {
        Object.assign(node.getComponent(C.CableConnectStageController), { cablePrefab: saved['elements/Cable'], portPrefab: saved['elements/Port'] });
    });
    await editPrefab('stages/CleanSwipeStage', node => {
        const component = node.getComponent(C.CleanSwipeStageController);
        if (!component?.inputSurface || !component.dirtLayer) throw new Error('Existing clean input hierarchy missing.');
        const size = component.inputSurface.getComponent(cc.UITransform);
        if (size.width !== 680 || size.height !== 560) throw new Error('Clean InputSurface must retain 680 x 560.');
        sprite(component.inputSurface, block, '#F8F3E9', true);
        const deviceNode = ui(component.inputSurface, 'DeviceArtwork', 0, 0, 552, 292);
        const device = sprite(deviceNode, frames['workbench/keyboard-clean']); deviceNode.setSiblingIndex(0);
        const visual = node.getComponent(C.CleanDeviceVisual) || node.addComponent(C.CleanDeviceVisual);
        visual.device = device;
        component.deviceVisual = visual;
        component.dirtCellPrefab = saved['elements/DirtCell'];
    });

    nodeCountsBefore['assets/scenes/Game.scene'] = count(scene);
    const manager = canvas.getComponent(C.LevelManager), host = manager?.stageHost;
    if (!manager || !host) throw new Error('Existing LevelManager / StageHost bindings missing.');
    const registry = canvas.getComponent(C.VisualAssetRegistry) || canvas.addComponent(C.VisualAssetRegistry);
    registry.keys = Object.keys(frames); registry.frames = registry.keys.map(key => frames[key]); registry.validateBindings();
    host.visualAssets = registry; host.slicePreview = input.phase === 'slice';
    host.dragMatchPrefab = saved['stages/DragMatchStage'];
    host.cableConnectPrefab = saved['stages/CableConnectStage'];
    host.cleanSwipePrefab = saved['stages/CleanSwipeStage'];

    // Background stays below all input nodes. Existing local stage coordinates are untouched.
    sprite(canvas, block, '#EAF5F5', true);
    const backdrop = panel(canvas, 'WorkbenchBackdrop', 0, -150, 700, 940, '#E9CDA7'); backdrop.setSiblingIndex(1);
    panel(backdrop, 'DeskMat', 0, 45, 668, 780, '#F8F3E9');
    label(backdrop, 'WorkbenchMark', 0, -425, 600, 28, 18, 'DESKRESCUE  /  REPAIR CLUB', '#8D795F');
    const header = canvas.getChildByName('Header');
    const hudShadow = panel(header, 'HudShadow', 0, 442, 682, 302, '#52677925'); hudShadow.setSiblingIndex(0);
    const hudCard = panel(header, 'HudCard', 0, 450, 672, 298, '#FFFFFF'); hudCard.setSiblingIndex(0);
    hudShadow.setSiblingIndex(0);
    label(header, 'GameTitle', -100, 590, 430, 52, 35, '桌面急救站');
    label(header, 'ChapterLabel', -160, 540, 300, 32, 22, '基础订单', '#667D8C');
    label(header, 'LevelLabel', 185, 540, 245, 32, 23, '订单 1 / 9', '#2EAAA8');
    label(header, 'LevelTitleLabel', 0, 490, 630, 46, 32, '桌面整理');
    label(header, 'StageLabel', 0, 447, 630, 32, 22, '步骤 1 / 1', '#667D8C');
    label(header, 'StatusLabel', 0, 391, 624, 64, 24, '把设备拖到对应区域');
    const stats = header.getChildByName('Stats');
    label(stats, 'TimeLabel', -160, 325, 300, 38, 23, '用时：0.0 秒');
    label(stats, 'MistakeLabel', 160, 325, 300, 38, 23, '失误：0');
    const tutorial = canvas.getChildByName('TutorialHint');
    sprite(tutorial, frames['ui/card'], '#FFFFFF', true);
    tutorial.getComponent(cc.UITransform).setContentSize(630, 78);
    label(tutorial, 'TutorialLabel', 20, 0, 560, 62, 24, '拖动物品到对应区域');
    label(tutorial, 'GestureMark', -285, 0, 35, 50, 28, '↗', '#2EAAA8');

    const resultPanel = manager.completePanel;
    sprite(resultPanel, frames['ui/card'], '#FFFFFF', true);
    resultPanel.getComponent(cc.UITransform).setContentSize(650, 710);
    const resultShadow = panel(resultPanel, 'CardShadow', 4, -10, 666, 720, '#52677930'); resultShadow.setSiblingIndex(0);
    const resultFace = panel(resultPanel, 'CardFace', 0, 0, 650, 710, '#FFFFFF'); resultFace.setSiblingIndex(1);
    label(resultPanel, 'CompleteLabel', 0, 282, 610, 60, 37, '订单完成！');
    const detail = label(resultPanel, 'CompleteDetailLabel', 0, -22, 600, 290, 26, ''); detail.lineHeight = 43;
    const next = button(resultPanel, 'NextButton', 0, -279, 350, 88, '下一张订单');
    manager.nextButton = next.component; manager.actionButtonLabel = next.caption;
    const stars = resultPanel.getComponent(C.ResultStars) || resultPanel.addComponent(C.ResultStars);
    stars.starSprites = [-115, 0, 115].map((x, i) => sprite(ui(resultPanel, `RewardStar${i + 1}`, x, 180, 84, 84), frames['ui/star']));
    stars.earnedFrame = frames['ui/star']; stars.emptyFrame = frames['ui/star-empty'] || frames['ui/star'];
    manager.resultStars = stars; resultPanel.active = false;

    const audio = canvas.getComponent(C.AudioFeedback) || canvas.addComponent(C.AudioFeedback);
    audio.audioSource = canvas.getComponent(cc.AudioSource) || canvas.addComponent(cc.AudioSource);
    audio.audioSource.playOnAwake = false; audio.audioSource.loop = false;
    function audioClip(name) {
        const found = input.bindings.find(binding => binding.type === 'AudioClip' && binding.url.endsWith(`/${name}.wav`));
        if (!found) throw new Error(`Missing original sound ${name}`);
        return clips[found.key];
    }
    Object.assign(audio, { uiClickClip: audioClip('ui_click'), successClip: audioClip('snap_success'), mistakeClip: audioClip('mistake'),
        cleanCompleteClip: audioClip('clean_progress'), stageCompleteClip: audioClip('stage_complete'),
        orderCompleteClip: audioClip('order_complete'), runCompleteClip: audioClip('run_complete') });
    manager.audioFeedback = audio; manager.autoStartOnSceneLoad = false;

    const overlay = panel(canvas, 'HomeOverlay', 0, 0, 720, 1280, '#EAF5F5');
    overlay.active = true;
    label(overlay, 'Eyebrow', 0, 520, 640, 36, 22, 'COZY TECH REPAIR', '#2EAAA8');
    label(overlay, 'Title', 0, 440, 660, 90, 52, '桌面急救站');
    label(overlay, 'Subtitle', 0, 365, 650, 48, 25, '修好小设备，收获大满足', '#667D8C');
    const hero = panel(overlay, 'HeroDesk', 0, 20, 650, 530, '#E9CDA7');
    panel(hero, 'Mat', 0, 15, 580, 430, '#F8F3E9');
    sprite(ui(hero, 'HeroKeyboard', -65, -70, 430, 286), frames['devices/keyboard']);
    sprite(ui(hero, 'HeroMouse', 205, 0, 130, 170), frames['devices/mouse']);
    sprite(ui(hero, 'HeroHeadset', -160, 130, 230, 170), frames['devices/headset']);
    label(hero, 'HeroCaption', 130, 180, 270, 32, 20, '小设备 · 大满足', '#8D795F');
    if (frames['workbench/home-hero']) {
        for (const name of ['Mat', 'HeroKeyboard', 'HeroMouse', 'HeroHeadset', 'HeroCaption']) hero.getChildByName(name).active = false;
        const heroImage = ui(hero, 'HeroArtwork', 0, 10, 630, 388);
        sprite(heroImage, frames['workbench/home-hero']);
    }
    const start = button(overlay, 'StartButton', 0, -375, 390, 96, '开始维修');
    label(overlay, 'HomeFootnote', 0, -475, 640, 44, 22, '归位 · 接线 · 清洁   /   9 张维修订单', '#667D8C');
    const sound = button(canvas, 'SoundButton', 260, 590, 150, 52, '音效：开', false);
    const soundIcon = sprite(ui(sound.node, 'SoundIcon', -53, 0, 26, 26), frames['ui/sound-on']);
    sound.caption.node.setPosition(13, 0, 0);
    sound.caption.node.getComponent(cc.UITransform).setContentSize(110, 40);
    sound.node.setSiblingIndex(canvas.children.length - 1);
    const home = canvas.getComponent(C.HomeController) || canvas.addComponent(C.HomeController);
    Object.assign(home, { levelManager: manager, overlay, startButton: start.component, soundButton: sound.component,
        soundStateLabel: sound.caption, soundIcon, soundOnFrame: frames['ui/sound-on'], soundOffFrame: frames['ui/sound-off'], audioFeedback: audio });
    nodeCountsAfter['assets/scenes/Game.scene'] = count(scene);
    addedNodesByResource['assets/scenes/Game.scene'] = nodeCountsAfter['assets/scenes/Game.scene'] - nodeCountsBefore['assets/scenes/Game.scene'];
    return { ok: true, phase: input.phase, sceneUuid: scene.uuid, hostUuid: host.node.uuid,
        classes: Object.fromEntries(CLASS_NAMES.map(name => [name, cc.js._getClassId(C[name])])),
        registryKeys: registry.keys.slice(), nodeCountsBefore, nodeCountsAfter, addedNodesByResource, coreUuids,
        serializer: 'Creator Prefab.generatePrefabDataFromNode + asset-db.save-asset; scene saved by main operation' };
};

exports.inspect = function (cc, phase) {
    const C = types(cc), scene = cc.director.getScene(), canvas = scene?.getChildByName('Canvas');
    const manager = canvas?.getComponent(C.LevelManager), registry = canvas?.getComponent(C.VisualAssetRegistry);
    if (!manager || !registry) throw new Error('Day 5A has not been assembled in the saved Game.scene.');
    return { ok: true, phase, timestamp: new Date().toISOString(), sceneUuid: scene.uuid,
        hostUuid: manager.stageHost.node.uuid, registryKeys: registry.keys.slice(),
        classes: Object.fromEntries(CLASS_NAMES.map(name => [name, cc.js._getClassId(C[name])])),
        autoStartOnSceneLoad: manager.autoStartOnSceneLoad, slicePreview: manager.stageHost.slicePreview,
        orders: manager.orders.map(order => ({ id: order.id, key: order.key, stages: order.stages.map(stage => ({ id: stage.id, kind: stage.kind })) })) };
};
