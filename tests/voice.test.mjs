import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_VOICE_COMMANDS, VOICE_STORAGE_KEY, normalizeVoicePhrase, matchVoiceCommand, defaultVoiceSettings, readVoiceSettings, writeVoiceSettings, validateVoiceSettings, createVoiceLease, VoiceController } from '../js/voice.js';
const memory = () => { const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)}; };
function fixture(extra={}) {
  const instances=[],calls=[],clock={now:1000},timers=new Map();let releases=0,nextTimer=1;
  class Recognition {
    constructor(){instances.push(this);this.results=[];}
    start(){this.started=true;this.onstart?.();}
    abort(){this.aborted=true;this.onend?.();}
    emit(text,final=true){const result=Object.assign([{transcript:text}],{isFinal:final});this.results.push(result);this.onresult({resultIndex:this.results.length-1,results:this.results});}
  }
  const controller=new VoiceController({Recognition,acquireLease:async()=>()=>{releases++;},onCommand:async action=>{calls.push(action);},now:()=>clock.now,setTimer:fn=>{const id=nextTimer++;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id),...extra});
  return {controller,instances,calls,clock,timers,get releases(){return releases;},start:options=>controller.start({commands:DEFAULT_VOICE_COMMANDS,...options}),next:()=>{clock.now+=1100;},restart:()=>{const [id,fn]=[...timers][0];timers.delete(id);fn();}};
}

