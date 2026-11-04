// Recording: United States Navy Band, public domain. See assets/AUDIO-CREDITS.md.
export const ANTHEM_URL = 'https://upload.wikimedia.org/wikipedia/commons/2/26/Hatikvah_instrumental.ogg';
export class AnthemPlayer {
  constructor({ getContext, fetchAudio=(...args)=>globalThis.fetch(...args), onChange=()=>{} }) {
    Object.assign(this,{getContext,fetchAudio,onChange});
    this.state={status:'off',message:'Musik ist aus.'}; this.generation=0; this.volume=.35;
  }
  set(status,message) { this.state={status,message}; this.onChange(); }
  unlock() { const context=this.getContext(); return context.resume(); }
  async play() {
    if (['loading','playing'].includes(this.state.status)) return;
    const generation=++this.generation;
    this.set('loading','Hatikvah wird geladen …');
    try {
      const context=this.getContext(); await context.resume();
      if(context.state!=='running')throw Error('Audio gesperrt. Bitte „Hymne abspielen“ anklicken.');
      if(!this.buffer) {
        const response=await this.fetchAudio(ANTHEM_URL,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw Error('Aufnahme nicht erreichbar. Bitte später erneut versuchen.');
        this.buffer=await context.decodeAudioData(await response.arrayBuffer());
      }
      if(generation!==this.generation)return;
      const source=context.createBufferSource(), gain=context.createGain();
      source.buffer=this.buffer; gain.gain.value=this.volume;
      source.connect(gain); gain.connect(context.destination);
      this.source=source; this.gain=gain;
      source.onended=()=>{source.disconnect();gain.disconnect();if(generation===this.generation){this.source=null;this.gain=null;this.set('off','Hatikvah ist zu Ende.');}};
      source.start();this.set('playing','Hatikvah spielt. „Musik stopp“ beendet die Wiedergabe.');
    } catch(error) {
      if(generation===this.generation)this.set('error',`Musik konnte nicht starten: ${error.message}`);
    }
  }
  setVolume(value) { this.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.gain)this.gain.gain.value=this.volume; }
  stop() {
    ++this.generation;
    const source=this.source; this.source=null;this.gain=null;
    if(source){try{source.stop();}catch{}}
    if(this.state.status!=='off')this.set('off','Musik gestoppt.');
  }
}
