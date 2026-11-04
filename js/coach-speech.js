export class CoachSpeech {
  constructor({synthesis,Utterance,onBefore=()=>{},onAfter=()=>{},onChange=()=>{},setTimer=(...args)=>globalThis.setTimeout(...args),clearTimer=(...args)=>globalThis.clearTimeout(...args)}) {
    Object.assign(this,{synthesis,Utterance,onBefore,onAfter,onChange,setTimer,clearTimer});
    this.state={status:'idle',message:'Klicke „Jarvis sprechen lassen“, um seine Stimme zu testen.'};this.generation=0;this.timer=null;this.held=false;this.utterance=null;this.primer=null;
  }
  get supported(){return Boolean(this.synthesis&&this.Utterance);}
  set(status,message){this.state={status,message};this.onChange();}
  unlock() {
    if(!this.supported)return;
    // Called synchronously from a user's click, before any permission/lock await.
    // A silent primer enables speech on browsers requiring that first gesture.
    try {
      this.synthesis.resume?.();
      const primer=new this.Utterance('Jarvis');this.primer=primer;
      primer.lang='de-DE';primer.volume=0;
      const clear=()=>{if(this.primer===primer)this.primer=null;};
      primer.onend=clear;primer.onerror=clear;this.synthesis.speak(primer);
    } catch {this.primer=null;}
  }
  finish(generation,status='idle',message='Jarvis ist fertig.') {
    if(generation!==this.generation)return;
    if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
    this.utterance=null;
    if(this.held){this.held=false;this.onAfter();}
    this.set(status,message);
  }
  say(text) {
    this.stop(false);
    if(!this.supported){if(this.held){this.held=false;this.onAfter();}this.set('error','Vorlesen wird hier nicht unterstützt. Die Antwort steht im Chat.');return;}
    const generation=++this.generation;
    try {
      this.held=true;this.onBefore();
      const utterance=new this.Utterance(String(text).slice(0,1000));this.utterance=utterance;
      utterance.lang='de-DE';utterance.rate=1.03;utterance.pitch=.85;utterance.volume=1;
      const voices=this.synthesis.getVoices?.()||[];
      utterance.voice=voices.find(v=>v.lang.startsWith('de')&&v.localService)||voices.find(v=>v.lang.startsWith('de'))||null;
      utterance.onstart=()=>{if(generation===this.generation)this.set('speaking','Jarvis spricht. Die Erkennung hört nach seiner Antwort wieder zu.');};
      utterance.onend=()=>this.finish(generation);
      utterance.onerror=event=>this.finish(generation,'error',`Vorlesen unterbrochen (${event.error||'Sprachdienst'}). Die Antwort steht im Chat.`);
      this.set('starting','Stimme wird gestartet … Falls nichts zu hören ist: Tab-Ton, Ausgabegerät und Lautstärke prüfen.');
      this.timer=this.setTimer(()=>{if(generation!==this.generation)return;this.synthesis.cancel();this.finish(generation,'error','Vorlesen beendet: Sprachdienst hat nicht rechtzeitig geantwortet.');},30000);
      this.synthesis.resume?.();this.synthesis.speak(utterance);
    } catch(error){this.finish(generation,'error',`Vorlesen nicht möglich: ${error.message}`);}
  }
  stop(resume=true) {
    ++this.generation;
    if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
    if(['starting','speaking'].includes(this.state.status)||this.primer)try{this.synthesis?.cancel();}catch{}
    this.utterance=null;this.primer=null;
    if(resume&&this.held){this.held=false;this.onAfter();}
    if(resume&&this.state.status!=='idle')this.set('idle','Jarvis ist still.');
  }
}