test('Gewünschte Befehle erkennen ausgeschriebene und numerische Zahlen',()=>{
  for(const phrase of ['plus eins','PLUS EINS!','plus 1','+1','plus ein'])assert.equal(matchVoiceCommand(phrase,DEFAULT_VOICE_COMMANDS),'add1');
  for(const phrase of ['plus fünf','plus 5','+5'])assert.equal(matchVoiceCommand(phrase,DEFAULT_VOICE_COMMANDS),'add5');
  for(const phrase of ['plus zehn','plus 10','+10'])assert.equal(matchVoiceCommand(phrase,DEFAULT_VOICE_COMMANDS),'add10');
  assert.equal(matchVoiceCommand('rückgängig',DEFAULT_VOICE_COMMANDS),'undo');assert.equal(matchVoiceCommand('pause',DEFAULT_VOICE_COMMANDS),'pause');assert.equal(matchVoiceCommand('weiter',DEFAULT_VOICE_COMMANDS),'resume');
  assert.equal(normalizeVoicePhrase(undefined),'');
});
test('Gespräche und mehrere Befehle in einer Äußerung lösen keine Teiltreffer aus',()=>{
  for(const phrase of ['ich sage jetzt plus eins','plus eins plus fünf','eins','plus elf','nicht rückgängig','Pause machen'])assert.equal(matchVoiceCommand(phrase,DEFAULT_VOICE_COMMANDS),null);
});
test('Befehlskonflikte einschließlich Zahlen-Aliassen überschreiben keine gültige Einstellung',()=>{
  const storage=memory(),before=writeVoiceSettings(storage,defaultVoiceSettings());
  assert.throws(()=>writeVoiceSettings(storage,{...before,commands:{...before.commands,undo:'+1'}}),/anderen Sprachbefehl/);
  assert.throws(()=>validateVoiceSettings({...before,commands:{...before.commands,add1:''}}),/ausfüllen/);
  assert.deepEqual(readVoiceSettings(storage),before);
});
test('Browserpräferenzen bleiben erhalten; beschädigter Speicher fällt zurück, Schreibfehler bleiben sichtbar',()=>{
  const storage=memory(),settings=defaultVoiceSettings();settings.sound=false;settings.commands.add1='eine truhe';writeVoiceSettings(storage,settings);assert.deepEqual(readVoiceSettings(storage),settings);
  storage.setItem(VOICE_STORAGE_KEY,'broken');assert.deepEqual(readVoiceSettings(storage),defaultVoiceSettings());
  assert.deepEqual(readVoiceSettings({getItem(){throw Error();}}),defaultVoiceSettings());
  assert.throws(()=>writeVoiceSettings({setItem(){throw Error();}},settings),/nicht gespeichert/);
});
test('Kein automatischer Mikrofonstart; ausdrücklicher Start setzt deutsche kontinuierliche Erkennung',async()=>{
  const f=fixture();assert.equal(f.instances.length,0);assert.equal(f.controller.active,false);
  await f.start();const r=f.instances[0];assert.equal(r.lang,'de-DE');assert.equal(r.continuous,true);assert.equal(r.interimResults,false);assert.equal(f.controller.state.testMode,true);f.controller.stop();
});
test('Testmodus erkennt alle Zählbefehle ohne Mutation',async()=>{
  const f=fixture();await f.start();for(const phrase of ['plus eins','plus fünf','plus zehn','rückgängig']){f.instances[0].emit(phrase);await f.controller.serial;assert.match(f.controller.state.message,/Test erkannt/);f.next();}
  assert.deepEqual(f.calls,[]);f.controller.stop();
});
test('Echtmodus übergibt +1, +5, +10 und Undo nacheinander an die vorhandenen Aktionen',async()=>{
  const f=fixture();await f.start({testMode:false});for(const phrase of ['plus eins','plus fünf','plus zehn','rückgängig']){f.instances[0].emit(phrase);await f.controller.serial;f.next();}
  assert.deepEqual(f.calls,['add1','add5','add10','undo']);f.controller.stop();
});
test('Zwischenergebnisse und mehrfach zugestellte finale Indizes zählen nicht doppelt',async()=>{
  const f=fixture();await f.start({testMode:false});const r=f.instances[0];r.emit('plus eins',false);await f.controller.serial;assert.equal(f.calls.length,0);
  r.results[0].isFinal=true;r.onresult({resultIndex:0,results:r.results});await f.controller.serial;f.next();r.onresult({resultIndex:0,results:r.results});await f.controller.serial;assert.deepEqual(f.calls,['add1']);f.controller.stop();
});
test('Eine Sekunde Wiederholschutz; Pause reagiert sofort und lässt Mikrofon für Weiter aktiv',async()=>{
  const f=fixture();await f.start({testMode:false});const r=f.instances[0];r.emit('plus eins');await f.controller.serial;r.emit('plus fünf');await f.controller.serial;assert.deepEqual(f.calls,['add1']);
  r.emit('pause');assert.equal(f.controller.state.paused,true);assert.equal(f.controller.active,true);f.next();r.emit('plus zehn');await f.controller.serial;assert.equal(f.calls.length,1);
  r.emit('weiter');assert.equal(f.controller.state.paused,false);r.emit('plus fünf');await f.controller.serial;assert.deepEqual(f.calls,['add1','add5']);f.controller.stop();
});
test('Stop beendet Mikrofon, löscht flüchtigen Text, gibt Sperre frei und ignoriert späte Ereignisse',async()=>{
  const f=fixture();await f.start({testMode:false});const r=f.instances[0];f.controller.stop();r.emit('plus eins');await f.controller.serial;assert.equal(r.aborted,true);assert.equal(f.releases,1);assert.equal(f.controller.state.heard,'');assert.deepEqual(f.calls,[]);assert.equal(f.timers.size,0);
});
test('Keine Aufnahme bei belegter Tab-Sperre oder fehlender Browser-Unterstützung',async()=>{
  const busy=fixture({acquireLease:async()=>null});await busy.start();assert.equal(busy.instances.length,0);assert.equal(busy.controller.state.status,'error');
  const unsupported=fixture({Recognition:undefined});await unsupported.start();assert.equal(unsupported.controller.active,false);assert.match(unsupported.controller.state.message,/keine Spracherkennung/);
});
test('Stop während einer ausstehenden Sperranfrage kann das Mikrofon später nicht öffnen',async()=>{
  let acquire;let released=0;const f=fixture({acquireLease:()=>new Promise(resolve=>{acquire=resolve;})});const pending=f.start();f.controller.stop();acquire(()=>{released++;});await pending;assert.equal(f.instances.length,0);assert.equal(released,1);
});
test('Mikrofon-/Dienstfehler stoppen ohne automatische neue Anfrage',async()=>{
  for(const error of ['not-allowed','network','audio-capture','service-not-allowed','language-not-supported','aborted']){const f=fixture();await f.start();f.instances[0].onerror({error});assert.equal(f.controller.active,false);assert.equal(f.controller.state.status,'error');assert.equal(f.timers.size,0);assert.equal(f.releases,1);}
});
test('Natürliche Unterbrechung startet neu, alte Erkennungsinstanz kann nicht mehr zählen',async()=>{
  const f=fixture();await f.start({testMode:false});const old=f.instances[0];old.onend();assert.equal(f.controller.state.status,'restarting');f.next();f.restart();assert.equal(f.instances.length,2);
  old.emit('plus eins');f.instances[1].emit('plus fünf');await f.controller.serial;assert.deepEqual(f.calls,['add5']);f.controller.stop();
});
test('Wiederholte sofortige Dienst-Abbrüche werden begrenzt; Stop verhindert ausstehenden Neustart',async()=>{
  const f=fixture();await f.start();for(let i=0;i<3;i++){f.instances.at(-1).onend();f.restart();}f.instances.at(-1).onend();assert.equal(f.controller.active,false);assert.equal(f.timers.size,0);
  const second=fixture();await second.start();second.instances[0].onend();second.controller.stop();assert.equal(second.timers.size,0);
});
test('Dialog-/Eingabesicherung blockiert Befehle; Mutationsfehler werden als nicht gezählt angezeigt',async()=>{
  let allowed=false;const f=fixture({canAct:()=>allowed,onCommand:async()=>{throw Error('Runde fehlt');}});await f.start({testMode:false});f.instances[0].emit('plus eins');await f.controller.serial;assert.equal(f.calls.length,0);allowed=true;f.next();f.instances[0].emit('plus eins');await f.controller.serial;assert.match(f.controller.state.message,/Nicht gezählt: Runde fehlt/);f.controller.stop();
});
test('Bereits erkannter Befehl überlebt natürlichen Dienst-Neustart, aber nicht manuellen Stop',async()=>{
  const f=fixture();await f.start({testMode:false});f.instances[0].emit('plus eins');f.instances[0].onend();await f.controller.serial;assert.deepEqual(f.calls,['add1']);f.controller.stop();
  const second=fixture();await second.start({testMode:false});second.instances[0].emit('plus eins');second.controller.stop();await second.controller.serial;assert.deepEqual(second.calls,[]);
});
test('Web-Lock wird bis zur ausdrücklichen Freigabe gehalten',async()=>{
  let done=false,requested;
  const acquire=createVoiceLease({request:async(name,options,callback)=>{requested={name,options};await callback({name});done=true;}});
  const release=await acquire();assert.equal(done,false);assert.equal(requested.options.ifAvailable,true);release();await new Promise(resolve=>setImmediate(resolve));assert.equal(done,true);
  await assert.rejects(createVoiceLease(undefined)(),/Sprachsperre/);
});

