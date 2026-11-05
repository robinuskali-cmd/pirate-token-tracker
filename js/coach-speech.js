import { VOICE_CUES } from './voice-recordings.js?v=voices-1';
import { speechPlan } from './voice-plan.js?v=voices-1';
import { coachVoice } from './coach-voices.js?v=voices-1';
export class CoachSpeech {
  constructor({getContext,fetchAudio=(...args)=>globalThis.fetch(...args),cues=VOICE_CUES,voice='leni',plan=speechPlan,onBefore=()=>{},onAfter=()=>{},onChange=()=>{}}) {
    Object.assign(this,{getContext,fetchAudio,cues,plan,onBefore,onAfter,onChange});
    this.voice=coachVoice(voice);this.bundles=new Map();
    this.recordings={...this.voice,cues:this.voice.id==='leni'?cues:this.voice.cues,cache:new Map(),pack:null,loading:null};
    this.bundles.set(this.voice.id,this.recordings);
    this.state={status:'idle',message:`Stimme: ${this.voice.label}. Klicke „Jarvis sprechen lassen“.`};
    this.generation=0;this.held=false;this.sources=[];
  }
  setVoice(id){
    const selected=coachVoice(id);if(selected.id===this.voice.id)return;
    this.stop();this.voice=selected;
    if(!this.bundles.has(selected.id))this.bundles.set(selected.id,{...selected,cache:new Map(),pack:null,loading:null});
    this.recordings=this.bundles.get(selected.id);
    this.set('idle',`Stimme: ${selected.label}. Zum Anhören „Stimme testen“ anklicken.`);
  }
  get supported(){return typeof this.getContext==='function';}
  set(status,message){this.state={status,message};this.onChange();}
  unlock(){try{this.getContext().resume().catch(()=>{});}catch{}}
  async load(recordings){
    if(!recordings.pack){
      recordings.loading ||= this.fetchAudio(new URL(recordings.url,import.meta.url).href,{credentials:'omit',signal:AbortSignal.timeout(30000)}).then(async response=>{
        if(!response.ok)throw Error('Sprachdatei konnte nicht geladen werden.');recordings.pack=await response.arrayBuffer();
      }).finally(()=>{recordings.loading=null;});
      await recordings.loading;
    }
  }
  async clip(key,context,recordings){
    if(recordings.cache.has(key))return recordings.cache.get(key);
    const cue=recordings.cues[key];if(!cue||cue.offset<0||cue.length<=0||cue.offset+cue.length>recordings.pack.byteLength)throw Error('Sprachaufnahme fehlt oder ist unvollständig.');
    const buffer=await context.decodeAudioData(recordings.pack.slice(cue.offset,cue.offset+cue.length));
    if(recordings.cache.size>=40)recordings.cache.delete(recordings.cache.keys().next().value);
    recordings.cache.set(key,buffer);return buffer;
  }
  finish(generation,status='idle',message='Jarvis ist fertig.'){
    if(generation!==this.generation||this.finished===generation)return;
    this.finished=generation;this.sources=[];if(this.gain){this.gain.disconnect();this.gain=null;}
    if(this.held){this.held=false;this.onAfter();}this.set(status,message);
  }
  async say(text){
    this.stop(false);const generation=++this.generation,recordings=this.recordings;
    try{
      this.held=true;this.onBefore();
      const context=this.getContext(),resumed=context.resume();
      this.set('starting','Sprachaufnahme wird geladen …');await resumed;
      if(generation!==this.generation)return;
      if(context.state!=='running')throw Error('Audio blockiert. Bitte „Jarvis sprechen lassen“ anklicken.');
      const keys=this.plan(String(text));if(!keys.length)throw Error('Keine passende Sprachaufnahme.');
      await this.load(recordings);if(generation!==this.generation)return;
      const buffers=[];for(const key of keys){buffers.push(await this.clip(key,context,recordings));if(generation!==this.generation)return;}
      const gain=context.createGain();gain.gain.value=1;gain.connect(context.destination);this.gain=gain;
      let at=context.currentTime+.03;
      for(const [i,buffer]of buffers.entries()){
        const source=context.createBufferSource();source.buffer=buffer;source.connect(gain);this.sources.push(source);
        source.onended=()=>{source.disconnect();if(i===buffers.length-1)this.finish(generation);};
        source.start(at);at+=buffer.duration+.015;
      }
      this.set('speaking','Jarvis spielt eine Audioaufnahme ab. Die Erkennung hört danach wieder zu.');
    }catch(error){if(generation===this.generation){const sources=this.sources;this.sources=[];for(const source of sources){try{source.stop();}catch{}}this.finish(generation,'error',`Audiofehler: ${error.message} Nutze auch den direkten Audio-Test.`);}}
  }
  stop(resume=true){
    ++this.generation;const sources=this.sources;this.sources=[];
    for(const source of sources){try{source.stop();}catch{}source.disconnect();}
    if(this.gain){this.gain.disconnect();this.gain=null;}
    if(resume&&this.held){this.held=false;this.onAfter();}
    if(resume&&this.state.status!=='idle')this.set('idle','Jarvis ist still.');
  }
}
