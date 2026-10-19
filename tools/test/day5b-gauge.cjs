'use strict';
const assert=require('node:assert/strict');
const {fixture}=require('./day5b-fixture.cjs');
exports.runGaugeTests=function(runtime) {
 const {GaugeTuneStageController,fanReading,stereoReading,broadcastReading}=runtime.load('stages/GaugeTuneStageController.ts');
 const stages=runtime.load('data/Day5BOrderCatalog.ts').DAY5B_ORDERS.flatMap(o=>o.stages);
 let count=0;const test=(n,f)=>{f();count++;console.log('PASS Day5B gauge: '+n);};
 const make=mode=>{const f=fixture(runtime,GaugeTuneStageController);f.d=stages.find(s=>s.kind==='gauge-tune'&&s.mode===mode);assert.ok(f.d);f.controller.configure(f.d,f.callbacks);f.controller.setInputEnabled(true);return f;};
 const set=(f,i,value,end='TOUCH_END',id=i+1)=>{const n=f.controller.sliderNodes[i],p=n.position,x=-260+value*5.2;f.emit(n,'TOUCH_START',-260+f.controller.controlValues[i]*5.2,p.y,id);f.emit(n,'TOUCH_MOVE',x,p.y,id);f.emit(n,end,x,p.y,id);};
 test('pure readings match exact formulas, valid solutions and unsafe silent stereo',()=>{
  assert.deepEqual(fanReading(65,70),{first:49,second:42,safe:true});assert.equal(fanReading(90,20).safe,false);
  assert.equal(stereoReading(60,58).safe,true);assert.equal(stereoReading(0,0).safe,false);assert.equal(stereoReading(85,20).safe,false);
  assert.equal(broadcastReading(75,65).safe,true);assert.equal(broadcastReading(20,25).safe,false);
  for(const [a,b,expected] of [[65,50,true],[85,75,true],[64.99,60,false],[75,75.01,false]])assert.equal(broadcastReading(a,b).safe,expected);
 });
 for(const mode of ['fan','stereo','broadcast'].filter(mode=>stages.some(s=>s.mode===mode)))test(mode+' requires real release and uninterrupted 0.7 seconds; no mistakes for adjustments',()=>{
  const f=make(mode),v=mode==='fan'?[65,70]:mode==='stereo'?[60,58]:[75,65];set(f,0,v[0]);set(f,1,v[1]);assert.equal(f.controller.reading.safe,true);
  assert.equal(f.controller.progress.total,2);f.tick(.699);assert.equal(f.controller.progress.completed,2);assert.equal(f.result.completions,0);f.tick(.002);assert.equal(f.controller.progress.completed,2);assert.equal(f.result.completions,0);
  f.tick(.401);f.tick(5);assert.equal(f.result.completions,1);assert.equal(f.result.mistakes,0);
 });
 test('independent pointer ownership and held slider cannot complete even while values are green',()=>{
  const f=make('fan'),[a,b]=f.controller.sliderNodes;f.emit(a,'TOUCH_START',0,a.position.y,1);f.emit(a,'TOUCH_MOVE',78,a.position.y,1);
  f.emit(b,'TOUCH_START',104,b.position.y,2);f.emit(b,'TOUCH_MOVE',104,b.position.y,2);
  f.emit(a,'TOUCH_END',78,a.position.y,99);assert.equal(f.controller.controlValues[0],65);
  f.emit(b,'TOUCH_END',104,b.position.y,2);f.tick(2);assert.equal(f.result.completions,0);
  f.emit(a,'TOUCH_END',78,a.position.y,1);f.tick(.701);f.tick(.41);assert.equal(f.result.completions,1);
 });
 test('CANCEL interrupts hold, disables do not retain hold, resume and reset do not leak callbacks',()=>{
  const f=make('fan');set(f,0,65);set(f,1,70);f.tick(.5);set(f,0,65,'TOUCH_CANCEL');f.tick(5);assert.equal(f.result.completions,0);
  set(f,0,65);f.tick(.5);f.controller.setInputEnabled(false);f.controller.setInputEnabled(true);f.tick(5);assert.equal(f.result.completions,0);
  set(f,0,65);f.tick(.701);f.controller.deactivateStage();f.tick(5);assert.equal(f.result.completions,0);f.controller.resumeStage(f.callbacks);f.tick(.41);assert.equal(f.result.completions,1);
  f.controller.resetStage();assert.deepEqual(f.controller.controlValues,[90,20]);assert.equal(f.controller.stableSeconds,0);
 });
 test('sliders clamp outside excursions and survive transformed ancestors with exact fixed hit boxes',()=>{
  const f=make('fan');f.root.setPosition(70,-25);f.root.setScale(.7,1.3);set(f,0,200);set(f,1,-100);assert.deepEqual(f.controller.controlValues,[100,0]);
  const n=f.controller.sliderNodes[0],p={...n.position};f.view.press('gauge-0');f.view.update(.15);assert.equal(n.position.x,p.x);assert.equal(n.position.y,p.y);
 });
 return count;
};