test('Musikbefehle laufen auch im Testmodus ohne Zählaktionen; Pause sperrt Start, aber nie Musik-Stopp',async()=>{
 const music=[];const f=fixture({onMediaCommand:action=>music.push(action)});await f.start();const r=f.instances[0];
 r.emit('Israel',false);assert.deepEqual(music,[]);r.emit('Israel');r.emit('Netanyahu');assert.deepEqual(music,['anthem-play','anthem-play']);assert.deepEqual(f.calls,[]);
 r.emit('pause');r.emit('Israel');r.emit('Musik stopp');assert.deepEqual(music,['anthem-play','anthem-play','anthem-stop']);r.emit('weiter');r.emit('Netanjahu');assert.equal(music.at(-1),'anthem-play');
 f.controller.stop();r.emit('Israel');assert.equal(music.length,4);
});
test('Feste Musikbefehle sind vor versehentlicher Belegung als Zählbefehl geschützt',()=>{
 const s=defaultVoiceSettings();for(const phrase of ['Israel','Netanyahu','Netanjahu','Musik stopp','Hymne stoppen'])assert.throws(()=>validateVoiceSettings({...s,commands:{...s.commands,add1:phrase}}),/reserviert/);
});

test('Jarvis-Befehle verändern im Test- und Echtmodus keinen Zähler; Erkennung wartet auf Sprachende',async()=>{
 for(const testMode of [true,false]){
 let f;const replies=[];f=fixture({onCoachCommand:id=>{replies.push(id);f.controller.suspendForSpeech();}});await f.start({testMode});const r=f.instances[0];r.emit('Jarvis du Bastard');assert.deepEqual(replies,['bastard']);assert.equal(f.controller.state.speaking,true);assert.equal(r.aborted,true);r.emit('plus eins');await f.controller.serial;assert.deepEqual(f.calls,[]);
 f.controller.resumeAfterSpeech();assert.equal(f.instances.length,2);f.next();f.next();f.instances[1].emit('Jarvis Status');assert.deepEqual(replies,['bastard','status']);f.controller.stop();f.controller.resumeAfterSpeech();assert.equal(f.instances.length,2);assert.equal(f.controller.active,false);
 }
});
test('Jarvis respektiert Pause, editierbare Eingaben, Zwischenergebnisse und Wiederholsperre',async()=>{
 let allowed=true;const replies=[];const f=fixture({onCoachCommand:id=>replies.push(id),canAct:()=>allowed});await f.start();const r=f.instances[0];r.emit('Jarvis danke',false);assert.equal(replies.length,0);r.emit('Jarvis danke');r.emit('Jarvis danke');assert.deepEqual(replies,['thanks']);f.next();f.next();r.emit('pause');r.emit('Jarvis danke');assert.equal(replies.length,1);r.emit('weiter');allowed=false;r.emit('Jarvis danke');assert.equal(replies.length,1);allowed=true;r.emit('Jarvis danke');assert.equal(replies.length,2);f.controller.stop();
});
test('Eigene Zählbefehle können keine Jarvis-Aliasse übernehmen',()=>{
 const s=defaultVoiceSettings();assert.throws(()=>validateVoiceSettings({...s,commands:{...s.commands,undo:'Jarvis Status'}}),/Jarvis reserviert/);
});
