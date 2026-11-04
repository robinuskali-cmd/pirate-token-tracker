import { battlepassProgress } from './battlepass.js';
import { number as n } from './core.js';
import { JARVIS_COMMANDS, matchJarvisCommand } from './jarvis-commands.js?v=soft-1';

export const COACH_HELLO='Jarvis an Deck, {name}. Ich bin dein kostenloser lokaler Sprüche-Coach. Schreib zum Beispiel „motivier mich“, „Status“, „Pech“ oder „ich brauche Pause“. Freie KI-Gespräche kann ich nicht führen – freche Kommentare zu deinem Fortschritt schon.';
export const COACH_UNKNOWN='Dafür habe ich noch keinen passenden Spruch. Ich erkenne Themen wie Motivation, Status, Roast, Pech, Frust und Pause. Probier einen Knopf unten – mein Gehirn ist lokal, mein Größenwahn unbegrenzt.';
export const COACH_GREETING='Jarvis an Deck, {name}. Meine Stimme ist an. Sag zum Beispiel: Jarvis, motivier mich. Oder beleidige mich. Auf eigene Gefahr, Kapitän.';
export function coachContext(state, actor, now=new Date()) {
  const player=state?.players?.find(p=>p.id===actor);
  if(!player)return null;
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const progress=battlepassProgress(player);
  return { name:player.name,total:Number(player.total),today:(state.daily||[]).filter(row=>row.player_id===actor&&row.day===day).reduce((sum,row)=>sum+Number(row.chests),0),level:progress.level,remaining:Math.ceil(progress.remaining/10),complete:progress.complete,next:progress.next?.title||null };
}
export function coachIntent(text) {
  const exact=matchJarvisCommand(text);if(exact)return exact;
  const t=String(text).normalize('NFKC').toLocaleLowerCase('de-DE');
  if(/\b(pause|müde|mued(e|igkeit)|schlaf|erschöpft|aufhören|durst)\b/u.test(t))return 'break';
  if(/\b(status|stand|fortschritt|level|battlepass|truhen|wie viel|wieviel)\b/u.test(t))return 'status';
  if(/\b(roast|beleidige|röste|roeste|zerstör|zerstoer)\b/u.test(t))return 'roast';
  if(/\b(rng|pech|glück|glueck|drop|token|chance)\b/u.test(t))return 'rng';
  if(/(frust|kein bock|keinen bock|kann nicht mehr|nervt|scheiß|scheiss|keine lust)/u.test(t))return 'frustration';
  if(/(motivier|motivation|anfeuern|push|weiter|los geht)/u.test(t))return 'motivation';
  if(/\b(hallo|hi|hey|jarvis|moin|hilfe)\b/u.test(t))return 'hello';
  return 'unknown';
}
export const COACH_PACKS={
  motivation:[
    'Kapitän {name}, {total} Truhen stehen im Logbuch. Dein Glück wurde offenbar per Fax verschickt. Dein Fortschritt dagegen ist schon da.',
    '{name}, ich habe deinen Lauf analysiert: Du bist noch da. Der RNG wirkt langsam nervös. Rein emotional natürlich.',
    'Mission für {name}: Schultern locker, einen sauberen Run. Wir farmen Truhen, keinen Bandscheibenvorfall.',
    '{today} Truhen heute netto. Das ist Fortschritt, kein Ladebildschirm. Stark, {name}.',
    'Jarvis-Protokoll: Chaos akzeptiert. Kurs gehalten. {name} ist weiterhin unangenehm motiviert.',
    'Dein Loot hat vielleicht Drama. Deine Ausdauer hat Hauptrollen-Energie, {name}.',
    'Ich habe einen Plan, {name}: ruhig spielen, Fortschritt feiern und bei Müdigkeit abdocken. Absolut wahnsinnige Strategie.',
    'Das Logbuch sagt {total}. Das ist eine Zahl mit Seegang. Respekt, Kapitän.',
  ],
  roast:[
    '{name}, {total} Truhen. Du öffnest inzwischen wahrscheinlich auch deinen Kühlschrank mit Loot-Erwartungen.',
    'Deine Beziehung zu Truhen ist intensiver als mein Kontakt zum Server. Ich habe übrigens keinen Server.',
    '{name}, dein Inventar riecht inzwischen nach Holz und unbeantworteten Support-Tickets ans Universum.',
    'Bei {total} Truhen verlangt selbst die Brechstange inzwischen Urlaub. Du bist trotzdem stabil, {name}.',
    'Du sagst „kurzer Run“. Das Logbuch bestellt schon mal einen zweiten Kaffee. Pausen sind trotzdem Pflicht fürs Hirn.',
    'Level {level}. Dein Battlepass wächst. Dein Stuhl hat inzwischen vermutlich einen eigenen Battlepass.',
  ],
  rng:[
    'Der RNG hat heute die soziale Kompetenz eines nassen Toasts. Aber: Vergangene Fehlversuche machen den nächsten Drop nicht wahrscheinlicher.',
    'Ich habe dem Glück eine Beschwerde geschickt. Antwort: „Bitte starten Sie das Universum neu.“ Eine Drop-Garantie habe ich leider nicht.',
    'Der Zufall schuldet dir keinen Drop. Eine vernünftige Pause schuldest du dir aber schon, {name}.',
    'Jarvis meldet: Kein magischer Pity-Zähler bekannt. Dein gespeicherter Fortschritt ist dagegen sehr real: {total} Truhen.',
    'Meine Kristallkugel ist ein umgedrehter Kochtopf. Ich kenne deinen Stand, nicht den nächsten Drop.',
  ],
  frustration:[
    'Der Loot benimmt sich wie ein Drucker kurz vor Abgabe. Verständlich, dass du genervt bist. Kurz durchatmen, {name}.',
    'Frust erkannt. Ich empfehle: Kiefer lösen, Wasser trinken, kurz wegschauen. Du musst heute nichts beweisen.',
    'Kapitän, wir sind auf Schatzsuche, nicht im unbezahlten Schichtdienst. Wenn es nur noch nervt: Pause ist ein guter Spielzug.',
    'Scheiß RNG-Moment. Dein Wert hängt trotzdem nicht an einem digitalen Token. Ein Run weniger ist kein Weltuntergang.',
  ],
  break:[
    'Pause-Protokoll aktiviert: Wasser holen, aufstehen, Augen entspannen. Das Logbuch rennt nicht weg, {name}.',
    'Kapitän {name}, abdocken. Selbst eine legendäre Truhe ersetzt keinen Schlaf. Dein Fortschritt wartet hier auf dich.',
    'Mission: fünf Minuten kein Bildschirm. Bosskampf: wirklich aufstehen. Belohnung: ein weniger beleidigter Rücken.',
    'Ich motiviere dich jetzt völlig radikal zum Pausieren. {total} Truhen bleiben gespeichert, auch wenn du kurz Mensch bist.',
  ],
  gentle:[
    '{name}, dein eigener Rhythmus zählt. {total} Truhen sind erfasst; du darfst zufrieden sein und jederzeit Pause machen.',
    '{today} Truhen heute netto, Level {level}. Schön, dass du deinen Fortschritt festhältst. Spiel so lange, wie es dir Freude macht.',
    'Ein ruhiger Run reicht, {name}. Kein Druck, keine Drop-Versprechen. Du entscheidest, wann Schluss ist.',
  ],
};
export class LocalCoach {
  constructor(random=Math.random){this.random=random;this.recent=[];}
  reply(intent,context,tone='chaos') {
    if(!context)return 'Melde dich zuerst im Tracker an oder öffne die lokale Demo.';
    if(intent==='hello')return COACH_HELLO.replace('{name}',context.name);
    if(intent==='unknown')return COACH_UNKNOWN;
    const command=JARVIS_COMMANDS.find(c=>c.id===intent);
    const useGentle=tone==='gentle'&&!['break','rng','status','thanks','jackpot'].includes(intent);
    const category=command&&!useGentle?command.id:tone==='gentle'&&!['break','rng'].includes(intent)?'gentle':Object.hasOwn(COACH_PACKS,intent)?intent:'motivation';
    const choices=(command&&!useGentle?command.replies:COACH_PACKS[category]).map((text,i)=>({text,id:`${category}:${i}`}));
    const unseen=choices.filter(c=>!this.recent.includes(c.id)), pool=unseen.length?unseen:choices;
    const chosen=pool[Math.min(pool.length-1,Math.max(0,Math.floor(this.random()*pool.length)))];
    this.recent=[...this.recent,chosen.id].slice(-3);
    const values={...context,total:n(context.total),today:n(context.today),level:n(context.level),next:context.complete?'Der Battlepass ist komplett. Piratenlegende bestätigt.':`Noch ${n(context.remaining)} zusätzliche Truhen bis „${context.next}“.`};
    return chosen.text.replace(/\{(name|total|today|level|next)\}/g,(_,key)=>values[key]);
  }
}
