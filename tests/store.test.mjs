import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDemo, applyDemo } from '../js/core.js';
import { config } from '../js/config.js';
const locks=new Map();
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),clear:()=>map.clear()};};
globalThis.window=new EventTarget();globalThis.document=new EventTarget();
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,locks:{async request(name,fn){const previous=locks.get(name)||Promise.resolve();let release;const next=new Promise(r=>release=r);locks.set(name,next);await previous;try{return await fn();}finally{release();}}}}});
const {TrackerStore}=await import('../js/store.js');
const settle=async(...stores)=>{for(let i=0;i<1000&&stores.some(s=>s.flushing);i++)await new Promise(r=>setTimeout(r,1));assert.ok(stores.every(s=>!s.flushing));};
function createStore(server){const s=new TrackerStore();s.demo=false;s.user={id:'max-user'};s.actor='max';s.state=structuredClone(server.state);s.client={rpc:async(name,args)=>{
  if(name==='tracker_snapshot')return {data:structuredClone(server.state),error:null};
  if(server.rejectNetwork){server.rejectNetwork=false;throw new Error('network failure');}
  try{server.state=applyDemo(server.state,{id:args.p_request_id,action:args.p_action,payload:args.p_payload},'max');}catch(e){return {error:{code:'P0001',message:e.message}};}
  if(server.loseResponse){server.loseResponse=false;throw new Error('response lost after COMMIT');}
  return {data:{ok:true},error:null};
}};return s;}
const server=()=>{const state=freshDemo();state.players[0].auth_id='max-user';state.players[1].auth_id='szymon-user';return {state};};
const increment={player_id:'max',delta:1,round_id:null,expected_revision:0};
test('Dauerhafte Warteschlange, Netzwerkfehler und mehrere Tabs',async t=>{
  config.supabaseUrl='https://test.supabase.co';
  await t.test('Offline-Klick bleibt nach Objekt-Neustart erhalten und wird später einmal übertragen',async()=>{
    localStorage.clear();navigator.onLine=false;const backend=server(),a=createStore(backend);await a.mutate('increment',increment);assert.equal(a.queue.length,1);
    const b=createStore(backend);b.queue=b.readQueue();assert.equal(b.queue.length,1);navigator.onLine=true;await b.flush();assert.equal(backend.state.players[0].total,501);assert.equal(b.readQueue().length,0);
  });
  await t.test('Server hat gespeichert, Antwort geht verloren: Retry mit gleicher ID zählt nicht doppelt',async()=>{
    localStorage.clear();const backend=server();backend.loseResponse=true;const a=createStore(backend);await a.mutate('increment',increment);await settle(a);assert.equal(a.readQueue().length,1);assert.equal(backend.state.players[0].total,501);
    await a.flush();assert.equal(a.readQueue().length,0);assert.equal(backend.state.players[0].total,501);
  });
  await t.test('Fehler vor Serverempfang: Anfrage bleibt gespeichert',async()=>{
    localStorage.clear();const backend=server();backend.rejectNetwork=true;const a=createStore(backend);await a.mutate('increment',increment);await settle(a);assert.equal(backend.state.players[0].total,500);assert.equal(a.readQueue().length,1);await a.flush();assert.equal(backend.state.players[0].total,501);
  });
  await t.test('Zwei lokale Tabs verlieren bei 60 gleichzeitigen Enqueues keine Kennung',async()=>{
    localStorage.clear();navigator.onLine=false;const backend=server(),a=createStore(backend),b=createStore(backend);
    await Promise.all(Array.from({length:60},(_,i)=>(i%2?a:b).mutate('increment',increment)));assert.equal(a.readQueue().length,60);
    navigator.onLine=true;await Promise.all([a.flush(),b.flush()]);assert.equal(a.readQueue().length,0);assert.equal(backend.state.players[0].total,560);
  });
  await t.test('Abgelehnte Anfrage bleibt sichtbar und blockiert Nachfolger, bis sie geprüft wurde',async()=>{
    localStorage.clear();navigator.onLine=false;const backend=server(),a=createStore(backend);await a.mutate('increment',{...increment,delta:2});await a.mutate('increment',increment);navigator.onLine=true;await a.flush();assert.equal(a.queue.length,2);assert.equal(a.queue[0].blocked,true);assert.equal(backend.state.players[0].total,500);
    await a.discard(a.queue[0].id);await settle(a);assert.equal(backend.state.players[0].total,501);assert.equal(a.readQueue().length,0);
  });
  await t.test('Unklare Netzwerkübertragung lässt sich nicht versehentlich verwerfen',async()=>{
    localStorage.clear();navigator.onLine=false;const backend=server(),a=createStore(backend);await a.mutate('increment',increment);await assert.rejects(()=>a.discard(a.queue[0].id),/Nur sicher abgelehnte/);assert.equal(a.readQueue().length,1);navigator.onLine=true;await a.flush();
  });
  await t.test('Voller Browserspeicher quittiert keinen Klick als gespeichert',async()=>{
    localStorage.clear();navigator.onLine=false;const backend=server(),a=createStore(backend);const original=localStorage.setItem;localStorage.setItem=()=>{throw new Error('QuotaExceededError');};await assert.rejects(()=>a.mutate('increment',increment),/QuotaExceeded/);localStorage.setItem=original;assert.equal(a.readQueue().length,0);navigator.onLine=true;
  });
});
