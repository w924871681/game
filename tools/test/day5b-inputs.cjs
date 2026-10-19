'use strict';
const assert=require('node:assert/strict');
const {fixture}=require('./day5b-fixture.cjs');
exports.runInputTests=function(runtime) {
 const {DAY5B_ORDERS}=runtime.load('data/Day5BOrderCatalog.ts');
 const stages=DAY5B_ORDERS.flatMap(o=>o.stages);let groups=0;
 const test=(name,f)=>{f();groups++;console.log('PASS Day5B input: '+name);};
 const build=(className,kind,mode)=>{const f=fixture(runtime,runtime.load('stages/'+className+'.ts')[className]);f.definition=stages.find(s=>s.kind===kind&&(mode===undefined||s.mode===mode));f.controller.configure(f.definition,f.callbacks);f.controller.setInputEnabled(true);return f;};
 test('fault unique wrong candidate charges once; foreign/CANCEL/drag and duplicateEND never select',()=>{
  const f=build('FaultSpotStageController','fault-spot'),[wrong,,correct]=f.controller.hotspotNodes;
  f.tap(wrong);f.tap(wrong);assert.equal(f.result.mistakes,1);assert.equal(f.controller.progress.completed,0);
  const p=correct.position;f.emit(correct,'TOUCH_START',p.x,p.y,1);f.emit(correct,'TOUCH_END',p.x,p.y,2);f.emit(correct,'TOUCH_CANCEL',p.x,p.y,1);assert.equal(f.controller.progress.completed,0);
  f.emit(correct,'TOUCH_START',p.x,p.y);f.emit(correct,'TOUCH_MOVE',p.x+30,p.y);f.emit(correct,'TOUCH_END',p.x,p.y);assert.equal(f.controller.progress.completed,0);
  f.tap(correct);f.emit(correct,'TOUCH_END',p.x,p.y);assert.equal(f.controller.progress.completed,1);assert.equal(f.result.completions,0);f.tick(.41);f.tick(5);assert.equal(f.result.completions,1);assert.equal(f.result.mistakes,1);
 });
 test('sequence displays current target, wrong retains progress, exact12px taps count while13px do not',()=>{
  const f=build('SequenceTestStageController','sequence-test');const choices=f.controller.choiceNodes;
  const target=f.view.controlLayer.getChildByName('Text-sequence-target');assert.equal(target.position.y,-329);
  assert.ok(target.position.y+18<Math.min(...f.definition.choices.map(c=>c.position.y-c.size.height/2)),'Current target remains below every key hitbox');
  f.tap(choices[1]);assert.equal(f.result.mistakes,1);assert.equal(f.controller.progress.completed,0);
  let p=choices[0].position;f.emit(choices[0],'TOUCH_START',p.x,p.y);f.emit(choices[0],'TOUCH_END',p.x+12,p.y);assert.equal(f.controller.progress.completed,1);
  p=choices[1].position;f.emit(choices[1],'TOUCH_START',p.x,p.y);f.emit(choices[1],'TOUCH_MOVE',p.x+13,p.y);f.emit(choices[1],'TOUCH_END',p.x,p.y);assert.equal(f.controller.progress.completed,1);
  for(let i=1;i<4;i++)f.tap(choices[i]);f.tick(.46);assert.equal(f.result.completions,1);assert.equal(f.result.mistakes,1);
 });
 const polar=(c,r,a)=>({x:c.x+r*Math.cos(a*Math.PI/180),y:c.y+r*Math.sin(a*Math.PI/180)});
 function rotate(f,a,b,end='TOUCH_END') {const d=f.definition,n=f.controller.controlNodes[0],c=d.center,r=d.radius;let p=polar(c,r,a);f.emit(n,'TOUCH_START',p.x,p.y);for(let i=1;i<=8;i++){p=polar(c,r,a+(b-a)*i/8);f.emit(n,'TOUCH_MOVE',p.x,p.y);}f.emit(n,end,p.x,p.y);}
 test('alignment requires actual rotation then release and0.6s hold; reaching green duringCANCEL cannot finish',()=>{
  const f=build('RotaryControlStageController','rotary-control','align');rotate(f,55,0,'TOUCH_CANCEL');f.tick(2);assert.equal(f.result.completions,0);assert.equal(f.controller.progress.completed,0);
  rotate(f,0,10);rotate(f,10,0);f.tick(.59);assert.equal(f.controller.progress.completed,0);f.tick(.011);assert.equal(f.controller.progress.completed,1);f.tick(.41);assert.equal(f.result.completions,1);assert.equal(f.result.mistakes,0);
 });
 test('trace rejects click/teleport endpoint, preserves checkpoints on cancel/deviation and finishes ordered continuousMOVEs',()=>{
  const f=build('GuidedTraceStageController','guided-trace'),d=f.definition,n=f.controller.handleNode;
  f.emit(n,'TOUCH_START',d.points[0].x,d.points[0].y);f.emit(n,'TOUCH_END',d.points[3].x,d.points[3].y);assert.equal(f.controller.progress.completed,0);
  f.emit(n,'TOUCH_START',d.points[0].x,d.points[0].y);f.emit(n,'TOUCH_MOVE',d.points[3].x,d.points[3].y);assert.equal(f.controller.progress.completed,0);assert.equal(f.controller.isDeviated,true);
  const draw=(a,b)=>{for(let i=1;i<=12;i++)f.emit(n,'TOUCH_MOVE',a.x+(b.x-a.x)*i/12,a.y+(b.y-a.y)*i/12);};
  f.emit(n,'TOUCH_END',0,0);f.emit(n,'TOUCH_START',d.points[0].x,d.points[0].y);draw(d.points[0],d.points[1]);assert.equal(f.controller.progress.completed,1);f.emit(n,'TOUCH_CANCEL',0,0);assert.deepEqual(f.controller.handlePosition,d.points[1]);
  f.emit(n,'TOUCH_START',d.points[1].x,d.points[1].y);draw(d.points[1],d.points[2]);draw(d.points[2],d.points[3]);f.tick(.41);assert.equal(f.result.completions,1);assert.equal(f.result.mistakes,0);
 });
 test('realview fails on missingframes and reuses controls on reset without residual listeners',()=>{
  const f=build('FaultSpotStageController','fault-spot');const old=f.controller.hotspotNodes[0];f.controller.configure(f.definition,f.callbacks);assert.equal(f.controller.hotspotNodes[0],old);assert.equal(old.listenerCount(),4);
  f.view.frames.pop();assert.throws(()=>f.controller.configure(f.definition,f.callbacks),/Missing|paired/);assert.equal(old.listenerCount(),0);
 });
 test('unscrew uses signed travel, reverse tightens, seam crossing and CANCEL preserve earned degrees',()=>{
  const f=build('RotaryControlStageController','rotary-control','unscrew'),d=f.definition,n=f.controller.controlNodes[0],c=d.screws[0].position;
  const turn=(a,b,end='TOUCH_END')=>{let p=polar(c,d.radius,a);f.emit(n,'TOUCH_START',p.x,p.y);for(let i=1;i<=16;i++){p=polar(c,d.radius,a+(b-a)*i/16);f.emit(n,'TOUCH_MOVE',p.x,p.y);}f.emit(n,end,p.x,p.y);};
  turn(170,210);assert.ok(Math.abs(f.controller.screwDegrees[0]-40)<1e-6);turn(210,180);assert.ok(Math.abs(f.controller.screwDegrees[0]-10)<1e-6);
  turn(0,120,'TOUCH_CANCEL');assert.ok(Math.abs(f.controller.screwDegrees[0]-130)<1e-6);assert.equal(f.controller.progress.completed,0);assert.equal(f.result.mistakes,0);
  f.controller.resetStage();assert.deepEqual(f.controller.screwDegrees,[0,0]);assert.equal(f.result.completions,0);
 });
 test('two screws must independently reach270 degrees and lock; duplicateEND and later turns cannot complete twice',()=>{
  const f=build('RotaryControlStageController','rotary-control','unscrew'),d=f.definition;
  for(let j=0;j<2;j++){
   const c=d.screws[j].position,n=f.controller.controlNodes[j];let p=polar(c,d.radius,0);f.emit(n,'TOUCH_START',p.x,p.y);
   for(let i=1;i<=32;i++){p=polar(c,d.radius,280*i/32);f.emit(n,'TOUCH_MOVE',p.x,p.y);}f.emit(n,'TOUCH_END',p.x,p.y);f.emit(n,'TOUCH_END',p.x,p.y);
   assert.equal(f.controller.progress.completed,j+1);assert.equal(f.result.completions,0);
  }f.tick(.41);f.tick(3);assert.equal(f.result.completions,1);assert.deepEqual(f.controller.screwDegrees,[270,270]);assert.equal(f.result.mistakes,0);
 });
 test('press and cover feedback animate decorative children without moving any input geometry, and reset cancels old animation',()=>{
  const f=build('SequenceTestStageController','sequence-test'),n=f.controller.choiceNodes[0],p={...n.position};f.tap(n);f.view.update(.15);
  assert.equal(n.position.x,p.x);assert.equal(n.position.y,p.y);assert.ok(n.getChildByName('Caption').position.y<0);
  f.controller.configure(f.definition,f.callbacks);f.view.update(1);assert.equal(n.getChildByName('Caption').position.y,0);assert.equal(f.controller.progress.completed,0);
 });
 return groups+require('./day5b-motion.cjs').runMotionTests(runtime)+require('./day5b-lifecycle.cjs').runLifecycleTests(runtime)+require('./day5b-gauge.cjs').runGaugeTests(runtime);
};
