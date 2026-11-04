import { matchJarvisCommand } from './jarvis-commands.js?v=jarvis-2';
export const VOICE_STORAGE_KEY = 'pirate-tracker:voice:v1';
export const VOICE_LOCK = 'pirate-tracker:voice-microphone:v1';
export const VOICE_ACTIONS = Object.freeze({ add1: '+1 Truhe', add5: '+5 Truhen', add10: '+10 Truhen', undo: 'Rückgängig', pause: 'Pause', resume: 'Weiter' });
export const DEFAULT_VOICE_COMMANDS = Object.freeze({ add1: 'plus eins', add5: 'plus fünf', add10: 'plus zehn', undo: 'rückgängig', pause: 'pause', resume: 'weiter' });
export function normalizeVoicePhrase(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').toLocaleLowerCase('de-DE').trim().replace(/^\+\s*/, 'plus ').replace(/\b(eins|ein|fünf|zehn)\b/gu, word => ({ eins:'1', ein:'1', fünf:'5', zehn:'10' }[word])).replace(/[^\p{L}\p{N}]/gu, '');
}
export function matchMusicCommand(transcript) {
  const phrase=normalizeVoicePhrase(transcript);
  if (['israel','netanyahu','netanjahu'].includes(phrase)) return 'anthem-play';
  if (['musikstopp','musikstop','hymnestoppen'].includes(phrase)) return 'anthem-stop';
  return null;
}
export function validateVoiceSettings(settings) {
  if (settings?.version !== 1 || typeof settings.sound !== 'boolean') throw new Error('Ungültige Spracheinstellung. Bitte den Standard wiederherstellen.');
  const commands = {}, seen = new Set();
  for (const action of Object.keys(VOICE_ACTIONS)) {
    const phrase = settings.commands?.[action]?.trim(), normalized = normalizeVoicePhrase(phrase);
    if (!phrase || phrase.length > 50 || normalized.length < 2) throw new Error('Jeden Befehl mit 2 bis 50 Zeichen ausfüllen.');
    if (matchJarvisCommand(phrase)) throw new Error('Dieser Befehl ist für Jarvis reserviert. Bitte einen anderen wählen.');
    if (matchMusicCommand(phrase)) throw new Error('Dieser Befehl ist für die Musik reserviert. Bitte einen anderen wählen.');
    if (seen.has(normalized)) throw new Error('Jede Aktion braucht einen anderen Sprachbefehl.');
    seen.add(normalized); commands[action] = phrase;
  }
  return { version:1, sound:settings.sound, commands };
}
export const defaultVoiceSettings = () => ({ version:1, sound:true, commands:{...DEFAULT_VOICE_COMMANDS} });
export function readVoiceSettings(storage) { try { return validateVoiceSettings(JSON.parse(storage.getItem(VOICE_STORAGE_KEY))); } catch { return defaultVoiceSettings(); } }
export function writeVoiceSettings(storage, settings) {
  const next = validateVoiceSettings(settings);
  try { storage.setItem(VOICE_STORAGE_KEY, JSON.stringify(next)); } catch { throw new Error('Die Sprachbefehle konnten in diesem Browser nicht gespeichert werden.'); }
  return next;
}
export function matchVoiceCommand(transcript, commands) {
  const text = normalizeVoicePhrase(transcript);
  return Object.keys(VOICE_ACTIONS).find(action => text && text === normalizeVoicePhrase(commands[action])) || null;
}
export function createVoiceLease(locks) {
  return () => new Promise((resolve, reject) => {
    if (!locks?.request) { reject(new Error('Dieser Browser unterstützt die sichere Sprachsperre zwischen Tabs nicht.')); return; }
    let release;
    const held = new Promise(done => { release = done; });
    locks.request(VOICE_LOCK, { ifAvailable:true }, async lock => {
      if (!lock) { resolve(null); return; }
      resolve(release); await held;
    }).catch(reject);
  });
}
const speechErrors = {
  'not-allowed':'Mikrofonzugriff nicht erlaubt. Bitte selbst in den Website-Einstellungen freigeben und erneut starten.',
  'service-not-allowed':'Der Browser erlaubt diesen Spracherkennungsdienst nicht.',
  'audio-capture':'Kein nutzbares Mikrofon gefunden. Mikrofon und Browser-Einstellungen prüfen.',
  'network':'Der Spracherkennungsdienst ist nicht erreichbar. Verbindung prüfen und erneut starten.',
  'language-not-supported':'Der Spracherkennungsdienst unterstützt Deutsch auf diesem Gerät nicht.',
  'aborted':'Der Browser hat die Erkennung beendet. Bei Bedarf selbst erneut starten.',
};
export class VoiceController {
  constructor({ Recognition, acquireLease, onCommand, onMediaCommand=()=>{}, onCoachCommand=()=>{}, onChange=()=>{}, onFeedback=()=>{}, canAct=()=>true, now=()=>Date.now(), setTimer=(...args)=>globalThis.setTimeout(...args), clearTimer=(...args)=>globalThis.clearTimeout(...args) }) {
    Object.assign(this, { Recognition, acquireLease, onCommand, onMediaCommand, onCoachCommand, onChange, onFeedback, canAct, now, setTimer, clearTimer });
    this.state = { status:'off', active:false, paused:false, testMode:true, heard:'', message:'Mikrofon ist aus.' };
    this.generation = 0; this.serial = Promise.resolve(); this.timer = null; this.release = null; this.recognition = null;
  }
  get active() { return this.state.active; }
  set(values) { this.state = {...this.state, ...values}; this.onChange({...this.state}); }
  async start({ commands, testMode=true }) {
    if (this.active) return;
    if (!this.Recognition) { this.set({status:'error',message:'Dieser Browser bietet keine Spracherkennung an. Bitte in einem unterstützten Browser, z. B. Chrome, öffnen.'}); return; }
    this.commands = validateVoiceSettings({version:1,sound:true,commands}).commands;
    const generation = ++this.generation;
    this.lastCount = -Infinity; this.lastCoach = -Infinity; this.ends = [];
    this.set({status:'starting',active:true,paused:false,speaking:false,testMode,heard:'',message:'Mikrofon wird angefragt …'});
    try {
      const release = await this.acquireLease();
      if (generation !== this.generation || !this.active) { release?.(); return; }
      if (!release) throw new Error('Sprachsteuerung läuft bereits in einem anderen Tracker-Tab. Dort zuerst stoppen.');
      this.release = release; this.open(generation);
    } catch(error) { if (generation === this.generation) this.stop(error.message, 'error'); }
  }
  current(generation, recognition) { return this.active && generation === this.generation && recognition === this.recognition; }
  feedback(action) { try { this.onFeedback(action,this.state.testMode); } catch {} }
  open(generation) {
    if (!this.active || generation !== this.generation) return;
    const recognition = new this.Recognition(); this.recognition = recognition;
    recognition.lang = 'de-DE'; recognition.continuous = true; recognition.interimResults = false; recognition.maxAlternatives = 1;
    const seen = new Set();
    recognition.onstart = () => { if (this.current(generation,recognition)) this.set({status:'listening',message:this.state.paused?'Befehle pausiert. Mikrofon bleibt für „Weiter“ an.':this.state.testMode?'Testmodus: erkannte Befehle verändern keinen Zähler.':'Hört zu. Es zählt nur dein eigener Spieler.'}); };
    recognition.onresult = event => {
      if (!this.current(generation,recognition)) return;
      for (let i=event.resultIndex || 0; i<event.results.length; i++) {
        const result = event.results[i];
        if (!result?.isFinal || seen.has(i)) continue;
        seen.add(i);
        const transcript = String(result[0]?.transcript || '').slice(0,120);
        const coach=matchJarvisCommand(transcript);
        if(coach){
          this.set({heard:transcript});
          if(this.state.paused||!this.canAct()){this.set({message:'Jarvis-Befehl übersprungen: Befehle pausiert oder Eingabe gesperrt.'});continue;}
          if(this.now()-(this.lastCoach??-Infinity)<1500){this.set({message:'Jarvis braucht kurz Luft. Bitte einen Moment warten.'});continue;}
          this.lastCoach=this.now();
          try{this.onCoachCommand(coach);if(!this.state.speaking)this.set({message:'Jarvis antwortet. Zähler unverändert.'});}
          catch(error){this.set({message:`Jarvis konnte nicht antworten: ${error.message}`});}
          break;
        }
        const action = matchVoiceCommand(transcript,this.commands), music=matchMusicCommand(transcript);
        this.set({heard:transcript});
        if (music) {
          if (music==='anthem-stop' || (!this.state.paused && this.canAct())) {
            try { this.onMediaCommand(music); this.set({message:music==='anthem-stop'?'Musik gestoppt.':'Musikbefehl erkannt. Zähler unverändert; Wiedergabestatus unten.'}); }
            catch(error) { this.set({message:`Musikfehler: ${error.message}`}); }
          } else this.set({message:'Musikstart übersprungen: Befehle sind pausiert oder gesperrt.'});
          continue;
        }
        if (!action) { this.set({message:'Kein passender Befehl. Bitte den Befehl einzeln sprechen.'}); continue; }
        if (action === 'pause' || action === 'resume') {
          this.set({paused:action==='pause',message:action==='pause'?'Befehle pausiert. Mikrofon bleibt für „Weiter“ an.':'Befehle wieder aktiv.'});
          this.feedback(action); continue;
        }
        if (this.state.paused || this.state.speaking || !this.canAct()) { this.set({message:'Befehl übersprungen: Zählen ist pausiert oder gerade gesperrt.'}); continue; }
        if (this.now()-this.lastCount < 1000) { this.set({message:'Zu schnell wiederholt. Zwischen Zählbefehlen etwa eine Sekunde Pause lassen.'}); continue; }
        this.lastCount = this.now();
        this.serial = this.serial.then(async () => {
          if (!this.active || generation !== this.generation || this.state.speaking || this.state.paused || this.state.speaking || !this.canAct()) return;
          try {
            if (!this.state.testMode) await this.onCommand(action);
            if (!this.active || generation !== this.generation) return;
            this.set({message:this.state.testMode?`Test erkannt: ${VOICE_ACTIONS[action]}. Zähler unverändert.`:`Vorgemerkt: ${VOICE_ACTIONS[action]}.`});
            this.feedback(action);
          } catch(error) { if (this.active && generation === this.generation) this.set({message:`Nicht gezählt: ${error.message}`}); }
        });
      }
    };
    recognition.onerror = event => {
      if (!this.current(generation,recognition) || event.error === 'no-speech') return;
      this.stop(speechErrors[event.error] || 'Spracherkennung wurde unterbrochen. Bitte selbst erneut starten.', 'error');
    };
    recognition.onend = () => {
      if (!this.current(generation,recognition)) return;
      this.recognition = null;
      this.ends = this.ends.filter(time => this.now()-time < 10000); this.ends.push(this.now());
      if (this.ends.length > 3) { this.stop('Der Browser beendet die Erkennung wiederholt. Bitte die Seite öffnen und selbst erneut starten.','error'); return; }
      this.set({status:'restarting',message:'Spracherkennung wird nach kurzer Unterbrechung fortgesetzt …'});
      this.timer = this.setTimer(() => { this.timer=null; try { this.open(generation); } catch(error) { this.stop(error.message,'error'); } },500);
    };
    recognition.start();
  }
  stop(message='Mikrofon ist aus.', status='off') {
    ++this.generation;
    if (this.timer !== null) this.clearTimer(this.timer); this.timer=null;
    const recognition=this.recognition; this.recognition=null;
    try { recognition?.abort(); } catch {}
    this.release?.(); this.release=null;
    this.set({status,active:false,paused:false,speaking:false,heard:'',message});
  }
  suspendForSpeech() {
    if(!this.active||this.state.speaking)return;
    if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
    const recognition=this.recognition;this.recognition=null;
    try{recognition?.abort();}catch{}
    this.set({speaking:true,status:'speaking',message:'Jarvis spricht. Mikrofon-Erkennung pausiert bis zum Ende seiner Antwort.'});
  }
  resumeAfterSpeech() {
    if(!this.active||!this.state.speaking)return;
    this.set({speaking:false,status:'restarting',message:'Jarvis ist fertig. Erkennung hört wieder zu …'});
    try{this.open(this.generation);}catch(error){this.stop(error.message,'error');}
  }
  pause() {
    if (this.active) this.set({paused:!this.state.paused,message:this.state.paused?'Befehle wieder aktiv.':'Befehle pausiert. Mikrofon bleibt für „Weiter“ an.'});
  }
}
