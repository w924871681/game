'use strict';

const NAMES = ['LevelManager', 'RunController', 'StageHost', 'DraggableItem', 'CableConnector',
    'DragMatchStageController', 'CableConnectStageController', 'CleanSwipeStageController',
    'HomeController', 'AudioFeedback', 'ResultStars', 'VisualAssetRegistry', 'ElementVisual', 'CleanDeviceVisual',
    'PaperOrderHUD', 'V2ResultView', 'ButtonPressFeedback', 'WorkshopDecoration', 'V2ViewportTheme', 'V2CableLine', 'V2DirtAppearance'];
const PREFABS = ['elements/DragItem', 'elements/DragTarget', 'elements/Port', 'elements/Cable', 'elements/DirtCell',
    'stages/DragMatchStage', 'stages/CableConnectStage', 'stages/CleanSwipeStage'];
function classes(cc) {
    return Object.fromEntries(NAMES.map(name => {
        const value = cc.js.getClassByName(name);
        if (!value) throw new Error(`Wait for real Creator import: ${name}`);
        return [name, value];
    }));
}
async function load(cc, uuid, Type) {
    let problem;
    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            const result = await new Promise((resolve, reject) => cc.assetManager.loadAny(uuid,
                { reloadAsset: true }, (error, asset) => error ? reject(error) : resolve(asset)));
            if (!(result instanceof Type)) throw new Error(`Wrong asset type: ${uuid}`);
            return result;
        } catch (error) { problem = error; if (attempt < 19) await new Promise(resolve => setTimeout(resolve, 200)); }
    }
    throw problem;
}
function count(node) { return 1 + node.children.reduce((sum, child) => sum + count(child), 0); }
function find(node, name) { return node.name === name ? node : node.children.map(child => find(child, name)).find(Boolean); }

