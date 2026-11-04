export class CoachSpeech {
  constructor({synthesis,Utterance,onBefore=()=>{},onAfter=()=>{},onChange=()=>{},setTimer=(...args)=>globalThis.setTimeout(...args),clearTimer=(...args)=>globalThis.clearTimeout(...args)}) {
    Object.assign(this,{synthesis,Utterance,onBefore,onAfter,onChange,setTimer,clearTimer});
    this.state={status:'idle',message:'Jarvis spricht nur nach einem Befehl.'};this.generation=0;this.timer=null;this.held=false;
  }
  get supported(){return Boolean(this.synthesis&&this.Utterance);}
  set(status,message){this.state={status,message};this.onChange();}
  finish(generation,status='idle',message='Jarvis ist fertig.') {
    if(generation!==this.generation)return;
    if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
    if(this.held){this.held=false;this.onAfter();}
    this.set(status,message);
  }
  say(text) {
    this.stop(false);
    if(!this.supported){if(this.held){this.held=false;this.onAfter();}this.set('error','Vorlesen wird hier nicht unterstützt. Die Antwort steht im Chat.');return;}
    const generation=++this.generation;
    try {
      this.held=true;this.onBefore();
      const utterance=new this.Utterance(String(text).slice(0,1000));
      utterance.lang='de-DE';utterance.rate=1.03;utterance.pitch=.85;utterance.volume=.7;
      const voices=this.synthesis.getVoices?.()||[];
      utterance.voice=voices.find(v=>v.lang.startsWith('de')&&v.localService)||voices.find(v=>v.lang.startsWith('de'))||null;
      utterance.onend=()=>this.finish(generation);
      utterance.onerror=event=>this.finish(generation,'error',`Vorlesen unterbrochen (${event.error||'Sprachdienst'}). Die Antwort steht im Chat.`);
      this.set('speaking','Jarvis spricht. Die Erkennung ist solange stumm und hört danach wieder zu.');
      this.timer=this.setTimer(()=>{if(generation!==this.generation)return;this.synthesis.cancel();this.finish(generation,'error','Vorlesen beendet: Sprachdienst hat nicht rechtzeitig geantwortet.');},30000);
      this.synthesis.speak(utterance);
    } catch(error){this.finish(generation,'error',`Vorlesen nicht möglich: ${error.message}`);}
  }
  stop(resume=true) {
    ++this.generation;
    if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
    if(this.state.status==='speaking')try{this.synthesis?.cancel();}catch{}
    if(resume&&this.held){this.held=false;this.onAfter();}
    if(resume&&this.state.status!=='idle')this.set('idle','Jarvis ist still.');
  }
}
