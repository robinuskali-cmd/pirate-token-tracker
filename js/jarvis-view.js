import { JARVIS_COMMANDS } from './jarvis-commands.js';
import { escapeHtml as e } from './core.js';

export function jarvisCommandTable(){
  return `<div class="table-wrap jarvis-command-table"><table><caption>Alle Jarvis-Sprachbefehle und ihre Alternativen</caption><thead><tr><th>Befehl</th><th>Thema</th><th>Auch möglich</th></tr></thead><tbody>${JARVIS_COMMANDS.map(c=>`<tr><td><strong>${e(c.phrases[0])}</strong></td><td>${e(c.group)}<br><small>${c.replies.length} Zufallsantworten</small></td><td>${c.phrases.length>1?c.phrases.slice(1).map(e).join('<br>'):'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
export function jarvisCommandsPage(ctx){
  const v=ctx.getVoice(),commands=v.commands;
  const controlRows=[
    [commands.add1,'Eigene Truhen +1'],[commands.add5,'Eigene Truhen +5'],[commands.add10,'Eigene Truhen +10'],
    [commands.undo,'Letzten eigenen Live-Klick zurücknehmen'],[commands.pause,'Sprachbefehle pausieren'],[commands.resume,'Sprachbefehle fortsetzen'],
    ['Israel / Netanyahu / Netanjahu','Hatikvah abspielen'],['Musik stopp / Musik stop / Hymne stoppen','Musik beenden'],
  ];
  return `<header class="page-intro"><div><div class="eyebrow">JARVIS / BEFEHLE</div><h1>Was du Jarvis sagen kannst.</h1><p>${JARVIS_COMMANDS.length} Befehle mit wechselnden Antworten – alle direkt zum Nachschauen.</p></div></header><section class="voice-command-panel jarvis-reference" aria-label="Jarvis-Befehlstabelle"><div class="voice-controls"><button type="button" class="primary" data-page="voice">Sprachsteuerung öffnen</button><button type="button" class="quiet" data-page="settings">Stimme ändern</button><a href="./JARVIS-BEFEHLE.md?v=commands-1" download>Befehlstabelle herunterladen ↗</a></div><p class="voice-message">Unter Sprachsteuerung das Mikrofon selbst starten und jeden Befehl einzeln sagen. Jarvis antwortet auch im Testmodus; seine Sprüche verändern keine Truhenzähler.</p><p class="tab-note">Aktuelle Stimme: ${e(v.coachVoice?.label||'Leni · Schweiz · weiblich')}. „Jarvis, Pause“ gibt einen Pausenspruch. „${e(commands.pause)}“ pausiert die Befehle; der Button „Jarvis stoppen“ beendet die Sprachausgabe.</p>${jarvisCommandTable()}</section><section class="voice-command-panel" aria-label="Zählen und Musik"><div class="panel-head"><h2>Zählen & Musik</h2><span class="table-caption">DEINE AKTUELLE BELEGUNG</span></div><div class="table-wrap jarvis-command-table"><table><thead><tr><th>Befehl</th><th>Aktion</th></tr></thead><tbody>${controlRows.map(([phrase,action])=>`<tr><td><strong>${e(phrase)}</strong></td><td>${e(action)}</td></tr>`).join('')}</tbody></table></div><p class="tab-note">Im Testmodus bleiben die Zähler unverändert. Die sechs Zähl- und Steuerbefehle kannst du unter Sprachsteuerung anpassen.</p></section>`;
}
