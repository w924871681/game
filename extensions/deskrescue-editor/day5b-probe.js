'use strict';
/** Actual imported Prefabs and cc.Touch, isolated from the open formal scene. */
exports.run = function(cc) {
 const checks=[],roots=[],cleanupErrors=[],originalSystem=cc.TweenSystem.instance,system=new cc.TweenSystem(),actions=system.ActionManager;
 const names={'drag-match':'DragMatchStageController','cable-connect':'CableConnectStageController','clean-swipe':'CleanSwipeStageController','fault-spot':'FaultSpotStageController','rotary-control':'RotaryControlStageController','guided-trace':'GuidedTraceStageController','gauge-tune':'GaugeTuneStageController','sequence-test':'SequenceTestStageController'};
 const classes={};for(const name of [...Object.values(names),'LevelManager','StageHost','RunController','DraggableItem','CableConnector'])classes[name]=cc.js.getClassByName(name);
 const fields=['dragMatchPrefab','cableConnectPrefab','cleanSwipePrefab','faultSpotPrefab','rotaryControlPrefab','guidedTracePrefab','gaugeTunePrefab','sequenceTestPrefab'];
 const source=cc.director.getScene().getComponentInChildren(classes.LevelManager);
 const result={ok:false,engineVersion:cc.ENGINE_VERSION||cc.VERSION,mode:'Actual imported Prefabs, real cc.Touch/cc.EventTouch, off-scene fixtures, manual dt and isolated real ActionManager',
  limitations:['Not natural-clock Preview','Not browser hit-testing or native touch adapters','Not physical touch or mini-game SDK validation'],checks};
 const assert=(ok,message)=>{if(!ok)throw new Error(message);};
 const snapshot=()=>{const list=[];function walk(n){list.push([n.uuid,n.parent?.uuid,n.active,n.position.x,n.position.y,n.scale.x,n.scale.y,n.getComponent(cc.Label)?.string]);n.children.forEach(walk);}walk(cc.director.getScene());return JSON.stringify(list);};
 const before=snapshot();
 const ui=(name,parent)=>{const n=new cc.Node('__Day5BProbe_'+name);n.layer=cc.Layers.Enum.UI_2D;n.addComponent(cc.UITransform).setContentSize(720,800);if(parent)n.parent=parent;return n;};
 const label=(name,parent)=>ui(name,parent).addComponent(cc.Label);
 const lifecycle=new Map();
 function sync(f){
  function walk(n,active){active=active&&n.active;
   for(const name of ['DraggableItem','CableConnector',...Object.values(names)]){const c=n.getComponent(classes[name]);if(!c)continue;const old=lifecycle.get(c)||{loaded:false,active:false};
    if(!old.loaded){c.onLoad?.();old.loaded=true;}const enabled=active&&c.enabled;if(enabled!==old.active){if(enabled)c.onEnable?.();else c.onDisable?.();old.active=enabled;}lifecycle.set(c,old);}
   n.children.slice().forEach(child=>walk(child,active));
  }walk(f.root,true);
 }
 const current=f=>f.host.node.children.find(n=>n.active&&n.getComponent(classes[names[f.host.currentKind]]))?.getComponent(classes[names[f.host.currentKind]]);
 function tick(f,c,dt){sync(f);actions.update(0);actions.update(dt);c?.update?.(dt);c?.view?.update(dt);sync(f);}
 function emit(f,n,key,p=n.position,id=1,world=false){
  sync(f);const w=world?p:f.host.node.getComponent(cc.UITransform).convertToWorldSpaceAR(new cc.Vec3(p.x,p.y,0));
  const viewport=cc.view.getViewportRect(),t=new cc.Touch(w.x*cc.view.getScaleX()+viewport.x,w.y*cc.view.getScaleY()+viewport.y,id),type=cc.Node.EventType[key];
  const e=new cc.EventTouch([t],false,type,[t]);e.touch=t;e.simulate=true;
  assert(Math.abs(e.getUILocation().x-w.x)<.01&&Math.abs(e.getUILocation().y-w.y)<.01,'Real Touch coordinate conversion');n.emit(type,e);sync(f);
 }
 const tap=(f,n)=>{emit(f,n,'TOUCH_START');emit(f,n,'TOUCH_END');};
 function fixture(index=0){
  const root=ui('Root'),run=root.addComponent(classes.RunController),host=ui('Host',root).addComponent(classes.StageHost),manager=root.addComponent(classes.LevelManager);
  roots.push({root,run,host,manager});const f=roots.at(-1);
  fields.forEach(key=>host[key]=source.stageHost[key]);host.visualAssets=source.stageHost.visualAssets;
  run.timeLabel=label('Time',root);run.mistakeLabel=label('Mistakes',root);
  Object.assign(manager,{autoStartOnSceneLoad:false,useAdvancedOrders:true,runController:run,stageHost:host});
  for(const key of ['chapterLabel','levelLabel','levelTitleLabel','stageLabel','statusLabel'])manager[key]=label(key,root);
  manager.tutorialHint=ui('Tutorial',root);manager.tutorialLabel=label('TutorialText',manager.tutorialHint);
  manager.completePanel=ui('Complete',root);manager.completeLabel=label('CompleteTitle',manager.completePanel);manager.completeDetailLabel=label('Detail',manager.completePanel);
  manager.nextButton=ui('Next',manager.completePanel).addComponent(cc.Button);manager.actionButtonLabel=label('Action',manager.nextButton.node);
  // Off-scene roots need the real engine activator for hierarchy/input guards.
  // Editor suppresses user lifecycle, so sync still invokes the owned methods.
  assert(cc.director._nodeActivator?.activateNode, 'Real NodeActivator unavailable');
  cc.director._nodeActivator.activateNode(root, true);
  manager.loadOrder(index);sync(f);assert(manager.totalOrders===15,'Formal catalog must contain15');return f;
 }
 function solve(f){
  const c=current(f),kind=f.host.currentKind,d=f.manager.orders[f.manager.currentOrderIndex].stages[f.manager.currentStageIndex];assert(c,'One current concrete controller');
  if(kind==='drag-match')for(const n of c.itemNodes.filter(n=>n.active)){const v=n.getComponent(classes.DraggableItem);emit(f,n,'TOUCH_START',n.worldPosition,1,true);emit(f,n,'TOUCH_END',v.target.worldPosition,1,true);tick(f,c,.16);}
  else if(kind==='cable-connect')for(const n of c.cableNodes.filter(n=>n.active)){const v=n.getComponent(classes.CableConnector);emit(f,v.head,'TOUCH_START',v.head.worldPosition,1,true);emit(f,v.head,'TOUCH_END',v.currentPort.worldPosition,1,true);tick(f,c,.16);}
  else if(kind==='clean-swipe')for(const n of c.cellNodes.filter(n=>n.active)){if(c.progress.completed>=c.progress.total)break;emit(f,c.inputSurface,'TOUCH_START',n.worldPosition,1,true);emit(f,c.inputSurface,'TOUCH_END',n.worldPosition,1,true);tick(f,c,.09);}
  else if(kind==='fault-spot'){tap(f,c.hotspotNodes[d.hotspots.findIndex(h=>h.id===d.faultId)]);if(d.diagnosticMode)tap(f,c.confirmationNode);}
  else if(kind==='sequence-test')for(const id of d.sequence)tap(f,c.choiceNodes[d.choices.findIndex(h=>h.id===id)]);
  else if(kind==='guided-trace'){
   emit(f,c.handleNode,'TOUCH_START',d.points[0]);for(let s=0;s<3;s++)for(let i=1;i<=16;i++)emit(f,c.handleNode,'TOUCH_MOVE',{x:d.points[s].x+(d.points[s+1].x-d.points[s].x)*i/16,y:d.points[s].y+(d.points[s+1].y-d.points[s].y)*i/16});emit(f,c.handleNode,'TOUCH_END',d.points[3]);
  }else if(kind==='rotary-control'){
   const centers=d.mode==='align'?[d.center]:d.screws.map(s=>s.position);
   centers.forEach((p,j)=>{const n=c.controlNodes[j],a=d.mode==='align'?55:0,b=d.mode==='align'?0:280,polar=t=>({x:p.x+d.radius*Math.cos(t*Math.PI/180),y:p.y+d.radius*Math.sin(t*Math.PI/180)});
    emit(f,n,'TOUCH_START',polar(a));for(let i=1;i<=32;i++)emit(f,n,'TOUCH_MOVE',polar(a+(b-a)*i/32));emit(f,n,'TOUCH_END',polar(b));});tick(f,c,.61);
  }else if(kind==='gauge-tune'){
   const values=d.mode==='fan'?[65,70]:d.mode==='stereo'?[60,58]:[75,65];c.sliderNodes.forEach((n,i)=>{const p={x:-260+values[i]*5.2,y:n.position.y};emit(f,n,'TOUCH_START',n.position,i+1);emit(f,n,'TOUCH_MOVE',p,i+1);emit(f,n,'TOUCH_END',p,i+1);});tick(f,c,.71);
  }
  tick(f,c,.46);return {kind,id:d.id,progress:{...c.progress}};
 }
 function check(name,fn){try{checks.push({name,status:'PASS',evidence:fn()});}catch(e){checks.push({name,status:'FAIL',error:String(e.stack||e)});}}
 try{
  assert(source?.stageHost,'Open formal Game.scene');fields.forEach(k=>assert(source.stageHost[k] instanceof cc.Prefab,'Missing saved '+k));
  cc.TweenSystem.instance=system;
  check('actual saved five new Prefabs have typed controller and15 imported SpriteFrames',()=>{
   const rows=[];for(const [i,kind] of Object.keys(names).entries()){if(i<3)continue;const p=source.stageHost[fields[i]],c=p.data.getComponent(classes[names[kind]]);
    assert(c?.view?.frames.length===15&&c.view.frames.every(f=>f instanceof cc.SpriteFrame),'Saved view bindings '+kind);rows.push({kind,uuid:p.uuid});}return rows;
  });
  check('natural manager transition through15orders27stages retains8cached roots and only one active stage',()=>{
   const f=fixture(),stages=[];for(let order=0;order<15;order++){
    assert(f.manager.currentOrderIndex===order,'Order sequence');for(let s=0;s<f.manager.orders[order].stages.length;s++){
     assert(f.manager.currentStageIndex===s,`Stage sequence order${order+1} expected${s} actual${f.manager.currentStageIndex}`);assert(f.host.node.children.filter(n=>n.active).length===1,'Exactly one active root');
     stages.push(solve(f));assert(f.run.levelResults.length===order+(s===f.manager.orders[order].stages.length-1?1:0),'No intermediate result');
    }if(order<14){assert(f.manager.state===1,'Intermediate order result');f.manager.nextOrder();sync(f);}
   }
   assert(f.manager.state===2&&f.run.summary.completedOrders===15&&stages.length===27&&f.host.cachedStageCount===8,'Full run summary');
   const evidence={stages,summary:f.run.summary,cachedRoots:f.host.cachedStageCount,finalDetail:f.manager.completeDetailLabel.string};
   f.manager.playAgain();sync(f);assert(f.manager.currentOrderIndex===0&&f.run.levelResults.length===0&&current(f).progress.completed===0,'Replay');return evidence;
  });
  check('real wrong fault taps count once, CANCEL and stale callbacks cannot mutate restarted order',()=>{
   const f=fixture(10),c=current(f),n=c.hotspotNodes[0];tap(f,n);tap(f,n);assert(f.run.currentMistakes===1,'Unique wrong candidate');
   const correct=c.hotspotNodes[2];emit(f,correct,'TOUCH_START');emit(f,correct,'TOUCH_CANCEL');assert(c.progress.completed===0,'CANCEL');
   const old=c.session.callbacks;f.manager.restartCurrentLevel();sync(f);old.onComplete();old.onMistake();tick(f,c,5);
   assert(f.manager.currentStageIndex===0&&f.run.currentMistakes===0&&f.run.levelResults.length===0,'Restart generation');return {uniqueWrong:1,restartedMistakes:0};
  });
  check('real gauge requires both releases and uninterrupted0.7s and ignores foreignEND/CANCEL',()=>{
   const f=fixture(12);solve(f);const c=current(f),[a,b]=c.sliderNodes;
   emit(f,a,'TOUCH_START',a.position,1);emit(f,a,'TOUCH_MOVE',{x:78,y:a.position.y},1);
   emit(f,b,'TOUCH_START',b.position,2);emit(f,b,'TOUCH_MOVE',{x:104,y:b.position.y},2);emit(f,b,'TOUCH_END',{x:104,y:b.position.y},2);
   emit(f,a,'TOUCH_END',{x:78,y:a.position.y},99);tick(f,c,2);assert(f.run.levelResults.length===0,'Held or foreignEND');
   emit(f,a,'TOUCH_CANCEL',a.position,1);tick(f,c,2);assert(f.run.levelResults.length===0,'CANCEL');
   emit(f,a,'TOUCH_START',{x:78,y:a.position.y});emit(f,a,'TOUCH_END',{x:78,y:a.position.y});tick(f,c,.699);assert(f.run.levelResults.length===0,'Early hold');
   tick(f,c,.002);assert(c.progress.completed===2&&c.progress.total===2,'Hold boundary');tick(f,c,.41);assert(f.run.levelResults.length===1&&f.run.currentMistakes===0,'Complete once');
   return {values:c.controlValues,reading:c.reading,holdBoundary:.7};
  });
  check('real Final→Home reset and Start restores fresh order1',()=>{const f=fixture(14);solve(f);solve(f);solve(f);assert(f.manager.state===2,'Final15');assert(f.manager.returnHomeFromFinal(),'Return Home');assert(!f.manager.hasStarted&&!f.run.isLevelRunning,'Paused Home');assert(f.manager.startFirstOrder(),'Start again');sync(f);assert(f.manager.currentOrderIndex===0&&f.run.levelResults.length===0,'Fresh start');return {freshOrder:1};});
  check('actual calibration CANCEL cannot finish; signed screw travel crosses seam and reverse tightens',()=>{
   const f=fixture(9),c=current(f),d=f.manager.orders[9].stages[0],n=c.controlNodes[0];
   const polar=(center,r,a)=>({x:center.x+r*Math.cos(a*Math.PI/180),y:center.y+r*Math.sin(a*Math.PI/180)});
   emit(f,n,'TOUCH_START',polar(d.center,d.radius,55));for(let i=1;i<=16;i++)emit(f,n,'TOUCH_MOVE',polar(d.center,d.radius,55*(1-i/16)));
   emit(f,n,'TOUCH_CANCEL',polar(d.center,d.radius,0));tick(f,c,2);assert(c.progress.completed===0&&f.manager.currentStageIndex===0,'Calibration CANCEL');
   const s=fixture(12),v=current(s),def=s.manager.orders[12].stages[0],center=def.screws[0].position,control=v.controlNodes[0];
   function turn(a,b){emit(s,control,'TOUCH_START',polar(center,def.radius,a));for(let i=1;i<=16;i++)emit(s,control,'TOUCH_MOVE',polar(center,def.radius,a+(b-a)*i/16));emit(s,control,'TOUCH_END',polar(center,def.radius,b));}
   turn(170,210);assert(Math.abs(v.screwDegrees[0]-40)<.01,'Angular seam');turn(210,180);assert(Math.abs(v.screwDegrees[0]-10)<.01,'Reverse tightening');
   return {calibrationCancelCompleted:0,screwForwardDegrees:40,screwAfterReverse:10};
  });
  check('actual trace rejects endpoint teleport, retains confirmed checkpoints afterCANCEL and deviation without mistakes',()=>{
   const f=fixture(10);f.manager.loadStage(1);sync(f);const c=current(f),d=f.manager.orders[10].stages[1],n=c.handleNode;
   emit(f,n,'TOUCH_START',d.points[0]);emit(f,n,'TOUCH_MOVE',d.points[3]);emit(f,n,'TOUCH_END',d.points[3]);assert(c.progress.completed===0,'Teleport rejected');
   emit(f,n,'TOUCH_START',d.points[0]);for(let i=1;i<=16;i++)emit(f,n,'TOUCH_MOVE',{x:d.points[0].x+(d.points[1].x-d.points[0].x)*i/16,y:d.points[0].y+(d.points[1].y-d.points[0].y)*i/16});
   emit(f,n,'TOUCH_CANCEL',d.points[1]);assert(c.progress.completed===1&&Math.abs(c.handlePosition.x-d.points[1].x)<.01,'Preserved checkpoint');
   emit(f,n,'TOUCH_START',d.points[1]);emit(f,n,'TOUCH_MOVE',{x:300,y:-300});assert(c.isDeviated&&c.progress.completed===1&&f.run.currentMistakes===0,'Safe deviation');
   return {teleportPassed:0,confirmedCheckpoints:1,deviationMistakes:0};
  });
  check('current compiled headset readout is below hotspots and gauge uses actual two-indicator progress',()=>{
   const f=fixture(13),c=current(f),readout=c.view.controlLayer.getChildByName('Text-fault-output');
   assert(readout?.position.y===-220,'Current compiled headset readout must be y=-220');
   solve(f);const gauge=current(f);assert(gauge.progress.total===2,'Current compiled gauge total2');
   assert(gauge.view.hintLabel.string.includes('左右差'), 'Current gauge target is always readable below device');
   const s=fixture(9);s.manager.loadStage(1);sync(s);const target=current(s).view.controlLayer.getChildByName('Text-sequence-target');
   assert(target?.position.y===-329, 'Current sequence target must be below every key and device');
   return {headsetReadoutY:readout.position.y,gaugeIndicatorCount:gauge.progress.total,sequenceTargetY:target.position.y};
  });
  check('actual keyboard diagnosis tests neutral outputs and only explicit confirmation judges, resets pending feedback',()=>{
   const f=fixture(11),c=current(f),a=c.hotspotNodes[1],s=c.hotspotNodes[0],read=()=>c.view.controlLayer.getChildByName('Text-fault-output').getComponent(cc.Label).string;
   assert(c.testedHotspotId===null&&!read().includes('S'),'No revealed answer');tick(f,c,2);assert(!read().includes('SS'),'No autonomous answer');
   tap(f,a);assert(read()==='A → A'&&f.run.currentMistakes===0&&c.progress.completed===0,'Neutral test A');
   tap(f,c.confirmationNode);tap(f,c.confirmationNode);assert(f.run.currentMistakes===1,'Wrong confirmation once');
   tap(f,s);assert(read()==='S → SS'&&c.progress.completed===0,'S testing not completion');tick(f,c,1);assert(f.manager.currentStageIndex===0,'Explicit confirmation required');
   tap(f,c.confirmationNode);tick(f,c,.41);assert(f.manager.currentStageIndex===1,'Confirmed stage transition');
   f.manager.restartCurrentLevel();sync(f);const fresh=current(f);assert(fresh.testedHotspotId===null&&fresh.progress.completed===0&&f.run.currentMistakes===0,'Restart clears diagnosis');
   return {normalOutput:'A → A',faultOutput:'S → SS',wrongConfirmationsCharged:1,explicitConfirmation:true};
  });
  check('installed SDK BUILD constants compile actual QA component into real engine with flag true but no visible or callable controls',()=>{
   delete require.cache[require.resolve('./day5b-release-proof')];return require('./day5b-release-proof').run(cc);
  });
  result.ok=checks.length===10&&checks.every(c=>c.status==='PASS');
 }catch(e){result.error=String(e.stack||e);}
 finally{
  for(const f of roots){try{f.manager.onDestroy();f.root.destroy();}catch(e){cleanupErrors.push(String(e));}}
  actions.removeAllActions();cc.TweenSystem.instance=originalSystem;
  result.cleanup={fixtures:roots.length,formalSceneUnchanged:before===snapshot(),originalTweenSystemRestored:cc.TweenSystem.instance===originalSystem,errors:cleanupErrors};
  if(!result.cleanup.formalSceneUnchanged||!result.cleanup.originalTweenSystemRestored||cleanupErrors.length)result.ok=false;
 }
 result.passedChecks=checks.filter(c=>c.status==='PASS').length;result.failedChecks=checks.filter(c=>c.status==='FAIL').length;return result;
};
