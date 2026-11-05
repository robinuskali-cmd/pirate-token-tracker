import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { CoachSpeech } from '../js/coach-speech.js';
import { VOICE_TEMPLATES, recordingTexts, speechPlan, numberAudio } from '../js/voice-plan.js';
import { VOICE_CUES } from '../js/voice-recordings.js';
import { COACH_VOICES, COACH_VOICE_STORAGE_KEY, readCoachVoice, writeCoachVoice } from '../js/coach-voices.js';
function fixture(options={}){
 const sources=[],gains=[],calls={before:0,after:0,fetch:0,decode:0,resume:0};
 const context={state:'running',currentTime:10,destination:{},resume:async()=>{calls.resume++;},decodeAudioData:async data=>{calls.decode++;return {duration:data.byteLength/10};},createGain(){const gain={gain:{value:0},connect(){},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;},createBufferSource(){const source={connect(){},disconnect(){this.disconnected=true;},start(at){this.at=at;},stop(){this.stopped=true;this.onended?.();}};sources.push(source);return source;}};
 const speech=new CoachSpeech({getContext:()=>context,cues:{a:{offset:0,length:4},b:{offset:4,length:4}},plan:()=>['a','b'],fetchAudio:async()=>{calls.fetch++;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};},onBefore:()=>calls.before++,onAfter:()=>calls.after++,...options});
 return{speech,context,sources,gains,calls};
}
test('Keine automatische Wiedergabe; Audio wird im Klick freigegeben und als echte Buffer abgespielt',async()=>{
 const f=fixture();assert.equal(f.calls.fetch,0);f.speech.unlock();assert.equal(f.calls.resume,1);await f.speech.say('Test');assert.equal(f.speech.state.status,'speaking');assert.equal(f.calls.before,1);assert.equal(f.calls.after,0);assert.equal(f.sources.length,2);assert.ok(f.sources[1].at>f.sources[0].at);assert.equal(f.gains[0].gain.value,1);f.sources[1].onended();assert.equal(f.calls.after,1);assert.equal(f.speech.state.status,'idle');
});
test('Stop beendet alle Teilaufnahmen und verhindert späte Ereignisse oder einen Start nach ausstehendem Laden',async()=>{
 const f=fixture();await f.speech.say('Test');f.speech.stop();assert.ok(f.sources.every(s=>s.stopped));assert.equal(f.calls.after,1);f.sources.at(-1).onended();assert.equal(f.calls.after,1);
 let loaded;const slow=fixture({fetchAudio:()=>new Promise(resolve=>{loaded=resolve;})});const pending=slow.speech.say('Test');await Promise.resolve();slow.speech.stop();loaded({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await pending;assert.equal(slow.sources.length,0);assert.equal(slow.calls.after,1);
});
test('Neue Antwort ersetzt alte ohne zwischenzeitliche Freigabe; Audio- und Clipcache vermeiden wiederholte Downloads',async()=>{
 const f=fixture();await f.speech.say('eins');await f.speech.say('zwei');assert.equal(f.calls.fetch,1);assert.equal(f.calls.decode,2);assert.equal(f.calls.after,0);f.sources[1].onended();assert.equal(f.calls.after,0);f.sources.at(-1).onended();assert.equal(f.calls.after,1);
});
test('Netzwerk-, Decoder- und Audiosperren bleiben sichtbar und geben die Erkennung frei',async()=>{
 const bad=fixture({fetchAudio:async()=>({ok:false})});await bad.speech.say('x');assert.match(bad.speech.state.message,/geladen/);assert.equal(bad.calls.after,1);
 const blocked=fixture();blocked.context.state='suspended';await blocked.speech.say('x');assert.match(blocked.speech.state.message,/Audio blockiert/);assert.equal(blocked.sources.length,0);
 const decoder=fixture();decoder.context.decodeAudioData=async()=>{throw Error('Formatfehler');};await decoder.speech.say('x');assert.match(decoder.speech.state.message,/Formatfehler/);assert.equal(decoder.calls.after,1);
});
test('Jede Spruchvorlage einschließlich sanfter Antworten und dynamischer Statuszahlen hat Aufnahmen',()=>{
 for(const template of VOICE_TEMPLATES){for(const next of ['Noch 46 zusätzliche Truhen bis „Nebelkapitän“.','Der Battlepass ist komplett. Piratenlegende bestätigt.']){
 const text=template.replace(/\{(name|total|today|level|next)\}/g,(_,key)=>({name:'Szymon',total:'1.554',today:'-17',level:'10',next}[key]));const plan=speechPlan(text);assert.ok(plan.length);assert.ok(plan.every(key=>VOICE_CUES[key]),text);}}
 for(const key of recordingTexts())assert.ok(VOICE_CUES[key],key);
});
test('Zahlen funktionieren an Hunderter-, Tausender- und Millionengrenzen, ohne riesige Zahlen-Dateien',()=>{
 assert.deepEqual(numberAudio(0),['0']);assert.deepEqual(numberAudio(1554),['1000','500','54']);assert.deepEqual(numberAudio(-17),['minus','17']);assert.deepEqual(numberAudio(1000001),['eine Million','1']);assert.deepEqual(numberAudio(2000),['2','tausend']);assert.throws(()=>numberAudio(1.5));assert.throws(()=>speechPlan('beliebige externe Nachricht'));
});
test('Sprachpaket enthält lückenlos vollständige MP3-Abschnitte und einen separaten MP3-Tontest',()=>{
 const pack=readFileSync(new URL('../assets/jarvis-voice.bin',import.meta.url));let offset=0;
 for(const cue of Object.values(VOICE_CUES).sort((a,b)=>a.offset-b.offset)){assert.equal(cue.offset,offset);assert.ok(cue.length>100);assert.ok(cue.duration>0);assert.equal(pack.subarray(cue.offset,cue.offset+3).toString(),'ID3');offset+=cue.length;}
 assert.equal(offset,pack.length);const demo=readFileSync(new URL('../assets/jarvis-test.mp3',import.meta.url));assert.equal(demo.subarray(0,3).toString(),'ID3');
});
test('Jede auswählbare Stimme deckt alle Texte ab und hat ein vollständiges eigenes MP3-Paket',()=>{
 for(const voice of COACH_VOICES){
  const pack=readFileSync(new URL(voice.url,import.meta.url));let offset=0;
  for(const text of recordingTexts())assert.ok(voice.cues[text],`${voice.id}: ${text}`);
  for(const cue of Object.values(voice.cues).sort((a,b)=>a.offset-b.offset)){assert.equal(cue.offset,offset);assert.ok(cue.duration>0);assert.equal(pack.subarray(offset,offset+3).toString(),'ID3');offset+=cue.length;}
  assert.equal(pack.length,offset);
 }
});
test('Stimmenwechsel beendet alte Ausgabe und hält geladene Pakete und Decoder-Caches getrennt',async()=>{
 const fetchAudio=async url=>{const bytes=readFileSync(new URL(url));return{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
 const f=fixture({cues:VOICE_CUES,plan:()=>['0'],fetchAudio});await f.speech.say('0');const first=f.sources[0].buffer;
 f.speech.setVoice('florian');assert.ok(f.sources[0].stopped);assert.equal(f.calls.after,1);await f.speech.say('0');assert.notEqual(f.sources.at(-1).buffer,first);
 f.speech.setVoice('leni');await f.speech.say('0');assert.equal(f.sources.at(-1).buffer,first);assert.equal(f.calls.decode,2);f.speech.stop();
});
test('Spätes Laden der vorigen Stimme kann die neue Stimme weder überschreiben noch abspielen',async()=>{
 let release;const f=fixture({cues:VOICE_CUES,plan:()=>['0'],fetchAudio:url=>new Promise(resolve=>{release=()=>{const bytes=readFileSync(new URL(url));resolve({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});};})});
 const pending=f.speech.say('0');await Promise.resolve();f.speech.setVoice('florian');release();await pending;
 assert.equal(f.sources.length,0);assert.equal(f.speech.voice.id,'florian');assert.equal(f.speech.recordings.pack,null);assert.equal(f.calls.after,1);
});
test('Stimmenwahl übersteht Neuladen; unbekannte oder unlesbare Werte fallen auf Leni zurück',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(readCoachVoice(storage),'leni');writeCoachVoice(storage,'florian');assert.equal(readCoachVoice(storage),'florian');
 values.set(COACH_VOICE_STORAGE_KEY,'falsch');assert.equal(readCoachVoice(storage),'leni');assert.throws(()=>writeCoachVoice(storage,'falsch'));
 assert.equal(readCoachVoice({getItem(){throw Error('blockiert');}}),'leni');
});
