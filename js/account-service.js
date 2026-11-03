// No passwords or recovery tokens are persisted by this module.
export function authCallbackTarget(href) {
  const url = new URL(href), hash = new URLSearchParams(url.hash.slice(1));
  if (hash.get('type') !== 'recovery' && !hash.has('error_code') && !hash.has('error_description')) return null;
  const target = new URL('./account.html', url);
  target.hash = url.hash;
  return target.href;
}

export async function requestPasswordReset(client, email, redirectTo) {
  email = String(email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    if (error.status === 429 || /rate_limit/.test(error.code || '')) throw new Error('Zu viele E-Mails angefordert. Bitte später erneut versuchen.');
    if (error.status === 403 || error.code === 'email_address_not_authorized') throw new Error('Supabase erlaubt den E-Mail-Versand an diese Adresse noch nicht. Der Projektinhaber muss dafür einen eigenen SMTP-Versand einrichten.');
    throw new Error('Die Rücksetz-E-Mail konnte nicht angefordert werden. Bitte später erneut versuchen.');
  }
  // Same answer for known and unknown accounts.
  return 'Falls für diese Adresse ein Zugang besteht, erhältst du einen Link per E-Mail. Prüfe auch den Spamordner.';
}

export async function changePassword(client, { userId, password, confirmation, currentPassword, recovery = false }) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Das neue Passwort muss mindestens 12 Zeichen haben.');
  if (password !== confirmation) throw new Error('Die beiden neuen Passwörter stimmen nicht überein.');
  if (!userId) throw new Error('Bitte zuerst anmelden oder einen gültigen Rücksetzlink öffnen.');
  if (!recovery && !currentPassword) throw new Error('Bitte das bisherige Tracker-Passwort eingeben.');
  if (!recovery && password === currentPassword) throw new Error('Bitte ein anderes neues Passwort wählen.');
  const verified = await client.auth.getUser();
  if (verified.error || verified.data?.user?.id !== userId) throw new Error('Die Anmeldung hat sich geändert oder ist abgelaufen. Bitte die Seite neu öffnen.');
  if (!recovery) {
    const result = await client.auth.signInWithPassword({ email: verified.data.user.email, password: currentPassword });
    if (result.error || result.data?.user?.id !== userId) throw new Error('Das bisherige Tracker-Passwort ist nicht korrekt.');
  }
  const { error } = await client.auth.updateUser({ password });
  if (error) {
    if (error.code === 'same_password') throw new Error('Bitte ein anderes neues Passwort wählen.');
    if (error.code === 'weak_password') throw new Error('Supabase hat dieses Passwort abgelehnt. Bitte ein stärkeres Passwort wählen.');
    throw new Error('Das Passwort konnte nicht geändert werden. Bitte erneut anmelden oder einen neuen Rücksetzlink anfordern.');
  }
}
