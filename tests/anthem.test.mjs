import test from 'node:test';
import assert from 'node:assert/strict';
import { AnthemPlayer } from '../js/anthem.js';
import { matchMusicCommand } from '../js/voice.js';
function setup(fetchAudio=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)})) {
 const sources=[],gains=[];let fetches=0;
 const context={state:'running',resume:async()=>{},decodeAudioData:async()=>({decoded:true}),destination:{},createGain(){const gain={gain:{value:0},connect(){},disconnect(){}};gains.push(gain);return gain;},createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;this.onended?.();}};sources.push(source);return source;}};
 const player=new AnthemPlayer({getContext:()=>context,fetchAudio:async(...args)=>{fetches++;return fetchAudio(...args);}});
 return {player,context,sources,gains,get fetches(){return fetches;}};
}
test('Musikwörter erkennen ganze Äußerungen einschließlich deutscher Schreibweise',()=>{
 for(const phrase of ['Israel','NETANYAHU!','Netanjahu'])assert.equal(matchMusicCommand(phrase),'anthem-play');
 for(const phrase of ['Musik stopp','Musik stop','Hymne stoppen'])assert.equal(matchMusicCommand(phrase),'anthem-stop');
 for(const phrase of ['israelisch','ich sage Israel','nicht Netanyahu','plus eins'])assert.equal(matchMusicCommand(phrase),null);
});
test('Keine Wiedergabe beim Erstellen oder Freischalten; Start lädt Aufnahme ohne Credentials',async()=>{
 let options;const f=setup(async(url,opts)=>{options=opts;return{ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};});
 await f.player.unlock();assert.equal(f.fetches,0);assert.equal(f.sources.length,0);
 await f.player.play();assert.equal(f.player.state.status,'playing');assert.equal(f.sources[0].started,true);assert.equal(f.gains[0].gain.value,.35);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
});
test('Wiederholte Wörter überlagern oder starten die Hymne nicht neu; Ende erlaubt Wiederholung ohne neuen Download',async()=>{
 const f=setup();await f.player.play();await f.player.play();assert.equal(f.sources.length,1);
 f.sources[0].onended();assert.equal(f.player.state.status,'off');await f.player.play();assert.equal(f.sources.length,2);assert.equal(f.fetches,1);
});
test('Stop beendet Wiedergabe und verhindert nachträgliches Starten während Download',async()=>{
 const f=setup();await f.player.play();f.player.stop();assert.equal(f.sources[0].stopped,true);assert.equal(f.player.state.status,'off');
 let finish;const slow=setup(()=>new Promise(resolve=>{finish=resolve;}));const pending=slow.player.play();await Promise.resolve();slow.player.stop();finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});await pending;assert.equal(slow.sources.length,0);assert.equal(slow.player.state.status,'off');
});
test('Lautstärke gilt sofort, Grenzen bleiben zwischen stumm und 100 Prozent',async()=>{
 const f=setup();f.player.setVolume(0);await f.player.play();assert.equal(f.gains[0].gain.value,0);f.player.setVolume(.8);assert.equal(f.gains[0].gain.value,.8);f.player.setVolume(2);assert.equal(f.player.volume,1);f.player.setVolume(-2);assert.equal(f.player.volume,0);
});
test('Download-, Decode- und Audiosperren werden sichtbar, spätere Versuche bleiben möglich',async()=>{
 const f=setup(async()=>({ok:false}));await f.player.play();assert.equal(f.player.state.status,'error');assert.match(f.player.state.message,/nicht erreichbar/);
 f.context.state='suspended';await f.player.play();assert.match(f.player.state.message,/Audio gesperrt/);assert.equal(f.sources.length,0);
 const broken=setup();broken.context.decodeAudioData=async()=>{throw Error('Format');};await broken.player.play();assert.match(broken.player.state.message,/Format/);
});
