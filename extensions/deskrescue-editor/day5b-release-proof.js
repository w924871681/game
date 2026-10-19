'use strict';
/** Release-gate proof with installed SDK constants and the actual source compiled into real cc components.
 * This is not a full platform build or a browser Touch test. No mock engine is used here.
 */
exports.run = function(cc) {
    const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
    const engine=path.resolve(Editor.App.path,'../resources/3d/engine');
    const sdkModule=path.join(engine,'packages/build-engine/lib/build-time-constants.js');
    const sdk=require(sdkModule),ts=require(path.join(engine,'node_modules/typescript'));
    const constants=sdk.setupBuildTimeConstants({mode:'BUILD',platform:'HTML5',flags:{DEBUG:false}});
    if(constants.BUILD!==true||constants.PREVIEW!==false)throw new Error('Installed SDK release constants unexpected');
    const relative='assets/scripts/ui/Day5BReviewLauncher.ts',source=fs.readFileSync(path.join(Editor.Project.path,relative),'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{experimentalDecorators:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
    const m={exports:{}},tag='Day5BReleaseProof'+Date.now();
    const engineExports={...cc,_decorator:{...cc._decorator,ccclass:()=>cc._decorator.ccclass(tag)}};
    const modules={'cc':engineExports,'cc/env':constants,'../core/LevelManager':{LevelManager:cc.js.getClassByName('LevelManager')},'./HomeController':{HomeController:cc.js.getClassByName('HomeController')}};
    new vm.Script(`(function(require,module,exports){${compiled}\n})`,{filename:relative}).runInThisContext()(name=>{
        if(!Object.hasOwn(modules,name))throw new Error('Unexpected project dependency');return modules[name];
    },m,m.exports);
    const Type=m.exports.Day5BReviewLauncher,root=new cc.Node('__Day5BReleaseGate'),review=new cc.Node('Review');review.parent=root;
    const c=root.addComponent(Type);c.reviewRoot=review;let selections=0;
    // No game result is fabricated: these callbacks only detect a forbidden QA action.
    c.manager={hasStarted:true,totalOrders:15,loadOrder:()=>selections++,stageHost:{resetAll(){}},runController:{startNewRun(){}}};
    c.home={overlay:null};const button=new cc.Node('ReviewOrder15');button.parent=review;button.addComponent(cc.Button);
    try {
        c.qaEnabled=true;c.onEnable();button.emit(cc.Button.EventType.CLICK);
        const ok=review.active===false&&selections===0&&c.bindings.length===0;
        if(!ok)throw new Error('Actual release-compiled component exposed QA');
        return {ok,mode:'Installed Creator SDK BUILD constants + actual project source transpilation + real cc.Node/Button/Component fixture',
            limitations:['Not a full web/mobile release build','Not platform publication or physical touch'],
            constants:{BUILD:constants.BUILD,PREVIEW:constants.PREVIEW,DEBUG:constants.DEBUG},explicitQaEnabled:true,
            rootActive:review.active,qaActionsTriggered:selections,ownedButtonBindings:c.bindings.length,
            source:{path:relative,sha256:crypto.createHash('sha256').update(source).digest('hex')},
            sdkConstantGeneratorSha256:crypto.createHash('sha256').update(fs.readFileSync(sdkModule)).digest('hex'),typescript:ts.version};
    } finally {c.onDisable();root.destroy();cc.js.unregisterClass(Type);}
};
