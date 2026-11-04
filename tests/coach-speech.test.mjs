import test from 'node:test';
import assert from 'node:assert/strict';
import { CoachSpeech } from '../js/coach-speech.js';
function fixture(){
 const spoken=[],timers=new Map();let before=0,after=0,canceled=0,id=0;
 class Utterance{constructor(text){this.text=text;}}
 const synthesis={speak:u=>spoken.push(u),cancel:()=>canceled++,getVoices:()=>[{lang:'en-US'},{lang:'de-DE',localService:true}]};
 const speech=new CoachSpeech({synthesis,Utterance,onBefore:()=>before++,onAfter:()=>after++,setTimer:fn=>{timers.set(++id,fn);return id;},clearTimer:i=>timers.delete(i)});
 return {speech,spoken,timers,synthesis,get before(){return before;},get after(){return after;},get canceled(){return canceled;}};
}
test('Kein automatisches Vorlesen; deutsche Stimme unterbricht Erkennung bis zum Ende',()=>{
 const f=fixture();assert.equal(f.spoken.length,0);f.speech.say('Kapitän, Status.');assert.equal(f.before,1);assert.equal(f.after,0);assert.equal(f.spoken[0].lang,'de-DE');assert.equal(f.spoken[0].voice.localService,true);assert.equal(f.speech.state.status,'speaking');f.spoken[0].onend();assert.equal(f.after,1);assert.equal(f.timers.size,0);
});
test('Neue Antwort ersetzt alte ohne zwischenzeitliche Mikrofonfreigabe; alte Events bleiben wirkungslos',()=>{
 const f=fixture();f.speech.say('alt');f.speech.say('neu');assert.equal(f.after,0);f.spoken[0].onend();assert.equal(f.after,0);assert.equal(f.speech.state.status,'speaking');f.spoken[1].onend();assert.equal(f.after,1);
});
test('Stop und Sprachdienstfehler räumen Timer auf und geben die Erkennung genau einmal frei',()=>{
 const f=fixture();f.speech.say('eins');f.speech.stop();assert.equal(f.after,1);assert.equal(f.timers.size,0);f.spoken[0].onend();assert.equal(f.after,1);f.speech.say('zwei');f.spoken[1].onerror({error:'not-allowed'});assert.equal(f.after,2);assert.equal(f.speech.state.status,'error');assert.match(f.speech.state.message,/not-allowed/);
});
test('Hängender Sprachdienst wird abgebrochen; fehlende Browserstimme bleibt sichtbar',()=>{
 const f=fixture();f.speech.say('eins');[...f.timers.values()][0]();assert.equal(f.after,1);assert.equal(f.canceled,1);assert.equal(f.speech.state.status,'error');
 const unsupported=new CoachSpeech({});unsupported.say('Text');assert.match(unsupported.state.message,/nicht unterstützt/);
});
