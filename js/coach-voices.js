import { VOICE_CUES as leni } from './voice-recordings.js?v=voices-1';
import { VOICE_CUES as florian } from './voice-recordings-florian.js?v=voices-1';

export const COACH_VOICE_STORAGE_KEY='ptt.jarvis.voice.v1';
export const COACH_VOICES=[
  {id:'leni',label:'Leni · Schweiz · weiblich',cues:leni,url:'../assets/jarvis-voice.bin?v=leni-1',testUrl:'./assets/jarvis-test.mp3?v=leni-1'},
  {id:'florian',label:'Florian · Deutschland · männlich',cues:florian,url:'../assets/jarvis-florian.bin?v=florian-1',testUrl:'./assets/jarvis-florian-test.mp3?v=florian-1'},
];
export const coachVoice=id=>COACH_VOICES.find(v=>v.id===id)||COACH_VOICES[0];
export function readCoachVoice(storage){try{return coachVoice(storage.getItem(COACH_VOICE_STORAGE_KEY)).id;}catch{return 'leni';}}
export function writeCoachVoice(storage,id){
  if(!COACH_VOICES.some(v=>v.id===id))throw Error('Unbekannte Jarvis-Stimme.');
  storage.setItem(COACH_VOICE_STORAGE_KEY,id);return id;
}
