'use strict';
const assert=require('node:assert/strict');
const {fixture}=require('./day5b-fixture.cjs');
exports.runIntegrationTests=function(r) {
 const {Node,UITransform,Label,Button,Prefab,Sprite,Graphics,UIOpacity,Vec3,EventTouch}=r.mock.cc;
 const {StageHost}=r.load('stages/StageHost.ts'),{LevelManager,GameState}=r.load('core/LevelManager.ts');
 const kinds={'drag-match':'DragMatchStageController','cable-connect':'CableConnectStageController','clean-swipe':'CleanSwipeStageController','fault-spot':'FaultSpotStageController','rotary-control':'RotaryControlStageController','guided-trace':'GuidedTraceStageController','gauge-tune':'GaugeTuneStageController','sequence-test':'SequenceTestStageController'};
 const types=Object.fromEntries(Object.entries(kinds).map(([k,n])=>[k,r.load('stages/'+n+'.ts')[n]]));
 const {CableConnector}=r.load('gameplay/CableConnector.ts');
 const fields=['dragMatchPrefab','cableConnectPrefab','cleanSwipePrefab','faultSpotPrefab','rotaryControlPrefab','guidedTracePrefab','gaugeTunePrefab','sequenceTestPrefab'];
 const node=(name,parent)=>{const n=new Node(name);n.addComponent(UITransform);if(parent)n.parent=parent;return n;};
 const label=(name,parent)=>node(name,parent).addComponent(Label);
 const visual=(name,extra)=>new Prefab(()=>{const n=node(name);n.addComponent(Sprite);label('Caption',n);extra?.(n);return n;});
 const factories={
  'drag-match':()=>{const n=node('Drag'),c=n.addComponent(types['drag-match']);c.gameController=n.addComponent(r.GameController);c.itemPrefab=visual('Item',n=>n.addComponent(r.DraggableItem));c.targetPrefab=visual('Target');return n;},
  'cable-connect':()=>{const n=node('Cable'),c=n.addComponent(types['cable-connect']);c.cablePrefab=new Prefab(()=>{const x=node('Cable'),v=x.addComponent(CableConnector);v.anchor=node('Anchor',x);v.head=node('Head',x);v.head.addComponent(Sprite);label('Label',v.head);v.line=node('Line',x).addComponent(Graphics);return x;});c.portPrefab=visual('Port');return n;},
  'clean-swipe':()=>{const n=node('Clean'),c=n.addComponent(types['clean-swipe']);c.inputSurface=n;c.dirtLayer=node('Dirt',n);c.dirtCellPrefab=visual('Cell',n=>n.addComponent(UIOpacity));return n;},
 };
 for(const k of Object.keys(types).slice(3))factories[k]=()=>fixture(r,types[k]).root;
 const emit=(f,n,type,p=n.position,id=1)=>{const w=f.host.node.getComponent(UITransform).convertToWorldSpaceAR(new Vec3(p.x,p.y,0));n.emit(Node.EventType[type],new EventTouch(id,w));};
 const world=(n,type,p=n.worldPosition)=>n.emit(Node.EventType[type],new EventTouch(1,p));
 const build=()=>{
  const root=node('Canvas'),host=node('Host',root).addComponent(StageHost),run=root.addComponent(r.RunController),manager=root.addComponent(LevelManager);
  Object.keys(kinds).forEach((k,i)=>host[fields[i]]=new Prefab(factories[k]));
  run.timeLabel=label('Time',root);run.mistakeLabel=label('Mistakes',root);
  Object.assign(manager,{useAdvancedOrders:true,autoStartOnSceneLoad:false,stageHost:host,runController:run});
  for(const key of ['chapterLabel','levelLabel','levelTitleLabel','stageLabel','statusLabel'])manager[key]=label(key,root);
  manager.tutorialHint=node('Tutorial',root);manager.tutorialLabel=label('Text',manager.tutorialHint);
  manager.completePanel=node('Panel',root);manager.completeLabel=label('Title',manager.completePanel);manager.completeDetailLabel=label('Detail',manager.completePanel);
  manager.nextButton=node('Next',manager.completePanel).addComponent(Button);manager.actionButtonLabel=label('Action',manager.nextButton.node);
  r.mock.boot(root);
  return {root,host,run,manager,active:()=>host.node.children.find(n=>n.active)?.getComponent(types[host.currentKind])};
 };
 const tap=(f,n)=>{emit(f,n,'TOUCH_START');emit(f,n,'TOUCH_END');};
 function solve(f) {
  const c=f.active(),kind=f.host.currentKind,d=f.manager.orders[f.manager.currentOrderIndex].stages[f.manager.currentStageIndex];
  const tick=dt=>{c.update?.(dt);c.view?.update(dt);};
  if(kind==='drag-match')for(const n of c.itemNodes.filter(n=>n.active)){const v=n.getComponent(r.DraggableItem);world(n,'TOUCH_START');world(n,'TOUCH_END',v.target.worldPosition);r.mock.flush(n);}
  else if(kind==='cable-connect')for(const n of c.cableNodes.filter(n=>n.active)){const v=n.getComponent(CableConnector);world(v.head,'TOUCH_START');world(v.head,'TOUCH_END',v.currentPort.worldPosition);r.mock.flush(v.head);}
  else if(kind==='clean-swipe')for(const n of c.cellNodes.filter(n=>n.active)){if(c.progress.completed===c.progress.total)break;world(c.inputSurface,'TOUCH_START',n.worldPosition);world(c.inputSurface,'TOUCH_END',n.worldPosition);r.mock.flush();}
  else if(kind==='fault-spot'){tap(f,c.hotspotNodes[d.hotspots.findIndex(h=>h.id===d.faultId)]);if(d.diagnosticMode)tap(f,c.confirmationNode);}
  else if(kind==='sequence-test')for(const id of d.sequence)tap(f,c.choiceNodes[d.choices.findIndex(h=>h.id===id)]);
  else if(kind==='guided-trace'){
   const n=c.handleNode;emit(f,n,'TOUCH_START',d.points[0]);for(let s=0;s<3;s++)for(let i=1;i<=16;i++)emit(f,n,'TOUCH_MOVE',{x:d.points[s].x+(d.points[s+1].x-d.points[s].x)*i/16,y:d.points[s].y+(d.points[s+1].y-d.points[s].y)*i/16});emit(f,n,'TOUCH_END',d.points[3]);
  } else if(kind==='rotary-control'){
   const centers=d.mode==='align'?[d.center]:d.screws.map(s=>s.position);
   centers.forEach((p,j)=>{const n=c.controlNodes[j],from=d.mode==='align'?55:0,to=d.mode==='align'?0:280;
    const polar=a=>({x:p.x+d.radius*Math.cos(a*Math.PI/180),y:p.y+d.radius*Math.sin(a*Math.PI/180)});emit(f,n,'TOUCH_START',polar(from));for(let i=1;i<=32;i++)emit(f,n,'TOUCH_MOVE',polar(from+(to-from)*i/32));emit(f,n,'TOUCH_END',polar(to));});tick(.61);
  } else if(kind==='gauge-tune'){
   const values=d.mode==='fan'?[65,70]:d.mode==='stereo'?[60,58]:[75,65];c.sliderNodes.forEach((n,i)=>{const p={x:-260+values[i]*5.2,y:n.position.y};emit(f,n,'TOUCH_START',{x:n.position.x,y:n.position.y},i+1);emit(f,n,'TOUCH_MOVE',p,i+1);emit(f,n,'TOUCH_END',p,i+1);});tick(.71);
  }
  tick(.46);r.mock.flush();return kind;
 }
 let groups=0;const test=(name,fn)=>{fn();groups++;console.log('PASS Day5B integration: '+name);};
 test('formal scene opt-in waits for Start then naturally runs all fifteen orders and twenty-seven steps with eight cached roots',()=>{
  const f=build();assert.equal(f.manager.hasStarted,false);assert.equal(f.run.isLevelRunning,false);assert.equal(f.host.cachedStageCount,0);
  assert.equal(f.manager.startFirstOrder(),true);assert.equal(f.manager.totalOrders,15);let steps=0;
  for(let order=0;order<15;order++){
   assert.equal(f.manager.currentOrderIndex,order);
   for(let s=0;s<f.manager.orders[order].stages.length;s++){
    assert.equal(f.manager.currentStageIndex,s);assert.equal(f.host.node.children.filter(n=>n.active).length,1);
    f.run.advanceTime(1);solve(f);steps++;assert.equal(f.run.levelResults.length,order+(s===f.manager.orders[order].stages.length-1?1:0));
   }
   if(order<14){assert.equal(f.manager.state,GameState.LevelComplete);f.manager.nextButton.node.emit(Button.EventType.CLICK);}
  }
  assert.equal(steps,27);assert.equal(f.manager.state,GameState.DemoComplete);assert.equal(f.run.summary.completedOrders,15);assert.equal(f.run.summary.earnedStars,45);assert.equal(f.host.cachedStageCount,8);
  assert.match(f.manager.completeDetailLabel.string,/15 \/ 15/);assert.match(f.manager.completeDetailLabel.string,/27 \/ 27/);
  f.manager.playAgain();assert.equal(f.manager.currentOrderIndex,0);assert.equal(f.run.levelResults.length,0);assert.equal(f.active().progress.completed,0);assert.equal(f.host.cachedStageCount,8);
 });
 test('restart during new input invalidates old callback and removes all old listeners',()=>{
  const f=build();f.manager.startFirstOrder();f.manager.loadOrder(10);const old=f.active(),wrong=old.hotspotNodes[0];tap(f,wrong);assert.equal(f.run.currentMistakes,1);
  const callbacks=old.session.callbacks;f.manager.restartCurrentLevel();callbacks.onMistake();callbacks.onComplete();old.update(10);
  assert.equal(f.manager.currentStageIndex,0);assert.equal(f.run.currentMistakes,0);assert.equal(f.run.levelResults.length,0);assert.equal(old.progress.completed,0);assert.equal(wrong.listenerCount(),4);
 });
 test('reusing new stage kinds across orders retains bounded cache and replaces configuration and pointer listeners',()=>{
  const f=build();f.manager.startFirstOrder();f.manager.loadOrder(9);solve(f);const first=f.active();assert.equal(first.currentTargetId,'up');
  f.manager.loadOrder(11);solve(f);assert.equal(f.active(),first);assert.equal(first.currentTargetId,'S');assert.equal(first.choiceNodes[0].listenerCount(),4);
  f.manager.loadOrder(14);solve(f);solve(f);assert.equal(f.active(),first);assert.equal(first.currentTargetId,'input');assert.ok(f.host.cachedStageCount<=8);
 });
 test('Final return to Home clears all results and a second Start loads a fresh order1 while preserving reusable roots',()=>{
  const f=build();f.manager.startFirstOrder();f.manager.loadOrder(14);solve(f);solve(f);solve(f);assert.equal(f.manager.state,GameState.DemoComplete);
  assert.equal(f.manager.returnHomeFromFinal(),true);assert.equal(f.manager.hasStarted,false);assert.equal(f.run.isLevelRunning,false);assert.equal(f.run.levelResults.length,0);
  assert.equal(f.host.node.children.filter(n=>n.active).length,0);assert.equal(f.manager.startFirstOrder(),true);assert.equal(f.manager.currentOrderIndex,0);assert.equal(f.run.currentMistakes,0);
 });
 return groups;
};
