import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { freshDemo, applyDemo, totalChests, roundCount, roundSeconds, dropProbability, requiredChests, integer, nextMilestone } from '../js/core.js';
const request = (action,payload,id=randomUUID())=>({id,action,payload});
test('Startwerte bleiben bei wiederholtem Laden genau 500 + 1100',()=>{
  const s=JSON.parse(JSON.stringify(freshDemo()));assert.equal(totalChests(s),1600);assert.equal(totalChests(JSON.parse(JSON.stringify(s))),1600);
});
test('100 einzelne Klicks und wiederholte Zustellung derselben Kennungen',()=>{
  let s=freshDemo();const requests=Array.from({length:100},()=>request('increment',{player_id:'max',delta:1,round_id:null}));
  for(const req of requests)s=applyDemo(s,req,'max');for(const req of requests)s=applyDemo(s,req,'max');
  assert.equal(totalChests(s),1700);assert.equal(s.changes.length,100);
  assert.throws(()=>applyDemo(s,{...requests[0],payload:{player_id:'max',delta:5,round_id:null}},'max'),/Kennung/);
});
test('Eigener Counter, sichere Werte und genau einmal rückgängig',()=>{
  let s=freshDemo();assert.throws(()=>applyDemo(s,request('increment',{player_id:'szymon',delta:1}),'max'),/eigenen/);
  for(const delta of [-1,0,2,Infinity,'',1.5])assert.throws(()=>applyDemo(s,request('increment',{player_id:'max',delta}),'max'));
  s=applyDemo(s,request('increment',{player_id:'max',delta:10}),'max');const id=s.changes[0].id;
  s=applyDemo(s,request('undo',{player_id:'max',change_id:id}),'max');assert.equal(totalChests(s),1600);
  assert.throws(()=>applyDemo(s,request('undo',{player_id:'max',change_id:id}),'max'),/bereits/);
});
test('Live 10 + endgültig 15 ergibt 15; Konflikte erhalten den neueren Stand',()=>{
  let s=freshDemo();const session=randomUUID(),round=randomUUID();
  s=applyDemo(s,request('start_session',{session_id:session}),'max');s=applyDemo(s,request('start_round',{session_id:session,round_id:round}),'max');
  s=applyDemo(s,request('increment',{player_id:'max',round_id:round,delta:10,expected_revision:0}),'max');const live=s.changes[0].id;
  const payload={player_id:'max',round_id:round,total:15,expected_chests:10,expected_revision:0};
  s=applyDemo(s,request('set_round_total',payload),'max');assert.equal(totalChests(s),1615);assert.equal(roundCount(s,round,'max').chests,15);
  assert.throws(()=>applyDemo(s,request('set_round_total',payload),'max'),/inzwischen/);
  assert.throws(()=>applyDemo(s,request('increment',{player_id:'max',round_id:round,delta:1,expected_revision:0}),'max'),/korrigiert/);
  assert.throws(()=>applyDemo(s,request('undo',{player_id:'max',change_id:live,expected_revision:1}),'max'),/Rundenbuch/);
  s=applyDemo(s,request('set_round_total',{...payload,total:3,expected_chests:15,expected_revision:1}),'max');assert.equal(totalChests(s),1603);
});
test('Gemeinsamer Rundenabschluss ist gegen gleichzeitige neue Klicks abgesichert',()=>{
  let s=freshDemo();const session=randomUUID(),round=randomUUID();s=applyDemo(s,request('start_session',{session_id:session}),'max');
  assert.throws(()=>applyDemo(s,request('start_session',{session_id:randomUUID()}),'szymon'),/bereits/);
  s=applyDemo(s,request('start_round',{session_id:session,round_id:round}),'max');
  assert.throws(()=>applyDemo(s,request('end_session',{session_id:session}),'max'),/zuerst/);
  const finish={round_id:round,expected_max:0,expected_szymon:0,revision_max:0,revision_szymon:0};
  s=applyDemo(s,request('increment',{player_id:'szymon',round_id:round,delta:5,expected_revision:0}),'szymon');
  assert.throws(()=>applyDemo(s,request('end_round',finish),'max'),/Neue Truhen/);
  s=applyDemo(s,request('end_round',{...finish,expected_szymon:5}),'max');
  assert.throws(()=>applyDemo(s,request('increment',{player_id:'szymon',round_id:round,delta:1,expected_revision:0}),'szymon'),/abgeschlossen/);
  s=applyDemo(s,request('end_session',{session_id:session}),'szymon');assert.ok(s.sessions[0].ended_at);
});
test('Nachtrag und Korrektur pro Spieler verrechnen nur die Differenz',()=>{
  let s=freshDemo();const session=randomUUID(),round=randomUUID();s=applyDemo(s,request('start_session',{session_id:session}),'max');
  s=applyDemo(s,request('manual_round',{player_id:'max',session_id:session,round_id:round,total:30,duration_seconds:600}),'max');
  s=applyDemo(s,request('set_round_total',{player_id:'szymon',round_id:round,total:20,expected_chests:0,expected_revision:0}),'szymon');
  s=applyDemo(s,request('set_round_total',{player_id:'max',round_id:round,total:25,expected_chests:30,expected_revision:0}),'max');
  assert.equal(totalChests(s),1645);assert.equal(s.daily.reduce((a,d)=>a+d.chests,0),45);
});
test('RNG ist numerisch stabil und behandelt Randfälle',()=>{
  assert.equal(dropProbability(0,1000),0);assert.equal(dropProbability(1,0),0);assert.equal(dropProbability(1,1),1);
  assert.ok(Math.abs(dropProbability(.001,1000)-.632304575229) < 1e-10);
  assert.equal(requiredChests(.001,.5),693);assert.equal(requiredChests(0,.9),Infinity);assert.equal(requiredChests(1,.1),1);
  assert.ok(dropProbability(1e-12,1000)>0);assert.equal(dropProbability(.5,2),.75);
  assert.throws(()=>dropProbability(-.1,10));assert.throws(()=>dropProbability(.1,1.5));
});
test('Ganzzahlvalidierung und steigende Meilensteine',()=>{
  for(const v of ['',null,-1,1.2,'abc',Infinity])assert.throws(()=>integer(v));
  assert.equal(nextMilestone(1600),2500);assert.equal(nextMilestone(2500),5000);assert.ok(nextMilestone(100000)>100000);
});
test('Optionale nachgetragene Dauern bestimmen Teamtempo und Spielzeit',()=>{
  const s=freshDemo(),r={id:'round',started_at:'2026-11-03T10:00:00Z',ended_at:'2026-11-03T10:00:00Z',manual:true};
  s.counts=[{round_id:'round',player_id:'max',duration_seconds:600},{round_id:'round',player_id:'szymon',duration_seconds:900}];
  assert.equal(roundSeconds(s,r),900);assert.equal(roundSeconds(s,r,'max'),600);
});
