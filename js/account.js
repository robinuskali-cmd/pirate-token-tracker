import { config } from './config.js';
import { escapeHtml as e } from './core.js';
import { changePassword, requestPasswordReset } from './account-service.js';

const root = document.querySelector('#account-content');
const hash = new URLSearchParams(location.hash.slice(1));
const isCallback = hash.has('access_token') || hash.get('type') === 'recovery' || hash.has('error_code') || hash.has('error_description');
const callbackError = hash.has('error_code') || hash.has('error_description');
let requestMode = location.hash === '#reset';
const recoveryKey = `pirate-tracker:password-recovery:${config.supabaseUrl}`;
let client, recoveryUser = null, activeUser = null;
const back = '<p class="account-actions"><a href="./">Zurück zum Tracker</a></p>';

function resetForm(message = '') {
  root.innerHTML = `<h1>Passwort vergessen?</h1><p>Gib die E-Mail-Adresse deines Tracker-Zugangs ein. Du erhältst einen Link, um ein neues Passwort zu setzen.</p>${message ? `<p class="dialog-error" role="alert">${e(message)}</p>` : ''}<form id="reset-form"><label class="field"><span>E-Mail</span><input name="email" type="email" required autocomplete="username"></label><button class="primary" type="submit">Rücksetzlink anfordern</button><p id="account-error" class="dialog-error" role="alert"></p></form>${back}`;
}
function passwordForm(recovery) {
  root.innerHTML = `<h1>${recovery ? 'Neues Passwort setzen' : 'Passwort ändern'}</h1><p>Tracker-Zugang für <strong>${e(activeUser.email)}</strong>. Deine Truhen und Runden bleiben erhalten.</p><form id="password-form">${recovery ? '' : '<label class="field"><span>Bisheriges Tracker-Passwort</span><input name="current" type="password" required autocomplete="current-password"></label>'}<label class="field"><span>Neues Passwort</span><input name="password" type="password" required minlength="12" autocomplete="new-password"><small>Mindestens 12 Zeichen. Verwende ein eigenes Passwort für den Tracker.</small></label><label class="field"><span>Neues Passwort wiederholen</span><input name="confirmation" type="password" required minlength="12" autocomplete="new-password"></label><button class="primary" type="submit">Neues Passwort speichern</button><p id="account-error" class="dialog-error" role="alert"></p></form><p><a href="./account.html#reset">Bisheriges Passwort vergessen?</a></p>${back}`;
  root.querySelector('form').dataset.recovery = recovery ? 'yes' : 'no';
}
window.addEventListener('hashchange', () => {
  const next = new URLSearchParams(location.hash.slice(1));
  if (next.has('access_token') || next.get('type') === 'recovery') { location.reload(); return; }
  requestMode = location.hash === '#reset';
  if (!client) return;
  if (requestMode || !activeUser) resetForm();
  else passwordForm(recoveryUser === activeUser.id || sessionStorage.getItem(recoveryKey) === activeUser.id);
});

root.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, submit = event.submitter, values = new FormData(form);
  submit.disabled = true; submit.setAttribute('aria-busy', 'true');
  root.querySelector('#account-error').textContent = '';
  try {
    if (form.id === 'reset-form') {
      const message = await requestPasswordReset(client, values.get('email'), new URL('./account.html', location.href).href);
      form.reset();
      root.innerHTML = `<h1>Prüfe dein Postfach</h1><p role="status">${e(message)}</p><p>Öffne den Link aus der E-Mail und lege dort dein neues Tracker-Passwort fest.</p>${back}`;
    } else {
      await changePassword(client, { userId: activeUser?.id, password: values.get('password'), confirmation: values.get('confirmation'), currentPassword: values.get('current'), recovery: form.dataset.recovery === 'yes' });
      form.reset(); sessionStorage.removeItem(recoveryKey); recoveryUser = null;
      root.innerHTML = `<h1>Passwort geändert.</h1><p role="status">Dein neues Tracker-Passwort ist gespeichert. Deine Spieldaten bleiben erhalten.</p><p class="account-actions"><a class="account-link" href="./">Zum Tracker</a></p>`;
    }
  } catch (error) {
    root.querySelector('#account-error').textContent = error.message;
    form.querySelectorAll('input[type="password"]').forEach(input => { input.value = ''; });
  } finally {
    submit.disabled = false; submit.removeAttribute('aria-busy');
  }
});

try {
  if (!config.supabaseUrl || !config.supabasePublishableKey) throw new Error('Der Live-Zugang ist noch nicht eingerichtet.');
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.81.1');
  client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && !isCallback)) {
      sessionStorage.removeItem(recoveryKey); recoveryUser = null;
    }
    if (event === 'PASSWORD_RECOVERY' && session?.user) {
      recoveryUser = session.user.id;
      sessionStorage.setItem(recoveryKey, recoveryUser);
      if (activeUser?.id === recoveryUser && !requestMode) passwordForm(true);
    }
  });
  const session = await client.auth.getSession();
  const verified = session.data?.session ? await client.auth.getUser() : null;
  activeUser = verified?.error ? null : verified?.data?.user;
  // Never retain auth tokens or errors in the visible URL.
  if (isCallback) history.replaceState(null, '', location.pathname);
  if (callbackError || (isCallback && (!activeUser || recoveryUser !== activeUser.id))) {
    resetForm('Dieser Rücksetzlink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
  } else if (requestMode || !activeUser) {
    resetForm();
  } else {
    const recovery = recoveryUser === activeUser.id || sessionStorage.getItem(recoveryKey) === activeUser.id;
    passwordForm(recovery);
  }
} catch {
  if (isCallback) history.replaceState(null, '', location.pathname);
  root.innerHTML = `<h1>Zugang nicht erreichbar</h1><p class="dialog-error" role="alert">Die Verbindung zu Supabase ist fehlgeschlagen. Bitte prüfe deine Internetverbindung und lade die Seite erneut.</p>${back}`;
}
