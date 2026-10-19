'use strict';
const assert=require('node:assert/strict');
const {fixture}=require('./day5b-fixture.cjs');
exports.runFinalPolishTests=function(r){
 const {Node,Label,Button,UITransform,Graphics}=r.mock.cc;
 const {FaultSpotStageController:Fault}=r.load('stages/FaultSpotStageController.ts');
 const {DAY5B_ORDERS:orders}=r.load('data/Day5BOrderCatalog.ts');
 const d=orders[2].stages[0];let groups=0;
 const test=(name,fn)=>{fn();groups++;console.log('PASS Day5B final polish: '+name);};
 const build=()=>{const f=fixture(r,Fault);f.controller.configure(d,f.callbacks);f.controller.setInputEnabled(true);return f;};
 const key=(f,id)=>f.controller.hotspotNodes[d.hotspots.findIndex(h=>h.id===id)];
 const output=f=>f.view.controlLayer.getChildByName('Text-fault-output').getComponent(Label).string;
 const confirm=f=>f.tap(f.controller.confirmationNode);
 test('actual initial keyboard controller/view has equal neutral candidates, no answer or autonomous flashing',()=>{
  const f=build(),colors=f.controller.hotspotNodes.map(n=>n.getComponent(Graphics).fillColor);
  assert.equal(d.diagnosticMode,'test-and-confirm');assert.equal(f.controller.testedHotspotId,null);
  assert.ok(!output(f).includes('S'));assert.ok(!d.clueText.includes('S'));assert.ok(!d.tutorial.includes('S'));
  assert.equal(new Set(colors.map(c=>JSON.stringify(c))).size,1);f.tick(5);
  assert.deepEqual(f.controller.hotspotNodes.map(n=>n.getComponent(Graphics).fillColor),colors);assert.equal(f.result.completions,0);
 });
 test('all normal keys are neutral tests, with one output and zero progress or mistakes',()=>{
  const f=build();for(const h of d.hotspots.filter(h=>h.id!=='S')){f.tap(key(f,h.id));assert.equal(output(f),`${h.id} → ${h.id}`);assert.equal(f.controller.progress.completed,0);}
  assert.equal(f.result.mistakes,0);assert.equal(f.result.completions,0);
 });
 test('testing S visibly echoes SS without completing; explicit confirmation completes once',()=>{
  const f=build();f.tap(key(f,'S'));assert.equal(output(f),'S → SS');assert.equal(f.controller.progress.completed,0);f.tick(2);assert.equal(f.result.completions,0);
  confirm(f);assert.equal(f.controller.progress.completed,1);f.tick(.41);confirm(f);f.tick(2);assert.equal(f.result.completions,1);assert.equal(f.result.mistakes,0);
 });
 test('confirmation with no tested key is neutral, and an incorrect confirmation only charges once per diagnosis',()=>{
  const f=build();confirm(f);assert.equal(f.result.mistakes,0);f.tap(key(f,'A'));confirm(f);confirm(f);f.tap(key(f,'D'));confirm(f);
  assert.equal(f.result.mistakes,1);assert.equal(f.controller.progress.completed,0);f.tap(key(f,'S'));confirm(f);f.tick(.41);assert.equal(f.result.completions,1);
 });
 test('candidate CANCEL/foreign END/movement cannot select or charge mistakes',()=>{
  const f=build(),n=key(f,'S'),p=n.position;f.emit(n,'TOUCH_START',p.x,p.y,1);f.emit(n,'TOUCH_END',p.x,p.y,2);f.emit(n,'TOUCH_CANCEL',p.x,p.y,1);
  assert.equal(f.controller.testedHotspotId,null);f.emit(n,'TOUCH_START',p.x,p.y);f.emit(n,'TOUCH_MOVE',p.x+20,p.y);f.emit(n,'TOUCH_END',p.x,p.y);
  assert.equal(f.controller.testedHotspotId,null);assert.equal(f.result.mistakes,0);
 });
 test('confirm CANCEL and duplicate END do not charge or complete',()=>{
  const f=build();f.tap(key(f,'A'));const n=f.controller.confirmationNode,p=n.position;
  f.emit(n,'TOUCH_START',p.x,p.y);f.emit(n,'TOUCH_CANCEL',p.x,p.y);f.emit(n,'TOUCH_END',p.x,p.y);assert.equal(f.result.mistakes,0);
  confirm(f);f.emit(n,'TOUCH_END',p.x,p.y);assert.equal(f.result.mistakes,1);assert.equal(f.result.completions,0);
 });
 test('disable clears tested selection and output; re-enable cannot confirm stale S',()=>{
  const f=build();f.tap(key(f,'S'));f.controller.setInputEnabled(false);assert.equal(f.controller.testedHotspotId,null);assert.ok(!output(f).includes('SS'));
  f.controller.setInputEnabled(true);confirm(f);f.tick(1);assert.equal(f.result.completions,0);assert.equal(f.controller.progress.completed,0);
 });
 test('restart cancels pending diagnosis completion and clears wrong confirmations',()=>{
  const f=build();f.tap(key(f,'A'));confirm(f);f.tap(key(f,'S'));confirm(f);f.controller.resetStage();f.tick(5);
  assert.equal(f.result.completions,0);assert.equal(f.controller.testedHotspotId,null);assert.equal(f.controller.progress.completed,0);
  f.controller.resumeStage(f.callbacks);f.controller.setInputEnabled(true);f.tap(key(f,'A'));confirm(f);assert.equal(f.result.mistakes,2);
 });
 test('pool reconfiguration to printer and headset removes diagnostic confirm root and retains direct legacy selection',()=>{
  const f=build();f.tap(key(f,'S'));const old=f.controller.confirmationNode;
  for(const stage of [orders[1].stages[0],orders[4].stages[0]]){
   f.controller.configure(stage,f.callbacks);f.controller.setInputEnabled(true);assert.equal(old.active,false);assert.equal(old.listenerCount(),0);
   assert.equal(f.controller.confirmationNode,null);f.tap(f.controller.hotspotNodes[stage.hotspots.findIndex(h=>h.id===stage.faultId)]);f.tick(.41);
  }assert.equal(f.result.completions,2);
 });
 test('diagnosis confirm is visible, at least88 high and does not overlap any unchanged candidate hitbox',()=>{
  const f=build(),n=f.controller.confirmationNode,ui=n.getComponent(UITransform);assert.ok(ui.height>=88);assert.ok(n.position.y-ui.height/2>=-400);
  f.controller.hotspotNodes.forEach((node,i)=>{assert.deepEqual({x:node.position.x,y:node.position.y},d.hotspots[i].position);const v=node.getComponent(UITransform);assert.equal(v.width,d.hotspots[i].size.width);assert.equal(v.height,d.hotspots[i].size.height);assert.ok(n.position.y+ui.height/2<node.position.y-v.height/2);});
  assert.equal(f.view.hintLabel.string,'');assert.ok(f.view.feedbackLabel.fontSize>=26);
 });
 test('only the keyboard diagnosis opt-in is accepted by the actual validator',()=>{
  const {validateDay5BStage:validate}=r.load('data/Day5BStageValidation.ts');validate(d);assert.throws(()=>validate({...d,diagnosticMode:'other'}));assert.throws(()=>validate({...orders[1].stages[0],diagnosticMode:'test-and-confirm'}));
 });
 test('larger hint/gauge texts preserve original slider roots and show differentiated live ranges',()=>{
  const {GaugeTuneStageController:Gauge}=r.load('stages/GaugeTuneStageController.ts');const f=fixture(r,Gauge);
  for(const stage of [orders[3].stages[1],orders[4].stages[1],orders[5].stages[1]]){f.controller.configure(stage,f.callbacks);f.controller.setInputEnabled(true);assert.ok(f.view.hintLabel.fontSize>=28);assert.ok(f.view.hintLabel.string.length>8);f.controller.sliderNodes.forEach((n,i)=>{assert.equal(n.position.y,-130-i*140);assert.equal(n.getComponent(UITransform).width,620);assert.equal(n.getComponent(UITransform).height,88);});}
 });
 const {Day5BReviewLauncher:Launcher}=r.load('ui/Day5BReviewLauncher.ts');
 function launcher(){const root=new Node('Canvas'),c=root.addComponent(Launcher),review=new Node('Review');review.parent=root;review.active=false;c.reviewRoot=review;let selected=0;
  c.manager={hasStarted:true,totalOrders:15,loadOrder:()=>selected++,stageHost:{resetAll(){}},runController:{startNewRun(){}}};c.home={overlay:null};
  for(let id=10;id<=15;id++){const n=new Node('ReviewOrder'+id);n.parent=review;n.addComponent(Button);}return {c,review,selected:()=>selected};}
 for(const [preview,buildFlag,explicit,visible] of [[true,false,false,false],[true,false,true,true],[false,true,false,false],[false,true,true,false],[false,false,true,false],[true,true,true,false]]){
  test(`actual QA launcher PREVIEW=${preview} BUILD=${buildFlag} explicit=${explicit} visible=${visible}`,()=>{const old={...r.environment};Object.assign(r.environment,{PREVIEW:preview,BUILD:buildFlag});try{const f=launcher();assert.equal(f.c.qaEnabled,false);f.c.qaEnabled=explicit;f.c.onEnable();assert.equal(f.review.active,visible);f.review.children[0].emit(Button.EventType.CLICK);assert.equal(f.selected(),visible?1:0);if(visible){r.environment.BUILD=true;f.review.children[0].emit(Button.EventType.CLICK);assert.equal(f.selected(),1);}f.c.onDisable();assert.equal(f.review.children[0].listenerCount(),0);}finally{Object.assign(r.environment,old);}});
 }
 return groups;
};
