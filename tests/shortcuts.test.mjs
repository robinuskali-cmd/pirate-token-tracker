import test from 'node:test';
import assert from 'node:assert/strict';
import { SHORTCUT_STORAGE_KEY, defaultShortcuts, normalizeShortcutKey, shortcutLabel, readShortcuts, writeShortcuts, shortcutAction } from '../js/shortcuts.js';
const storage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
const event = (key, extra = {}) => ({ key, ...extra });

test('Standardbelegung bleibt M / S / U und wird unabhängig kopiert', () => {
  const a = defaultShortcuts(), b = defaultShortcuts(); a.bindings.max = 'q';
  assert.equal(b.bindings.max, 'm');
  assert.deepEqual(readShortcuts(storage()), b);
});
test('Buchstaben, Ziffern, Pfeile und Leertaste werden konsistent erkannt', () => {
  assert.equal(normalizeShortcutKey('Q'), 'q');
  assert.equal(normalizeShortcutKey('Ä'), 'ä');
  assert.equal(normalizeShortcutKey('4'), '4');
  assert.equal(normalizeShortcutKey('ArrowUp'), 'arrowup');
  assert.equal(shortcutLabel('arrowup'), '↑');
  assert.equal(shortcutLabel(' '), 'Leertaste');
  for (const key of ['Enter', 'Tab', 'Escape', 'F5', 'Control', 'Dead', '+', 'two']) assert.equal(normalizeShortcutKey(key), null);
});
test('Gespeicherte Belegung und Ausschalten überstehen ein neues Lesen', () => {
  const memory = storage();
  const next = writeShortcuts(memory, { version: 1, enabled: false, bindings: { max: 'Q', szymon: 'ArrowDown', undo: 'Z' } });
  assert.deepEqual(readShortcuts(memory), { version: 1, enabled: false, bindings: { max: 'q', szymon: 'arrowdown', undo: 'z' } });
  assert.deepEqual(readShortcuts(memory), next);
});
test('Konflikte mit Rückgängig und ungültige Tasten überschreiben nichts', () => {
  const memory = storage(), before = writeShortcuts(memory, defaultShortcuts());
  assert.throws(() => writeShortcuts(memory, { ...before, bindings: { max: 'm', szymon: 's', undo: 'M' } }), /andere Taste/);
  assert.throws(() => writeShortcuts(memory, { ...before, bindings: { max: 'Enter', szymon: 's', undo: 'u' } }), /einzelne/);
  assert.deepEqual(readShortcuts(memory), before);
});
test('Beschädigter oder gesperrter Speicher fällt auf den Standard zurück; Schreibfehler bleiben sichtbar', () => {
  const memory = storage(); memory.setItem(SHORTCUT_STORAGE_KEY, '{broken');
  assert.deepEqual(readShortcuts(memory), defaultShortcuts());
  assert.deepEqual(readShortcuts({ getItem() { throw new Error('blocked'); } }), defaultShortcuts());
  assert.throws(() => writeShortcuts({ setItem() { throw new Error('quota'); } }, defaultShortcuts()), /quota/);
});
test('Neue Tasten zählen nur für den eigenen Spieler; gleiche +1-Taste für beide ist erlaubt', () => {
  const settings = writeShortcuts(storage(), { version: 1, enabled: true, bindings: { max: 'q', szymon: 'q', undo: 'z' } });
  assert.equal(shortcutAction(event('Q'), settings, 'max'), 'increment');
  assert.equal(shortcutAction(event('q'), settings, 'szymon'), 'increment');
  assert.equal(shortcutAction(event('m'), settings, 'max'), null);
  assert.equal(shortcutAction(event('z'), settings, 'max'), 'undo');
  assert.equal(shortcutAction(event('q'), settings, null), null);
  assert.equal(shortcutAction(event('s'), defaultShortcuts(), 'max'), null);
});
test('Eingaben, Dialoge, gehaltene Tasten, IME und Browser-Kombinationen zählen nicht', () => {
  const settings = defaultShortcuts();
  for (const flag of ['repeat', 'isComposing', 'ctrlKey', 'metaKey', 'altKey', 'defaultPrevented']) assert.equal(shortcutAction(event('m', { [flag]: true }), settings, 'max'), null);
  for (const flag of ['dialogOpen', 'editable']) assert.equal(shortcutAction(event('m'), settings, 'max', { [flag]: true }), null);
  assert.equal(shortcutAction(event('m'), { ...settings, enabled: false }, 'max'), null);
});
test('Leertaste aktiviert fokussierte Buttons weiterhin ohne zusätzliche Zählaktion', () => {
  const settings = { ...defaultShortcuts(), bindings: { max: ' ', szymon: 'arrowup', undo: 'u' } };
  assert.equal(shortcutAction(event(' '), settings, 'max'), 'increment');
  assert.equal(shortcutAction(event(' '), settings, 'max', { interactive: true }), null);
  assert.equal(shortcutAction(event('ArrowUp'), settings, 'szymon'), 'increment');
});
