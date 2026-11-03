import { TrackerStore } from './store.js';
import { createViews } from './views.js';
import { icon } from './icons.js';
import { authCallbackTarget } from './account-service.js';
import { SHORTCUT_STORAGE_KEY, defaultShortcuts, readShortcuts, writeShortcuts, normalizeShortcutKey, shortcutLabel, shortcutAction } from './shortcuts.js';
import { number as n, escapeHtml as e, duration, secondsSince, integer, activeSession, activeRound, roundCount, roundTotal, roundSeconds, totalChests, nextMilestone, dropProbability, requiredChests } from './core.js';

const root = document.querySelector('#app'), dialog = document.querySelector('#dialog');
const authRedirect = authCallbackTarget(location.href);
if (authRedirect) location.replace(authRedirect);
const store = new TrackerStore();
let shortcuts = readShortcuts(localStorage), shortcutDraft = structuredClone(shortcuts), shortcutDirty = false;
const pages = { overview: ['Live','grid'], rounds: ['Logbuch','book'], stats: ['Statistik','chart'], rng: ['RNG-Labor','compass'], settings: ['Einstellungen','settings'] };
let page = Object.hasOwn(pages, location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
let chartDays = 7, rngPercent = .1, rngChests = 1600, previousTotal = null, toastTimer;
const playerName = id => id === 'max' ? 'Max' : 'Szymon';
const nameOf = () => playerName(store.actor);
const avatar = (id, mini = false) => `<span class="avatar ${id} ${mini ? 'mini' : ''}">${id === 'max' ? 'M' : 'S'}</span>`;
const button = (action, label, glyph, cls = '', more = '') => `<button type="button" class="${cls}" data-action="${action}" ${more}>${glyph ? icon(glyph) : ''}${label}</button>`;
const date = value => new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
const time = value => new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
function toast(message, kind = 'success') {
  const node = document.querySelector('#toast'); node.textContent = message; node.dataset.kind = kind; node.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 4000);
}
function saved() { return store.queue.length ? `${store.queue.length} vorgemerkt` : store.demo ? 'Lokal gespeichert' : 'Alles gespeichert'; }
function pendingFor(id) { return store.queue.filter(q => !q.blocked && q.action === 'increment' && q.payload.player_id === id && !store.state?.changes.some(c => c.request_id === q.id)).reduce((a,q) => a + q.payload.delta,0); }
function displayTotal(id) { return Number(store.state.players.find(p => p.id === id).total) + pendingFor(id); }
function noPending() { if (store.queue.length) throw new Error('Bitte zuerst die vorgemerkten Änderungen übertragen. Unter Einstellungen kannst du Konflikte prüfen.'); }
function available() { if (!store.actor) throw new Error('Bitte zuerst anmelden.'); }
function connection() {
  const states = { demo: ['Demo · lokal','amber'], live: ['Live verbunden',''], connected: ['Verbunden · Abruf','amber'], loading: ['Wird geladen','amber'], offline: ['Offline · vorgemerkt','red'], reconnecting: ['Verbindung wird erneuert','amber'], signedout: ['Privater Zugang','amber'], error: ['Einrichtung prüfen','red'] };
  const [label, cls] = states[store.status] || states.loading;
  return `<span class="connection"><i class="dot ${cls}"></i>${label}</span>`;
}
function renderRng() {
  const output = document.querySelector('#rng-output'); if (!output) return;
  const pct = Number(document.querySelector('#rng-percent').value), chests = Number(document.querySelector('#rng-chests').value);
  if (document.querySelector('#rng-percent').value === '' || document.querySelector('#rng-chests').value === '' || !Number.isFinite(pct) || pct < 0 || pct > 100 || !Number.isSafeInteger(chests) || chests < 0 || chests > 1e9) { output.innerHTML = '<p class="dialog-error">Bitte eine Chance von 0 bis 100 % und eine ganze Truhenzahl bis 1 Milliarde eingeben.</p>'; document.querySelector('#rng-comparison').innerHTML=''; return; }
  rngPercent = pct; rngChests = chests;
  const p = pct/100, chance=dropProbability(p,chests);
  const percent = x => x > 0 && x < .0001 ? '&lt; 0,01 %' : x < 1 && x > .9999 ? '&gt; 99,99 %' : new Intl.NumberFormat('de-DE',{style:'percent',maximumFractionDigits:2}).format(x);
  const rateLabel = new Intl.NumberFormat('de-DE',{maximumSignificantDigits:8}).format(pct);
  output.innerHTML = `<div class="rng-result"><span class="eyebrow" style="justify-content:center">Mindestens ein Drop</span><strong>${percent(chance)}</strong><p>nach ${n(chests)} Truhen bei ${rateLabel} % pro Truhe</p></div><div class="panel-head"><h3>Wie viele Truhen für …</h3></div><div class="prob-targets">${[.1,.5,.9].map(target=>`<div class="record"><small>${percent(target)} Chance</small><strong>${Number.isFinite(requiredChests(p,target))?n(requiredChests(p,target)):'∞'}</strong><small>Truhen insgesamt</small></div>`).join('')}</div><p class="tab-note">Berechnet ab dem ersten Versuch. Eine 90-%-Chance bedeutet auch eine 10-%-Chance auf keinen einzigen Drop.</p>`;
  document.querySelector('#rng-comparison').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Annahme pro Truhe</th><th>Nach ${n(chests)} Truhen</th><th>50 % ab</th><th>90 % ab</th></tr></thead><tbody>${[.0001,.0005,.001].map(rate=>`<tr><td><strong>${percent(rate)}</strong> · hypothetisch</td><td>${percent(dropProbability(rate,chests))}</td><td>${n(requiredChests(rate,.5))} Truhen</td><td>${n(requiredChests(rate,.9))} Truhen</td></tr>`).join('')}</tbody></table></div>`;
  updateTableLabels();
}
const { shell, overview, roundsPage, statsPage, rngPage, settingsPage } = createViews({
  store, pages, button, avatar, connection, saved, displayTotal, pendingFor, date, time, playerName,
  getPage: () => page, getChartDays: () => chartDays,
  getRng: () => ({ percent: rngPercent, chests: rngChests }),
  getShortcuts: () => shortcuts, getShortcutDraft: () => shortcutDraft, shortcutLabel,
  isShortcutDirty: () => shortcutDirty,
});
let lastRenderedPage = null;
const counterHistory = new Map();
let pointerHeld = false, renderDeferred = false;
// A remote update must not remove a button between pointerdown and pointerup.
root.addEventListener('pointerdown', () => { pointerHeld = true; }, true);
for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, () => {
  pointerHeld = false;
  if (renderDeferred) { renderDeferred = false; requestAnimationFrame(render); }
}, true);
window.addEventListener('blur', () => {
  pointerHeld = false;
  if (renderDeferred) { renderDeferred = false; requestAnimationFrame(render); }
});
function updateTableLabels(scope = root) {
  scope.querySelectorAll('table').forEach(table => {
    const headings = [...table.querySelectorAll('thead th')].map(node => node.textContent);
    table.querySelectorAll('tbody tr').forEach(row => [...row.children].forEach((cell,i) => {
      if (!cell.hasAttribute('data-label')) cell.dataset.label = headings[i] || '';
    }));
  });
}
function counterFeedback() {
  for (const id of ['max', 'szymon']) {
    const next = displayTotal(id), previous = counterHistory.get(id);
    counterHistory.set(id, next);
    if (previous == null || previous === next) continue;
    const console = root.querySelector(`[data-counter-id="${id}"]`);
    if (!console) continue;
    const delta = next - previous;
    console.querySelector('.count-event').textContent = `${delta > 0 ? '+' : '−'}${n(Math.abs(delta))}`;
    console.classList.add('counted');
    setTimeout(() => console.classList.remove('counted'), 450);
  }
}
function loginPage() {
  return `<div class="login-wrap"><div class="eyebrow">${icon('shield')}Private Crew</div><h1>Willkommen an Bord.</h1><p>Dein Logbuch wartet. Melde dich mit deinem freigeschalteten Spieleraccount an.</p><section class="panel"><form id="login-form"><label class="field"><span>E-Mail</span><input type="email" name="email" required autocomplete="username"></label><label class="field"><span>Passwort</span><input type="password" name="password" required autocomplete="current-password"></label><button type="submit" class="primary">${icon('arrow')}Anmelden</button><p id="login-error" class="dialog-error" role="alert"></p></form><a class="account-link" href="./account.html#reset">Passwort vergessen?</a></section><p class="tab-note">Zugang nur für Max und Szymon. Accounts werden im Supabase Dashboard eingerichtet.</p>${button('mode','Lokale Demo ausprobieren','play','quiet')}</div>`;
}
function render() {
  if (pointerHeld) { renderDeferred = true; return; }
  const focusId = document.activeElement?.id;
  const focused = document.activeElement;
  const focusAttributes = focused?.tagName === 'BUTTON' ? ['action','player','delta','page','round','request'].filter(key=>focused.dataset[key]).map(key=>`[data-${key}="${CSS.escape(focused.dataset[key])}"]`).join('') : '';
  if (!store.state && !['signedout','error'].includes(store.status)) { root.innerHTML=shell('<div class="empty"><span class="loader" style="display:inline-block"></span><p class="mt">Das Logbuch wird geladen …</p></div>'); return; }
  if (!store.state) root.innerHTML=shell(loginPage());
  else root.innerHTML=shell(({overview,rounds:roundsPage,stats:statsPage,rng:rngPage,settings:settingsPage})[page]());
  if (page==='rng' && store.state) renderRng();
  updateTableLabels();
  if (lastRenderedPage !== page) root.querySelector('.view')?.classList.add('view-enter');
  lastRenderedPage = page;
  if (store.state) counterFeedback();
  if (focusId) document.getElementById(focusId)?.focus({preventScroll:true});
  else if (focusAttributes) root.querySelector(`button${focusAttributes}`)?.focus({preventScroll:true});
  if (store.state) {
    const total=totalChests(store.state);
    if (previousTotal != null && total>previousTotal && localStorage.getItem('pirate-tracker:notifications')==='on' && 'Notification' in window && Notification.permission==='granted') {
      for (const m of [1000,2500,5000,10000,25000,50000,100000]) if(previousTotal<m && total>=m) { toast(`Meilenstein erreicht: ${n(m)} Team-Truhen!`); new Notification('Pirate Token Tracker',{body:`${n(m)} Truhen als Crew geöffnet. Weiter so!`,tag:`pirate-milestone-${m}`}); }
    }
    previousTotal=total;
  }
}
function navigate(next) { if (!Object.hasOwn(pages,next)) return; page=next; location.hash=next; render(); window.scrollTo({top:0,behavior:'instant'}); }
function saveKeyboard(settings) {
  try { shortcuts = writeShortcuts(localStorage, settings); }
  catch (error) {
    if (/andere Taste|einzelne|Ungültige/.test(error.message)) throw error;
    throw new Error('Die Tastaturbelegung konnte in diesem Browser nicht gespeichert werden.');
  }
  shortcutDraft = structuredClone(shortcuts); shortcutDirty = false; render();
  toast('Tastaturbelegung gespeichert.');
}
function keyboardDirty() {
  shortcutDirty = true;
  const node = root.querySelector('#shortcut-status'); if (node) node.textContent = 'Noch nicht gespeichert.';
  const error = root.querySelector('#shortcut-error'); if (error) error.textContent = '';
}
window.addEventListener('storage', event => {
  if (event.key !== SHORTCUT_STORAGE_KEY) return;
  shortcuts = readShortcuts(localStorage);
  if (!shortcutDirty) shortcutDraft = structuredClone(shortcuts);
  render();
});
root.addEventListener('keydown', event => {
  const input = event.target.closest('input[data-shortcut]'); if (!input) return;
  if (event.key === 'Tab' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  if (event.key === 'Escape') { input.blur(); return; }
  if (event.key === 'Shift') return;
  event.preventDefault(); event.stopPropagation();
  const key = normalizeShortcutKey(event.key);
  if (!key) { root.querySelector('#shortcut-error').textContent = 'Bitte einen Buchstaben, eine Ziffer, eine Pfeiltaste oder die Leertaste drücken.'; return; }
  shortcutDraft.bindings[input.dataset.shortcut] = key; input.value = shortcutLabel(key); keyboardDirty();
});
window.addEventListener('hashchange',()=>{const target=authCallbackTarget(location.href);if(target){location.replace(target);return;}const next=location.hash.slice(1); if(Object.hasOwn(pages,next)&&page!==next){page=next;render();}});
function modal(title, body, submitLabel, handler) {
  dialog.innerHTML=`<form id="modal-form"><div class="dialog-head"><h2 id="dialog-title">${title}</h2><button type="button" data-close aria-label="Dialog schließen">${icon('close')}</button></div>${body}<div class="dialog-error" role="alert" id="modal-error"></div><div class="dialog-actions"><button type="button" data-close class="quiet">Abbrechen</button><button type="submit" class="primary">${submitLabel}</button></div></form>`;
  dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
  dialog.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault(); const submit=event.submitter; submit.disabled=true; submit.classList.add('is-loading'); submit.setAttribute('aria-busy','true');
    try { await handler(new FormData(event.target)); dialog.close(); } catch(error) { dialog.querySelector('#modal-error').textContent=error.message; } finally { submit.disabled=false; submit.classList.remove('is-loading'); submit.removeAttribute('aria-busy'); }
  });
  dialog.showModal();
}
function sessionModal() {
  available(); noPending();
  if (activeSession(store.state)) { toast('Es läuft bereits eine Session.'); navigate('overview'); return; }
  modal('Setzt die Segel.',`<p>Startet eine gemeinsame Farm-Session. Sie bleibt bestehen, wenn ihr die Website schließt.</p><label class="field"><span>Landepunkt oder Farmroute <small>optional</small></span><input name="route" maxlength="160" placeholder="z. B. Küste → Hafen → Piratenlager"></label>`,'Session starten',async form=>{ await store.mutate('start_session',{session_id:crypto.randomUUID(),route:form.get('route').trim()}); toast('Session gestartet. Auf zur ersten Runde!'); });
}
function entryModal(roundId) {
  available(); noPending();
  const s=store.state, round=roundId ? s.rounds.find(r=>r.id===roundId) : activeRound(s);
  if (!round && !activeSession(s)) { toast('Starte zuerst eine Session. Danach kannst du Runden nachtragen.'); sessionModal(); return; }
  const choices=store.demo ? ['max','szymon'] : [store.actor];
  const captured=structuredClone(s);
  modal(round?'Rundengesamtwert festlegen':'Runde nachtragen',`<p>${round?'Trage die endgültige Anzahl dieser Runde ein. Bereits live gezählte Truhen werden automatisch verrechnet.':'Nur für eine zusätzliche, noch nicht live erfasste Runde. Bestehende Runden über das Rundenbuch bearbeiten.'}</p><label class="field"><span>Spieler</span><select name="player" id="entry-player">${choices.map(id=>`<option value="${id}" ${id===store.actor?'selected':''}>${playerName(id)}</option>`).join('')}</select></label><div class="form-grid"><label class="field"><span>Truhen dieser Runde · Gesamtwert</span><input name="total" id="entry-total" type="number" min="0" max="1000000" step="1" required inputmode="numeric" value="${round?roundCount(s,round.id,store.actor).chests:''}" placeholder="z. B. 25"></label><label class="field"><span>Rundendauer in Minuten <small>optional</small></span><input name="minutes" id="entry-minutes" type="number" min="0.02" max="1440" step="any" inputmode="decimal" placeholder="z. B. 12" value="${round && roundCount(s,round.id,store.actor)?.duration_seconds ? roundCount(s,round.id,store.actor).duration_seconds/60 : ''}"></label></div><div id="entry-difference" class="help"></div>`,'Wert speichern',async form=>{
    noPending(); const who=form.get('player'), total=integer(form.get('total'));
    const raw=form.get('minutes'); let dur=null;
    if(raw!==''){const minutes=Number(raw); if(!Number.isFinite(minutes)||minutes<=0||minutes>1440) throw new Error('Die Dauer muss größer als 0 und höchstens 1.440 Minuten sein.'); dur=integer(Math.round(minutes*60),1,86400);}
    if(store.demo)store.selectActor(who);
    if(round){const c=roundCount(captured,round.id,who);await store.mutate('set_round_total',{player_id:who,round_id:round.id,total,duration_seconds:dur,expected_chests:c.chests,expected_revision:c.revision});}
    else await store.mutate('manual_round',{player_id:who,session_id:activeSession(captured).id,round_id:crypto.randomUUID(),total,duration_seconds:dur});
    toast(store.demo?'Rundengesamtwert gespeichert.':'Rundeneintrag sicher vorgemerkt.');
  });
  const update=()=>{
    const who=dialog.querySelector('#entry-player').value, current=round?roundCount(captured,round.id,who).chests:0, raw=dialog.querySelector('#entry-total').value, target=Number(raw);
    dialog.querySelector('#entry-difference').textContent=raw!==''&&Number.isSafeInteger(target)&&target>=0?`Bisher in dieser Runde: ${n(current)} · Neuer Gesamtwert: ${n(target)} · Differenz: ${target-current>=0?'+':''}${n(target-current)} Truhen`:'Gib die Gesamtzahl der Runde ein.';
  };
  dialog.querySelector('#entry-player').addEventListener('change',()=>{const who=dialog.querySelector('#entry-player').value; dialog.querySelector('#entry-total').value=round?roundCount(captured,round.id,who).chests:'';dialog.querySelector('#entry-minutes').value=round&&roundCount(captured,round.id,who).duration_seconds?roundCount(captured,round.id,who).duration_seconds/60:'';update();});
  dialog.querySelector('#entry-total').addEventListener('input',update);update();
}
function finishModal() {
  noPending(); const s=store.state,r=activeRound(s); if(!r)throw new Error('Keine laufende Runde.');
  const max=roundCount(s,r.id,'max'),sz=roundCount(s,r.id,'szymon');
  modal('Runde abschließen',`<p>Eure live gezählten Werte werden als Rundenergebnis gespeichert.</p><div class="record-grid"><div class="record"><small>Max</small><strong>${n(max.chests)}</strong><small>Truhen</small></div><div class="record"><small>Szymon</small><strong>${n(sz.chests)}</strong><small>Truhen</small></div></div><p class="tab-note">Fehlt etwas? Schließe diesen Dialog und lege über „Wert eintragen“ deinen endgültigen Rundengesamtwert fest. Spätere Korrekturen sind im Rundenbuch möglich.</p>`,'Runde abschließen',async()=>{noPending();await store.mutate('end_round',{round_id:r.id,expected_max:max.chests,expected_szymon:sz.chests,revision_max:max.revision,revision_szymon:sz.revision});toast('Rundenabschluss gespeichert bzw. vorgemerkt.');});
}
async function add(player,delta) {
  available(); if(player!==store.actor)throw new Error('Du kannst nur deinen eigenen Counter ändern.');
  if(store.queue.some(q=>q.blocked))throw new Error('Bitte zuerst den abgelehnten Eintrag unter Einstellungen prüfen.');
  if(store.queue.some(q=>q.action!=='increment'))throw new Error('Bitte die vorherige Aktion erst übertragen lassen.');
  const r=activeRound(store.state);
  if(!r&&activeSession(store.state))throw new Error('Starte zuerst eine Runde in eurer laufenden Session.');
  await store.mutate('increment',{player_id:player,delta,round_id:r?.id||null,expected_revision:r?roundCount(store.state,r.id,player).revision:0});
}
async function undo(player) {
  noPending(); if(player!==store.actor)throw new Error('Du kannst nur deinen eigenen Counter ändern.');
  const s=store.state;
  const change=s.changes.find(c=>c.player_id===player&&c.reason==='live'&&c.delta>0&&!s.changes.some(x=>x.reversal_of===c.id));
  if(!change)throw new Error('Kein Live-Klick zum Rückgängigmachen gefunden. Ältere Runden kannst du im Rundenbuch korrigieren.');
  await store.mutate('undo',{player_id:player,change_id:change.id,expected_revision:change.round_id?roundCount(s,change.round_id,player).revision:0});
}
const actions={
  'shortcuts-reset':()=>saveKeyboard(defaultShortcuts()),
  'increment':b=>add(b.dataset.player,Number(b.dataset.delta)),
  'undo':b=>undo(b.dataset.player),
  'switch':b=>store.selectActor(b.dataset.player),
  'setup':()=>navigate('settings'), 'queue':()=>navigate('settings'),
  'start-session':sessionModal, 'entry':()=>entryModal(), 'edit-round':b=>entryModal(b.dataset.round),
  'focus-session':()=>document.querySelector('#session-panel')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'}),
  'start-round':async()=>{noPending();const session=activeSession(store.state);if(!session)throw new Error('Bitte zuerst eine Session starten.');await store.mutate('start_round',{session_id:session.id,round_id:crypto.randomUUID()});},
  'finish-round':finishModal,
  'end-session':()=>{noPending();const session=activeSession(store.state);if(!session)return;modal('Session beenden?',`<p>Die Session und alle Runden bleiben im Logbuch erhalten. Ihr könnt jederzeit eine neue Session starten.</p>`,'Session beenden',()=>store.mutate('end_session',{session_id:session.id}));},
  'export':()=>{const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),mode:store.demo?'demo':'supabase',snapshot:store.state,pending:store.queue},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pirate-logbuch-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Logbuch exportiert.');},
  'notifications':async()=>{if(!('Notification'in window))throw new Error('Dieser Browser unterstützt keine Benachrichtigungen.');if(Notification.permission==='denied')throw new Error('Benachrichtigungen sind im Browser blockiert. Bitte in den Website-Einstellungen erlauben.');const permission=await Notification.requestPermission();localStorage.setItem('pirate-tracker:notifications',permission==='granted'?'on':'off');toast(permission==='granted'?'Meilenstein-Benachrichtigungen aktiviert.':'Benachrichtigungen bleiben deaktiviert.');},
  'retry':()=>store.reconnect(), 'logout':()=>store.logout(),
  'reset-demo':()=>modal('Demo zurücksetzen?',`<p>Die lokalen Test-Sessions, Runden und Klicks werden entfernt. Max startet wieder bei 500 und Szymon bei 1.100. Exportiere dein Logbuch vorher, falls du die Daten behalten möchtest. Eure Supabase-Daten werden nicht verändert.</p>`,'Demo zurücksetzen',async()=>{previousTotal=null;await store.resetDemo();toast('Demo auf die Startwerte zurückgesetzt.');}),
  'discard':b=>{const id=b.dataset.request;modal('Abgelehnten Eintrag verwerfen?',`<p>Der Server hat diese Änderung sicher abgelehnt. Sie wurde nicht angewendet. Exportiere dein Logbuch, wenn du den Eintrag aufbewahren möchtest. Danach kannst du den korrekten Wert neu eintragen.</p>`,'Eintrag verwerfen',()=>store.discard(id));},
  'mode':()=>{noPending();localStorage.setItem('pirate-tracker:mode',store.demo?'live':'demo');location.reload();},
  'use-total':()=>{rngChests=totalChests(store.state);document.querySelector('#rng-chests').value=rngChests;renderRng();},
};
root.addEventListener('click',async event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.page){navigate(b.dataset.page);return;}
  if(!actions[b.dataset.action])return;
  try{await actions[b.dataset.action](b);}catch(error){toast(error.message,'error');}
});
root.addEventListener('submit',async event=>{
  if(event.target.id==='shortcuts-form'){
    event.preventDefault();
    try{saveKeyboard(shortcutDraft);}catch(error){root.querySelector('#shortcut-error').textContent=error.message;}
    return;
  }
  if(event.target.id!=='login-form')return;event.preventDefault();const form=new FormData(event.target),b=event.submitter;b.disabled=true;b.classList.add('is-loading');b.setAttribute('aria-busy','true');
  try{await store.login(form.get('email'),form.get('password'));}catch(error){const node=document.querySelector('#login-error');if(node)node.textContent=error.message;else toast(error.message,'error');}finally{b.disabled=false;b.classList.remove('is-loading');b.removeAttribute('aria-busy');}
});
root.addEventListener('change',event=>{if(event.target.id==='chart-days'){chartDays=Number(event.target.value);render();}if(event.target.id==='demo-actor')store.selectActor(event.target.value);if(event.target.id==='shortcuts-enabled'){shortcutDraft.enabled=event.target.checked;keyboardDirty();}});
root.addEventListener('input',event=>{
  if(event.target.id==='rng-range')document.querySelector('#rng-percent').value=event.target.value;
  if(event.target.id==='rng-percent'&&event.target.value!==''&&Number.isFinite(Number(event.target.value)))document.querySelector('#rng-range').value=Math.min(1,Math.max(.001,Number(event.target.value)));
  if(['rng-percent','rng-chests','rng-range'].includes(event.target.id))renderRng();
});
document.addEventListener('keydown',async event=>{
  if(!store.state)return;
  const action=shortcutAction(event,shortcuts,store.actor,{dialogOpen:dialog.open,editable:Boolean(event.target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]')),interactive:Boolean(event.target.closest('button,a[href],summary,[role="button"]'))});
  if(!action)return;
  event.preventDefault();
  try{if(action==='increment')await add(store.actor,1);else await undo(store.actor);}catch(error){toast(error.message,'error');}
});
setInterval(()=>{
  root.querySelectorAll('[data-timer]').forEach(node=>{node.textContent=duration(secondsSince(node.dataset.timer));});
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) root.querySelectorAll('[data-sweep]').forEach(node=>{node.style.transform=`rotate(${secondsSince(node.dataset.sweep)%60*6}deg)`;});
  if(page==='overview'&&store.state){
    const s=store.state, session=activeSession(s), rate=root.querySelector('[data-session-rate]'), play=root.querySelector('[data-playtime]');
    if(session&&rate){const chests=s.rounds.filter(r=>r.session_id===session.id).reduce((a,r)=>a+roundTotal(s,r.id),0);rate.textContent=chests?n(chests/Math.max(1,secondsSince(session.started_at))*3600):'—';}
    if(play)play.textContent=duration(s.rounds.reduce((a,r)=>a+(r.manual&&!s.counts.some(c=>c.round_id===r.id&&c.duration_seconds)?0:roundSeconds(s,r)),0)).slice(0,5);
  }
},1000);
store.addEventListener('change',render);
if (!authRedirect) { try{await store.init();}catch(error){store.status='error';store.fail(error);} }
