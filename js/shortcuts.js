export const SHORTCUT_STORAGE_KEY = 'pirate-tracker:shortcuts:v1';
export const DEFAULT_SHORTCUTS = Object.freeze({ max: 'm', szymon: 's', undo: 'u' });
const names = { ' ': 'Leertaste', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' };
export const defaultShortcuts = () => ({ version: 1, enabled: true, bindings: { ...DEFAULT_SHORTCUTS } });

export function normalizeShortcutKey(key) {
  if (typeof key !== 'string') return null;
  const normalized = key.toLowerCase();
  if (Object.hasOwn(names, normalized)) return normalized;
  return /^[\p{L}\p{N}]$/u.test(normalized) ? normalized : null;
}
export function shortcutLabel(key) { return names[key] || String(key).toUpperCase(); }
export function validateShortcuts(settings) {
  if (settings?.version !== 1 || typeof settings.enabled !== 'boolean') throw new Error('Ungültige Tastatureinstellung. Bitte den Standard wiederherstellen.');
  const bindings = {};
  for (const action of Object.keys(DEFAULT_SHORTCUTS)) {
    const key = normalizeShortcutKey(settings.bindings?.[action]);
    if (!key) throw new Error('Bitte einzelne Buchstaben, Ziffern, Pfeiltasten oder die Leertaste verwenden.');
    bindings[action] = key;
  }
  if (bindings.undo === bindings.max || bindings.undo === bindings.szymon) throw new Error('Rückgängig muss eine andere Taste als +1 verwenden.');
  return { version: 1, enabled: settings.enabled, bindings };
}
export function readShortcuts(storage) {
  try { return validateShortcuts(JSON.parse(storage.getItem(SHORTCUT_STORAGE_KEY))); }
  catch { return defaultShortcuts(); }
}
export function writeShortcuts(storage, settings) {
  const next = validateShortcuts(settings);
  storage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify(next));
  return next;
}
export function shortcutAction(event, settings, actor, { dialogOpen = false, editable = false, interactive = false } = {}) {
  if (!settings.enabled || !['max', 'szymon'].includes(actor) || dialogOpen || editable || event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = normalizeShortcutKey(event.key);
  // Space must keep its native activation on focused buttons and links.
  if (!key || (interactive && key === ' ')) return null;
  if (key === settings.bindings[actor]) return 'increment';
  if (key === settings.bindings.undo) return 'undo';
  return null;
}
