import test from 'node:test';
import assert from 'node:assert/strict';
import { freshDemo } from '../js/core.js';
import { coachContext, coachIntent, LocalCoach } from '../js/coach.js';
import { coachWidget } from '../js/coach-view.js';
const sample=()=>{const state=freshDemo();state.players[0].total=714;state.daily=[{day:'2026-11-04',player_id:'max',chests:14},{day:'2026-11-04',player_id:'szymon',chests:90},{day:'2026-11-03',player_id:'max',chests:200}];return state;};
const context=()=>coachContext(sample(),'max',new Date('2026-11-03T23:30:00Z'));
test('Coach kennt nur den eigenen bestätigten Stand, Berliner Tag und richtige Battlepass-Stufe',()=>{
 const state=sample(),before=structuredClone(state),c=coachContext(state,'max',new Date('2026-11-03T23:30:00Z'));
 assert.equal(c.total,714);assert.equal(c.today,14);assert.equal(c.level,2);assert.equal(c.remaining,86);assert.equal(c.next,'Küstenläufer');assert.deepEqual(state,before);assert.equal(coachContext(state,'unknown'),null);
});
test('Chat erkennt Motivation, Frust, Pause, RNG und Status mit klarer Pause-Priorität',()=>{
 for(const [text,intent] of [['motivier mich','motivation'],['kein Bock mehr','frustration'],['bin müde aber will mehr Truhen','break'],['wie ist mein Level','status'],['roast mich','roast'],['Pech beim Drop','rng'],['Hi Jarvis','hello'],['was ist ein Flugzeug','unknown']])assert.equal(coachIntent(text),intent);
});
test('Abwechslungsreiche Antworten wiederholen nicht die letzten drei Sprüche',()=>{
 const coach=new LocalCoach(()=>0),c=context(),replies=Array.from({length:6},()=>coach.reply('motivation',c));assert.equal(new Set(replies.slice(0,4)).size,4);assert.ok(replies.every(x=>!x.includes('{name}')));assert.ok(replies.some(x=>x.includes('Max')));
});
test('Status behauptet keine Drop-Garantie und bleibt bei Maximalstufe korrekt',()=>{
 const coach=new LocalCoach(),c=context();const reply=coach.reply('status',c);assert.match(reply,/714/);assert.match(reply,/86 zusätzliche Truhen/);
 const state=sample();state.players[0].total=2600;const done=coachContext(state,'max');assert.equal(done.complete,true);assert.equal(done.remaining,0);assert.match(coach.reply('status',done),/komplett/);assert.doesNotMatch(coach.reply('status',done),/bis „/);
});
test('Sanfter Stil vermeidet Roasts; Fremdthemen und fehlende Anmeldung bleiben ehrlich',()=>{
 const coach=new LocalCoach(()=>0);assert.match(coach.reply('roast',context(),'gentle'),/eigener Rhythmus/);assert.match(coach.reply('unknown',context()),/noch keinen passenden/);assert.match(coach.reply('hello',context()),/Freie KI-Gespräche kann ich nicht/);assert.match(coach.reply('motivation',null),/zuerst/);
});
test('Texte und Entwürfe werden escaped; geschlossener Coach zeigt keinen Gesprächsinhalt',()=>{
 const state={open:true,tone:'chaos',draft:'"><img src=x onerror=alert(1)>',messages:[{role:'user',text:'<script>alert(1)</script>'}]};const html=coachWidget(state,context());assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/keine generative KI/);assert.ok(!coachWidget({...state,open:false},context()).includes('alert(1)'));assert.equal(coachWidget(state,null),'');
});

test('Jeder Katalogbefehl und Alias ist eindeutig und hat mehrere Zufallsantworten',async()=>{
 const {JARVIS_COMMANDS,matchJarvisCommand}=await import('../js/jarvis-commands.js');const all=new Set();
 for(const c of JARVIS_COMMANDS){assert.ok(c.replies.length>=3);for(const phrase of c.phrases){const key=phrase.toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');assert.ok(!all.has(key),phrase);all.add(key);assert.equal(matchJarvisCommand(phrase),c.id);assert.equal(coachIntent(phrase),c.id);}
 const coach=new LocalCoach(()=>0),replies=Array.from({length:3},()=>coach.reply(c.id,context()));assert.equal(new Set(replies).size,3,c.id);assert.ok(replies.every(x=>!/[{}]/.test(x)),c.id);}
 for(const phrase of ['ich sage jetzt Jarvis du Bastard','Jarvis du Bastard plus eins','kein Jackpot','Jarvis du bist nutzlos und plus fünf'])assert.equal(matchJarvisCommand(phrase),null);
 assert.equal(matchJarvisCommand('Jarwis, du Bastard!'),'bastard');assert.equal(matchJarvisCommand('JARVIS FICK DICH!'),'fuckyou');
});
