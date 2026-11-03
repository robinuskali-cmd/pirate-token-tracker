import test from 'node:test';
import assert from 'node:assert/strict';
import { battlepassProgress, REWARDS, MAX_LEVEL, unlockedReward, equippedReward, equipReward, titleStorageKey } from '../js/battlepass.js';
const player = (extra, initial = 500) => ({ initial_chests: initial, total: initial + extra });
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value) }; };

test('Beide Startbestände geben keine XP; nur zusätzlich gespeicherte Truhen zählen', () => {
  for (const initial of [500,1100]) { const p=battlepassProgress(player(0,initial));assert.equal(p.xp,0);assert.equal(p.level,0);assert.equal(p.remaining,1000); }
  assert.equal(battlepassProgress(player(214)).xp,2140);
});
test('Stufengrenzen, nächster Titel und Fortschritt sind konsistent', () => {
  assert.equal(battlepassProgress(player(99)).level,0);
  const p=battlepassProgress(player(100));assert.equal(p.level,1);assert.equal(p.inLevel,0);assert.equal(p.next.level,2);
  assert.equal(battlepassProgress(player(150)).percent,50);
  assert.equal(REWARDS.length,20);assert.equal(new Set(REWARDS.map(r=>r.title)).size,20);
});
test('Pass endet bei Stufe 20; weitere Truhen behalten ihre XP', () => {
  for (const count of [2000,9999]) { const p=battlepassProgress(player(count));assert.equal(p.level,MAX_LEVEL);assert.equal(p.remaining,0);assert.equal(p.percent,100);assert.equal(p.next,null);assert.equal(p.xp,count*10); }
});
test('Undo und Korrekturen nehmen XP zurück, ohne negative XP zu erzeugen', () => {
  assert.equal(unlockedReward(player(100),1).title,'Deckmatrose');
  assert.equal(unlockedReward(player(99),1),null);
  assert.equal(battlepassProgress(player(-1)).xp,0);
  for (const invalid of [undefined,{}, {total:NaN,initial_chests:500}]) assert.equal(battlepassProgress(invalid).xp,0);
});
test('Nur freigeschaltete Titel lassen sich speichern; manipulierte Werte werden verworfen', () => {
  const memory=storage(),key=titleStorageKey('live','max');
  assert.equal(equipReward(memory,key,player(100),1).level,1);
  assert.equal(equippedReward(memory,key,player(100)).level,1);
  assert.throws(()=>equipReward(memory,key,player(100),2),/nicht freigeschaltet/);
  assert.equal(equippedReward(memory,key,player(100)).level,1);
  assert.equal(equippedReward(memory,key,player(99)).level,0);
  for (const value of ['oops','-1','1.5','99']) {memory.setItem(key,value);assert.equal(equippedReward(memory,key,player(2000)).level,0);}
  assert.equal(equipReward(memory,key,player(100),0).level,0);
});
test('Titel sind nach Spieler und Betriebsmodus getrennt; Speicherfehler bleiben sichtbar', () => {
  assert.notEqual(titleStorageKey('live','max'),titleStorageKey('demo','max'));
  assert.notEqual(titleStorageKey('live','max'),titleStorageKey('live','szymon'));
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  assert.equal(equippedReward(blocked,'key',player(100)).level,0);
  assert.throws(()=>equipReward(blocked,'key',player(100),1),/nicht gespeichert/);
});