exports.apply = async function (cc, input) {
    const scene = cc.director.getScene(), canvas = scene?.getChildByName('Canvas');
    const api = (globalThis.cce || globalThis.EditorExtends)?.Prefab;
    if (!canvas?.getComponent(cc.Canvas)?.cameraComponent || !api?.generatePrefabDataFromNode) throw new Error('Open saved Game.scene in Creator.');
    const C = classes(cc), manager = canvas.getComponent(C.LevelManager), home = canvas.getComponent(C.HomeController);
    if (!manager?.stageHost || !home) throw new Error('Existing Day5A managers and StageHost are required.');
    const frames = {};
    for (const binding of input.bindings.filter(entry => entry.type === 'SpriteFrame')) frames[binding.key] = await load(cc, binding.uuid, cc.SpriteFrame);
    function required(key) { if (!frames[key]) throw new Error(`V2 SpriteFrame missing: ${key}`); return frames[key]; }
    const block = await load(cc, 'b730527c-3233-41c2-aaf7-7cdab58f9749@f9941', cc.SpriteFrame);
    const before = {}, after = {}, added = {}, coreUuids = {};
    const hex = value => new cc.Color().fromHEX(value);
    const canvasTransform = canvas.getComponent(cc.UITransform);
    function ui(parent, name, width, height) {
        const node = parent.getChildByName(name) || new cc.Node(name);
        node.parent = parent; node.layer = cc.Layers.Enum.UI_2D;
        (node.getComponent(cc.UITransform) || node.addComponent(cc.UITransform)).setContentSize(width, height);
        return node;
    }
    // Design top-left coordinates are converted through actual Canvas/parent transforms.
    function at(parent, name, x, y, width, height) {
        const node = ui(parent, name, width, height);
        const world = canvasTransform.convertToWorldSpaceAR(new cc.Vec3(x + width / 2 - 360, 640 - y - height / 2));
        const local = parent.getComponent(cc.UITransform).convertToNodeSpaceAR(world);
        node.setPosition(local); return node;
    }
    function sprite(node, frame, tint = '#FFFFFF', sliced = false) {
        const component = node.getComponent(cc.Sprite) || node.addComponent(cc.Sprite);
        component.enabled = true; component.spriteFrame = frame;
        component.type = sliced ? cc.Sprite.Type.SLICED : cc.Sprite.Type.SIMPLE;
        component.sizeMode = cc.Sprite.SizeMode.CUSTOM; component.color = hex(tint);
        return component;
    }
    function art(parent, name, x, y, width, height, key, tint = '#FFFFFF', sliced = false) {
        return sprite(at(parent, name, x, y, width, height), required(key), tint, sliced);
    }
    function paper(parent, name, x, y, width, height, tint = '#FFFFFF') {
        return art(parent, name, x, y, width, height, 'v2/paper', tint, true).node;
    }
    function label(parent, name, x, y, width, height, size, text, tint = '#315F60', bold = false) {
        const node = at(parent, name, x, y, width, height);
        const value = node.getComponent(cc.Label) || node.addComponent(cc.Label);
        node.active = true;
        Object.assign(value, { string: text, fontSize: size, lineHeight: size + 4, useSystemFont: true,
            fontFamily: 'Microsoft YaHei', isBold: bold, horizontalAlign: cc.HorizontalTextAlignment.CENTER,
            verticalAlign: cc.VerticalTextAlignment.CENTER, overflow: cc.Label.Overflow.SHRINK,
            enableWrapText: false, color: hex(tint) });
        return value;
    }
    function group(parent, name) { const node = ui(parent, name, 720, 1280); node.setPosition(0, 0); return node; }
    function disableSprite(node) { const component = node?.getComponent(cc.Sprite); if (component) component.enabled = false; }
    function button(parent, name, x, y, width, height, text, secondary = false) {
        const node = at(parent, name, x, y, width, height);
        disableSprite(node);
        const visual = ui(node, 'V2ButtonVisual', width, height); visual.setPosition(0, 0);
        sprite(visual, required(secondary ? 'v2/paper' : 'v2/gold-button'), '#FFFFFF', true);
        const oldCaption = node.getChildByName('Label');
        if (oldCaption) oldCaption.active = false;
        const captionNode = ui(visual, 'V2Caption', width - 34, height - 18); captionNode.setPosition(0, 2);
        const caption = captionNode.getComponent(cc.Label) || captionNode.addComponent(cc.Label);
        Object.assign(caption, { string: text, fontSize: secondary ? 28 : 34, lineHeight: 40, fontFamily: 'Microsoft YaHei',
            isBold: true, useSystemFont: true, horizontalAlign: cc.HorizontalTextAlignment.CENTER,
            verticalAlign: cc.VerticalTextAlignment.CENTER, overflow: cc.Label.Overflow.SHRINK, color: hex('#7A4A24') });
        const component = node.getComponent(cc.Button) || node.addComponent(cc.Button);
        component.target = visual; component.transition = cc.Button.Transition.COLOR;
        component.normalColor = hex('#FFFFFF'); component.hoverColor = hex('#FFF7DD');
        component.pressedColor = hex('#EED7A8'); component.disabledColor = hex('#B6B5A7'); component.duration = 0.1;
        component.clickEvents = []; component.interactable = true;
        const press = node.getComponent(C.ButtonPressFeedback) || node.addComponent(C.ButtonPressFeedback);
        Object.assign(press, { button: component, visualRoot: visual });
        return { node, component, caption };
    }
    function decoration(parent, target, amplitude = 6, enter = 0.35) {
        const value = parent.getComponent(C.WorkshopDecoration) || parent.addComponent(C.WorkshopDecoration);
        Object.assign(value, { visualRoot: target, floatAmplitude: amplitude, enterSeconds: enter, floatSeconds: 1.8 });
        return value;
    }
    async function editPrefab(relative, modify) {
        const path = `assets/prefabs/${relative}.prefab`;
        const info = await Editor.Message.request('asset-db', 'query-asset-info', `db://${path}`);
        if (!info?.uuid) throw new Error(`Missing original Prefab ${path}`);
        coreUuids[path] = info.uuid;
        const source = await load(cc, info.uuid, cc.Prefab), copy = cc.instantiate(source.data);
        before[path] = count(copy);
        try {
            api.removePrefabInfoFromNode(copy, true);
            modify(copy);
            after[path] = count(copy); added[path] = after[path] - before[path];
            const generated = api.generatePrefabDataFromNode(copy);
            if (typeof generated?.prefabData !== 'string') throw new Error(`Creator did not serialize ${path}`);
            let saved;
            // On Windows the asset watcher can briefly hold the original file during reimport.
            // Retry the same Creator serialization; never replace the file outside asset-db.
            for (let attempt = 0; attempt < 6; attempt++) {
                try {
                    saved = await Editor.Message.request('asset-db', 'save-asset', info.uuid, generated.prefabData);
                    break;
                } catch (error) {
                    if (attempt === 5 || !/UNKNOWN|EBUSY|EPERM/.test(String(error))) throw error;
                    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
                }
            }
            if (saved?.uuid !== info.uuid) throw new Error(`Prefab identity changed: ${path}`);
            await Editor.Message.request('asset-db', 'reimport-asset', info.uuid);
            return await load(cc, info.uuid, cc.Prefab);
        } finally { if (cc.isValid(copy)) copy.destroy(); }
    }
    function element(node) {
        const value = node.getComponent(C.ElementVisual);
        if (!value?.icon || !value.caption || !value.checkMarker) throw new Error('Original ElementVisual binding is required.');
        disableSprite(node);
        const t = node.getComponent(cc.UITransform), width = t.width, height = t.height;
        const surface = ui(node, 'V2Surface', width, height); surface.setPosition(0, 0); surface.setSiblingIndex(0);
        value.surface = sprite(surface, required('v2/paper'), '#FFFFFF', true);
        const glow = ui(node, 'V2Highlight', width + 8, height + 8); glow.setPosition(0, 0); glow.setSiblingIndex(0);
        sprite(glow, required('v2/paper'), '#4CC9A460', true); glow.active = false; value.highlight = glow;
        const border = ui(node, 'V2SlotOutline', width, height); border.setPosition(0, 0);
        value.outline = border.getComponent(cc.Graphics) || border.addComponent(cc.Graphics);
        value.checkMarker.setSiblingIndex(node.children.length - 1);
        value.icon.node.setPosition(0, 14);
    }
    const item = await editPrefab('elements/DragItem', element);
    const target = await editPrefab('elements/DragTarget', element);
    const drag = await editPrefab('stages/DragMatchStage', node => Object.assign(node.getComponent(C.DragMatchStageController), { itemPrefab: item, targetPrefab: target }));
    manager.stageHost.dragMatchPrefab = drag;
    if (input.phase !== 'a') {
        const port = await editPrefab('elements/Port', element);
        const cable = await editPrefab('elements/Cable', node => {
            const connector = node.getComponent(C.CableConnector); element(connector.head);
            sprite(connector.anchor, required('v2/cable-anchor'));
            const anchorSize = connector.anchor.getComponent(cc.UITransform);
            // Keep its original input-independent transform; art lives on a larger child.
            const anchorChild = ui(connector.anchor, 'V2Socket', 44, 44); anchorChild.setPosition(0, 0);
            sprite(anchorChild, required('v2/cable-anchor')); disableSprite(connector.anchor);
            if (!anchorSize) throw new Error('Cable anchor UITransform missing.');
            const lineNode = ui(node, 'V2LineArtwork', 720, 800); lineNode.setPosition(0, 0); lineNode.setSiblingIndex(0);
            const drawing = lineNode.getComponent(cc.Graphics) || lineNode.addComponent(cc.Graphics);
            drawing.lineCap = cc.Graphics.LineCap.ROUND; drawing.lineJoin = cc.Graphics.LineJoin.ROUND;
            connector.line.enabled = false;
            const visual = node.getComponent(C.V2CableLine) || node.addComponent(C.V2CableLine);
            Object.assign(visual, { connector, artwork: drawing });
        });
        const dirt = await editPrefab('elements/DirtCell', node => {
            disableSprite(node);
            const dust = ui(node, 'V2SoftDust', 100, 100); dust.setPosition(0, 0);
            sprite(dust, required('v2/irregular-dust'), '#FFFFFFDA');
            const view = node.getComponent(C.V2DirtAppearance) || node.addComponent(C.V2DirtAppearance); view.dust = dust;
        });
        manager.stageHost.cableConnectPrefab = await editPrefab('stages/CableConnectStage', node => Object.assign(node.getComponent(C.CableConnectStageController), { cablePrefab: cable, portPrefab: port }));
        manager.stageHost.cleanSwipePrefab = await editPrefab('stages/CleanSwipeStage', node => {
            const stage = node.getComponent(C.CleanSwipeStageController);
            stage.dirtCellPrefab = dirt; disableSprite(stage.inputSurface);
        });
    }
    before['assets/scenes/Game.scene'] = count(scene);
    manager.autoStartOnSceneLoad = false; manager.stageHost.slicePreview = false;
    if (!canvas.getComponent(C.V2ViewportTheme)) canvas.addComponent(C.V2ViewportTheme);
    sprite(canvas, block, '#C3ECE0', true);
    canvas.getComponent(cc.Canvas).cameraComponent.clearColor = hex('#C3ECE0');
    for (const name of ['WorkbenchBackdrop']) { const value = canvas.getChildByName(name); if (value) value.active = false; }
    const room = art(canvas, 'V2RoomBackdrop', -67, 0, 854, 1280, 'v2/workshop-room'); room.node.setSiblingIndex(1);
    const bench = group(canvas, 'V2Workbench'); bench.setSiblingIndex(2);
    art(bench, 'Timber', 20, 363, 680, 777, 'v2/wood-workbench');
    const dragDecor = group(bench, 'DragDecor');
    art(dragDecor, 'PlacementMat', 36, 390, 648, 365, 'v2/green-mat');
    paper(dragDecor, 'PlacementTitlePlate', 220, 372, 280, 48);
    label(dragDecor, 'PlacementTitle', 224, 378, 272, 34, 24, '设备放置区', '#7A4A24', true);
    const cableDecor = group(bench, 'CableDecor');
    paper(cableDecor, 'CableTitlePlate', 230, 532, 260, 48, '#F5DFC0');
    label(cableDecor, 'CableTitle', 235, 538, 250, 34, 24, '设备连接区', '#7A4A24', true);
    const cleanDecor = group(bench, 'CleanDecor');
    art(cleanDecor, 'CleaningMat', 36, 390, 648, 510, 'v2/green-mat');
    art(cleanDecor, 'ClothCue', 540, 797, 120, 120, 'v2/cloth-glove');
    paper(cleanDecor, 'CleanProgressPaper', 113, 922, 494, 76);
    const cleanPercent = label(cleanDecor, 'CleanPercentLabel', 140, 931, 440, 27, 25, '清洁进度 0%', '#315F60', true);
    const trackNode = at(cleanDecor, 'CleanTrack', 150, 968, 420, 12); sprite(trackNode, block, '#C4B498', true);
    const fillNode = ui(trackNode, 'Fill', 0, 12); fillNode.getComponent(cc.UITransform).setAnchorPoint(0, 0.5); fillNode.setPosition(-210, 0);
    sprite(fillNode, block, '#4CC9A4', true);

    const header = canvas.getChildByName('Header');
    for (const name of ['GameTitle', 'HudCard', 'HudShadow', 'StatusLabel', 'LevelTitleLabel', 'StageLabel', 'ChapterLabel', 'LevelLabel']) {
        const node = header.getChildByName(name); if (node) node.active = false;
    }
    const hud = group(header, 'V2PaperHUD');
    paper(hud, 'BrandPlaque', 32, 112, 205, 40, '#EAD2AA');
    label(hud, 'BrandLabel', 38, 115, 193, 32, 24, '桌面急救站', '#315F60', true);
    paper(hud, 'OrderPaper', 38, 164, 644, 132);
    const chapter = label(hud, 'Chapter', 350, 170, 260, 24, 22, '基础订单', '#7A4A24');
    const order = label(hud, 'OrderNumber', 95, 170, 245, 24, 22, '订单 1 / 9', '#7A4A24', true);
    const title = label(hud, 'TaskTitle', 80, 192, 560, 43, 40, '桌面整理', '#315F60', true);
    const instruction = label(hud, 'Instruction', 74, 233, 572, 26, 22, '把设备拖到对应区域');
    const step = label(hud, 'Step', 105, 262, 230, 23, 20, '步骤 1 / 1', '#56737B');
    const progress = label(hud, 'Progress', 360, 262, 255, 23, 21, '已归位 0 / 3', '#315F60', true);
    const timeCapsule = paper(hud, 'TimeCapsule', 52, 304, 282, 48);
    const mistakeCapsule = paper(hud, 'MistakeCapsule', 386, 304, 282, 48);
    const run = manager.runController;
    const timeNode = run.timeLabel.node; timeNode.active = false;
    const mistakeNode = run.mistakeLabel.node; mistakeNode.active = false;
    run.timeLabel = label(timeCapsule, 'ElapsedValue', 66, 309, 254, 38, 28, '用时：0.0 秒', '#315F60', true);
    run.mistakeLabel = label(mistakeCapsule, 'MistakeValue', 400, 309, 254, 38, 28, '失误：0', '#A95A43', true);
    const presenter = header.getComponent(C.PaperOrderHUD) || header.addComponent(C.PaperOrderHUD);
    Object.assign(presenter, { chapterLabel: chapter, orderLabel: order, titleLabel: title, stepLabel: step,
        instructionLabel: instruction, progressLabel: progress, cleanPercentLabel: cleanPercent,
        dragGroup: dragDecor, cableGroup: cableDecor, cleanGroup: cleanDecor,
        cleanTrack: trackNode.getComponent(cc.UITransform), cleanFill: fillNode.getComponent(cc.UITransform) });
    manager.hudView = presenter; dragDecor.active = true; cableDecor.active = false; cleanDecor.active = false;
    const tutor = manager.tutorialHint; disableSprite(tutor);
    const oldTutor = tutor.getChildByName('GestureMark'); if (oldTutor) oldTutor.active = false;
    paper(tutor, 'V2HintPaper', 135, 1161, 535, 62);
    const tutorLabel = label(tutor, 'V2HintText', 157, 1170, 488, 40, 22, '拖动设备，放进正确的槽位吧！', '#315F60', true);
    if (manager.tutorialLabel && manager.tutorialLabel !== tutorLabel) manager.tutorialLabel.node.active = false;
    manager.tutorialLabel = tutorLabel;
    art(tutor, 'V2TutorAvatar', 22, 1120, 104, 112, frames['v2/repair-avatar'] ? 'v2/repair-avatar' : 'v2/repair-pointing');
    tutor.active = false;

    const overlay = home.overlay; disableSprite(overlay);
    for (const child of overlay.children) if (!child.name.startsWith('V2') && child.name !== 'StartButton') child.active = false;
    art(overlay, 'V2HomeRoom', -67, 0, 854, 1280, 'v2/workshop-room');
    paper(overlay, 'V2BusinessBadge', 36, 132, 180, 42, '#CCF2DC');
    label(overlay, 'V2BusinessText', 43, 138, 166, 28, 21, '今日营业中', '#315F60', true);
    label(overlay, 'V2LogoSmall', 190, 185, 340, 24, 18, 'COZY REPAIR SHOP', '#F7E9D2', true);
    const logoShadow = label(overlay, 'V2LogoShadow', 154, 209, 420, 150, 64, '桌面\n急救站', '#234F50', true);
    logoShadow.enableWrapText = true; logoShadow.lineHeight = 70;
    const logo = label(overlay, 'V2Logo', 150, 205, 420, 150, 64, '桌面\n急救站', '#FFF5DB', true);
    logo.enableWrapText = true; logo.lineHeight = 70;
    const legacyOutline = cc.LabelOutline && logo.node.getComponent(cc.LabelOutline);
    if (legacyOutline) legacyOutline.destroy();
    logo.enableOutline = true; logo.outlineColor = hex('#315F60'); logo.outlineWidth = 3;
    paper(overlay, 'V2WelcomeStrip', 110, 372, 500, 44, '#FFF4DC');
    label(overlay, 'V2WelcomeText', 119, 377, 482, 33, 24, '动动手，让小设备焕然一新！', '#315F60', true);
    const boy = art(overlay, 'V2WelcomeBoy', 358, 555, 240, 300, 'v2/repair-welcome');
    decoration(overlay, boy.node);
    art(overlay, 'V2ForegroundTable', 50, 780, 620, 185, 'v2/wood-workbench');
    paper(overlay, 'V2WorkshopPlaque', 216, 430, 288, 58, '#EAD2AA');
    label(overlay, 'V2WorkshopName', 222, 440, 276, 35, 26, '我的维修工坊', '#7A4A24', true);
    art(overlay, 'V2Keyboard', 92, 695, 284, 168, 'devices/keyboard').node.angle = -8;
    art(overlay, 'V2Mouse', 305, 815, 94, 115, 'devices/mouse').node.angle = 12;
    art(overlay, 'V2Headset', 533, 500, 122, 157, 'devices/headset').node.angle = -8;
    const start = button(overlay, 'StartButton', 112, 1030, 496, 92, '开始维修');
    home.startButton = start.component; start.node.setSiblingIndex(overlay.children.length - 1);
    paper(overlay, 'V2HomeFooterPaper', 140, 1168, 440, 36, '#FFF5DBDB');
    label(overlay, 'V2HomeFooter', 146, 1169, 428, 32, 23, '整理 · 接线 · 清洁', '#315F60', true);
    overlay.active = true;

    const sound = button(canvas, 'SoundButton', 596, 108, 100, 88, '', true);
    sound.caption.node.active = false;
    sound.node.getChildByName('V2ButtonVisual').getComponent(cc.UITransform).setContentSize(88, 68);
    const soundIcon = sprite(ui(sound.node.getChildByName('V2ButtonVisual'), 'SoundIcon', 28, 28), required('ui/sound-on'));
    soundIcon.node.setPosition(0, 12);
    const soundTextNode = ui(sound.node.getChildByName('V2ButtonVisual'), 'SoundText', 84, 26); soundTextNode.setPosition(0, -18);
    const soundText = soundTextNode.getComponent(cc.Label) || soundTextNode.addComponent(cc.Label);
    Object.assign(soundText, { string: '音效：开', fontSize: 18, lineHeight: 22, useSystemFont: true, fontFamily: 'Microsoft YaHei',
        color: hex('#315F60'), horizontalAlign: cc.HorizontalTextAlignment.CENTER, verticalAlign: cc.VerticalTextAlignment.CENTER });
    const oldIcon = sound.node.getChildByName('SoundIcon'); if (oldIcon) oldIcon.active = false;
    Object.assign(home, { soundButton: sound.component, soundStateLabel: soundText, soundIcon,
        soundOnFrame: required('ui/sound-on'), soundOffFrame: required('ui/sound-off') });
    sound.node.setSiblingIndex(canvas.children.length - 1);

    const panel = manager.completePanel; disableSprite(panel);
    panel.getComponent(cc.UITransform).setContentSize(720, 1280);
    for (const name of ['CardFace', 'CardShadow', 'CompleteLabel', 'CompleteDetailLabel']) { const node = panel.getChildByName(name); if (node) node.active = false; }
    const shade = at(canvas, 'V2ModalShade', 0, 0, 720, 1280); sprite(shade, block, '#1F595E99', true);
    if (!shade.getComponent(cc.BlockInputEvents)) shade.addComponent(cc.BlockInputEvents);
    shade.setSiblingIndex(canvas.children.length - 1); panel.setSiblingIndex(canvas.children.length - 1);
    const orderGroup = group(panel, 'V2OrderResultGroup'), finalGroup = group(panel, 'V2FinalSummaryGroup');
    paper(orderGroup, 'ResultPaper', 60, 220, 600, 760);
    const badge = label(orderGroup, 'OrderBadge', 180, 250, 360, 50, 28, '', '#7A4A24', true);
    label(orderGroup, 'CheerTitle', 120, 325, 480, 70, 54, '修好啦！', '#315F60', true);
    const starsRoot = group(orderGroup, 'Stars');
    const starSprites = [235, 360, 485].map((x, i) => {
        const oldStar = find(panel, `RewardStar${i + 1}`);
        if (oldStar) oldStar.parent = starsRoot;
        return sprite(at(starsRoot, `RewardStar${i + 1}`, x - 44, 426, 88, 88), required('ui/star'));
    });
    manager.resultStars.starSprites = starSprites;
    label(orderGroup, 'ScoreCaption', 190, 534, 340, 32, 24, '本单得分', '#7A4A24', true);
    const score = label(orderGroup, 'ScoreValue', 160, 570, 400, 78, 64, '', '#C8742D', true);
    paper(orderGroup, 'TimeCard', 105, 675, 242, 112, '#DFF1DF');
    paper(orderGroup, 'MistakeCard', 373, 675, 242, 112, '#F9E9DB');
    label(orderGroup, 'TimeCaption', 125, 687, 202, 28, 23, '用时', '#315F60', true);
    label(orderGroup, 'MistakeCaption', 393, 687, 202, 28, 23, '失误', '#A95A43', true);
    const elapsed = label(orderGroup, 'ResultElapsed', 124, 724, 204, 40, 30, '', '#315F60', true);
    const mistakes = label(orderGroup, 'ResultMistakes', 392, 724, 204, 40, 30, '', '#A95A43', true);
    const steps = label(orderGroup, 'ResultSteps', 186, 804, 348, 28, 20, '', '#56737B');
    label(orderGroup, 'NextHint', 195, 841, 410, 28, 21, '下一张订单已经准备好了', '#7A4A24');
    const resultBoy = art(orderGroup, 'ThumbsupBoy', 12, 792, 145, 181, 'v2/repair-thumbsup');
    const resultEffect = decoration(orderGroup, resultBoy.node, 4, 0.25);
    for (let i = 0; i < 6; i += 1) {
        const chip = art(orderGroup, `Confetti${i}`, 57 + i * 108, 200 + (i % 2) * 82, 26, 30, 'v2/confetti'); chip.node.angle = i * 41;
    }
    const next = button(panel, 'NextButton', 110, 880, 500, 92, '下一张订单');
    next.node.setSiblingIndex(panel.children.length - 1);
    manager.nextButton = next.component; manager.actionButtonLabel = next.caption;
    // Full-screen final result is a mutually exclusive child group, using real summary values.
    art(finalGroup, 'FinalRoom', -67, 0, 854, 1280, 'v2/workshop-room');
    art(finalGroup, 'Trophy', 218, 135, 284, 230, 'v2/trophy');
    paper(finalGroup, 'FinalRibbon', 98, 350, 524, 95, '#E58B70');
    label(finalGroup, 'FinalTitle', 106, 369, 508, 57, 44, '全部订单完成！', '#FFF5DB', true);
    label(finalGroup, 'FinalSubtitle', 155, 446, 410, 42, 30, '你真是太棒了！', '#315F60', true);
    paper(finalGroup, 'SummaryPaper', 58, 495, 604, 325);
    const mainX = [80, 272, 464], mainLabels = ['完成订单', '累计星级', '总得分'];
    const values = mainX.map((x, i) => {
        label(finalGroup, `SummaryCaption${i}`, x, 548, 176, 35, 25, mainLabels[i], '#7A4A24', true);
        return label(finalGroup, `SummaryValue${i}`, x, 600, 176, 54, i === 2 ? 39 : 34, '', '#315F60', true);
    });
    const minorNames = ['完成步骤', '总用时', '总失误'];
    const minor = mainX.map((x, i) => {
        label(finalGroup, `MinorCaption${i}`, x, 698, 176, 28, 20, minorNames[i], '#7A4A24');
        return label(finalGroup, `MinorValue${i}`, x, 742, 176, 34, 25, '', '#315F60', true);
    });
    const cheering = art(finalGroup, 'CheeringBoy', 58, 805, 184, 230, 'v2/repair-cheering');
    const finalEffect = decoration(finalGroup, cheering.node, 5, 0.4);
    paper(finalGroup, 'FinalSpeech', 272, 837, 365, 112);
    const speech = label(finalGroup, 'FinalSpeechText', 290, 852, 330, 80, 23, '太棒了！你已经完成\n所有维修订单啦！', '#315F60', true); speech.enableWrapText = true;
    const returnButton = button(finalGroup, 'ReturnHomeButton', 195, 1140, 330, 62, '返回首页', true);
    home.homeButton = returnButton.component;
    const result = panel.getComponent(C.V2ResultView) || panel.addComponent(C.V2ResultView);
    Object.assign(result, { orderGroup, finalGroup, starContainer: starsRoot, modalShade: shade, primaryButtonRoot: next.node,
        orderBadgeLabel: badge, scoreLabel: score, timeLabel: elapsed, mistakeLabel: mistakes, stepsLabel: steps,
        summaryOrdersLabel: values[0], summaryStarsLabel: values[1], summaryScoreLabel: values[2],
        summaryStepsLabel: minor[0], summaryTimeLabel: minor[1], summaryMistakesLabel: minor[2],
        orderDecoration: resultEffect, finalDecoration: finalEffect, orderButtonY: -266, finalButtonY: -416 });
    manager.resultView = result;
    orderGroup.active = false; finalGroup.active = false; shade.active = false; panel.active = false;
    next.node.active = false; next.component.interactable = false;
    after['assets/scenes/Game.scene'] = count(scene); added['assets/scenes/Game.scene'] = after['assets/scenes/Game.scene'] - before['assets/scenes/Game.scene'];
    return { ok: true, phase: input.phase, sceneUuid: scene.uuid, hostUuid: manager.stageHost.node.uuid,
        classes: Object.fromEntries(Object.entries(C).map(([name, Type]) => [name, cc.js._getClassId(Type)])),
        registryKeys: canvas.getComponent(C.VisualAssetRegistry).keys.slice(), coreUuids,
        nodeCountsBefore: before, nodeCountsAfter: after, addedNodesByResource: added,
        designMapping: { canvas: [720, 1280], actualStageCenter: [360, 640], referenceAssumedStageCenter: [360, 755],
            inputUnchanged: true, hudPaper: [38, 164, 644, 132], stats: [[52, 304, 282, 48], [386, 304, 282, 48]],
            reason: 'Preserved case-cable head at design y400 with original 80px hitbox; HUD ends352 before input top360.' },
        serializer: 'Actual Creator Node/Component + Prefab.generatePrefabDataFromNode + asset-db.save-asset; Scene saved by main' };
};

exports.inspect = function (cc, phase) {
    const C = classes(cc), scene = cc.director.getScene(), canvas = scene.getChildByName('Canvas');
    const manager = canvas.getComponent(C.LevelManager);
    return { ok: true, phase, timestamp: new Date().toISOString(), sceneUuid: scene.uuid, hostUuid: manager.stageHost.node.uuid,
        classes: Object.fromEntries(Object.entries(C).map(([name, Type]) => [name, cc.js._getClassId(Type)])),
        registryKeys: canvas.getComponent(C.VisualAssetRegistry).keys.slice(), autoStartOnSceneLoad: manager.autoStartOnSceneLoad,
        slicePreview: manager.stageHost.slicePreview, stageHostLocal: [manager.stageHost.node.position.x, manager.stageHost.node.position.y],
        uiPaths: { modalShade: 'Canvas/V2ModalShade', hud: 'Canvas/Header/V2PaperHUD', orderGroup: 'Canvas/CompletePanel/V2OrderResultGroup',
            finalGroup: 'Canvas/CompletePanel/V2FinalSummaryGroup', workbench: 'Canvas/V2Workbench', cleanProgress: 'Canvas/V2Workbench/CleanDecor' } };
};
