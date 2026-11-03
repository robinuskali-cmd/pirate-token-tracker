import test from 'node:test';
import assert from 'node:assert/strict';
import { authCallbackTarget, changePassword, requestPasswordReset } from '../js/account-service.js';

function fakeAuth(overrides = {}) {
  const calls = [];
  const user = { id: 'test-user', email: 'player@example.test' };
  const auth = {
    getUser: async () => { calls.push('verify'); return { data: { user } }; },
    signInWithPassword: async input => { calls.push(['reauth', input]); return { data: { user } }; },
    updateUser: async input => { calls.push(['update', input]); return {}; },
    resetPasswordForEmail: async (...input) => { calls.push(['reset', ...input]); return {}; },
    ...overrides,
  };
  return { client: { auth }, calls };
}
const valid = { userId: 'test-user', password: 'new-test-password', confirmation: 'new-test-password', currentPassword: 'old-test-password' };

test('Rücksetzlinks behalten Tokens nur im Fragment und bleiben im Website-Unterpfad', () => {
  assert.equal(authCallbackTarget('https://example.test/crew/#settings'), null);
  assert.equal(authCallbackTarget('https://example.test/crew/#overview'), null);
  assert.equal(authCallbackTarget('https://example.test/crew/#type=recovery&access_token=fake'), 'https://example.test/crew/account.html#type=recovery&access_token=fake');
  assert.equal(authCallbackTarget('https://example.test/crew/#error_code=otp_expired'), 'https://example.test/crew/account.html#error_code=otp_expired');
});
test('Ungültige oder unterschiedliche neue Passwörter erreichen keine Auth-API', async () => {
  const { client, calls } = fakeAuth();
  await assert.rejects(changePassword(client, { ...valid, password: 'short' }), /12 Zeichen/);
  await assert.rejects(changePassword(client, { ...valid, confirmation: 'different-password' }), /nicht überein/);
  await assert.rejects(changePassword(client, { ...valid, currentPassword: '' }), /bisherige/);
  assert.deepEqual(calls, []);
});
test('Normale Änderung prüft zuerst die aktuelle Anmeldung und das bisherige Passwort', async () => {
  const { client, calls } = fakeAuth();
  await changePassword(client, valid);
  assert.deepEqual(calls, ['verify', ['reauth', { email: 'player@example.test', password: valid.currentPassword }], ['update', { password: valid.password }]]);
});
test('Fehlgeschlagene Neuanmeldung verhindert das Speichern', async () => {
  const { client, calls } = fakeAuth({ signInWithPassword: async () => ({ error: { message: 'bad password' } }) });
  await assert.rejects(changePassword(client, valid), /nicht korrekt/);
  assert.deepEqual(calls, ['verify']);
});
test('Abgelaufene oder gewechselte Sitzung verhindert Passwortänderungen', async () => {
  const { client, calls } = fakeAuth({ getUser: async () => ({ data: { user: { id: 'other-user' } } }) });
  await assert.rejects(changePassword(client, valid), /Anmeldung hat sich geändert/);
  assert.deepEqual(calls, []);
});
test('Rücksetzmodus benötigt eine serverseitig bestätigte Sitzung', async () => {
  const { client, calls } = fakeAuth();
  await changePassword(client, { ...valid, recovery: true, currentPassword: null });
  assert.deepEqual(calls, ['verify', ['update', { password: valid.password }]]);
  const invalid = fakeAuth({ getUser: async () => ({ error: { message: 'expired' } }) });
  await assert.rejects(changePassword(invalid.client, { ...valid, recovery: true }), /abgelaufen/);
});
test('Rücksetz-Anfrage validiert die Adresse und verwendet genau die erlaubte Zielseite', async () => {
  const { client, calls } = fakeAuth();
  await assert.rejects(requestPasswordReset(client, 'invalid', 'https://example.test/crew/account.html'), /E-Mail/);
  assert.deepEqual(calls, []);
  const message = await requestPasswordReset(client, ' player@example.test ', 'https://example.test/crew/account.html');
  assert.deepEqual(calls, [['reset', 'player@example.test', { redirectTo: 'https://example.test/crew/account.html' }]]);
  assert.match(message, /Falls für diese Adresse/);
});
test('SMTP-Beschränkungen und Ratenlimits erscheinen als handlungsfähige Fehler', async () => {
  await assert.rejects(requestPasswordReset(fakeAuth({ resetPasswordForEmail: async () => ({ error: { status: 403 } }) }).client, 'player@example.test', 'https://example.test/'), /SMTP/);
  await assert.rejects(requestPasswordReset(fakeAuth({ resetPasswordForEmail: async () => ({ error: { status: 429 } }) }).client, 'player@example.test', 'https://example.test/'), /später/);
});
