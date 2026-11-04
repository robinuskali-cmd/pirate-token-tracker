import { JARVIS_COMMANDS } from './jarvis-commands.js?v=recorded-1';
import { COACH_PACKS, COACH_GREETING, COACH_HELLO, COACH_UNKNOWN } from './coach.js?v=recorded-1';
import { REWARDS } from './battlepass.js';
export const cleanAudioText=text=>{const value=String(text).replace(/\s+/g,' ').trim();return /[\p{L}\p{N}]/u.test(value)?value:'';};
export const VOICE_TEMPLATES=[...new Set([...JARVIS_COMMANDS.flatMap(c=>c.replies),...Object.values(COACH_PACKS).flat(),COACH_GREETING,COACH_HELLO,COACH_UNKNOWN])];
const escapeRegex=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates=VOICE_TEMPLATES.map(template=>({parts:template.split(/\{(name|total|today|level|next)\}/g),pattern:new RegExp('^'+template.split(/\{(?:name|total|today|level|next)\}/g).map(escapeRegex).join('(.+?)')+'$','u')}));
export function numberAudio(value){
  if(!Number.isSafeInteger(value)||Math.abs(value)>999999999999)throw Error('Zahl außerhalb des Sprachbereichs.');
  if(value<0)return ['minus',...numberAudio(-value)];
  if(value<100)return [String(value)];
  const parts=[];
  for(const [size,one,many] of [[1000000000,'eine Milliarde','Milliarden'],[1000000,'eine Million','Millionen'],[1000,'1000','tausend']]){
    const count=Math.floor(value/size);if(!count)continue;
    parts.push(...(count===1?[one]:[...numberAudio(count),many]));value%=size;
  }
  if(value>=100){parts.push(String(Math.floor(value/100)*100));value%=100;}
  if(value)parts.push(String(value));return parts;
}
function parseNumber(text){const value=Number(text.replace(/\./g,'').replace(',','.'));return numberAudio(value);}
const done='Der Battlepass ist komplett. Piratenlegende bestätigt.';
export function speechPlan(text){
  for(const {parts,pattern}of templates){const match=pattern.exec(text);if(!match)continue;
    const plan=[];let capture=1;
    for(let i=0;i<parts.length;i++){
      if(i%2===0){const part=cleanAudioText(parts[i]);if(part)plan.push(part);continue;}
      const kind=parts[i],value=match[capture++];
      if(['total','today','level'].includes(kind))plan.push(...parseNumber(value));
      else if(kind==='name')plan.push(['Max','Szymon'].includes(value)?value:'Kapitän');
      else if(value===done)plan.push(done);
      else{const next=/^Noch (.+?) zusätzliche Truhen bis „(.+)“\.$/u.exec(value);if(!next||!REWARDS.some(r=>r.title===next[2]))throw Error('Unbekannter Battlepass-Titel.');plan.push('Noch',...parseNumber(next[1]),'zusätzliche Truhen bis',next[2]);}
    }
    return plan;
  }
  throw Error('Für diesen Text fehlt eine vorbereitete Aufnahme.');
}
export function recordingTexts(){
  return [...new Set([...VOICE_TEMPLATES.flatMap(t=>t.split(/\{(?:name|total|today|level|next)\}/g).map(cleanAudioText).filter(Boolean)),...Array.from({length:100},(_,i)=>String(i)),...Array.from({length:9},(_,i)=>String((i+1)*100)),'1000','tausend','minus','eine Million','Millionen','eine Milliarde','Milliarden','Max','Szymon','Kapitän','Noch','zusätzliche Truhen bis',...REWARDS.map(r=>r.title),done])];
}
