export const XP_PER_CHEST = 10;
export const XP_PER_LEVEL = 1000;
const titles = ['Deckmatrose', 'Truhensucher', 'Küstenläufer', 'Goldspäher', 'Freibeuter', 'Kompasshüter', 'Sturmsegler', 'Schatzjäger', 'Kanonier', 'Korsar', 'Gezeitenwächter', 'Nebelkapitän', 'Tiefseetaucher', 'Goldnavigator', 'Flottenadmiral', 'Krakenbezwinger', 'Geisterkapitän', 'Herr der Gezeiten', 'König der Meere', 'Piratenlegende'];
export const REWARDS = Object.freeze(titles.map((title, i) => Object.freeze({ level: i + 1, title, xp: (i + 1) * XP_PER_LEVEL, glyph: ['anchor', 'compass', 'flag', 'chest', 'trophy'][i % 5], rarity: i >= 14 ? 'legendary' : i >= 9 ? 'epic' : i >= 4 ? 'rare' : 'common' })));
export const MAX_LEVEL = REWARDS.length;
export const BASE_TITLE = Object.freeze({ level: 0, title: 'Crew-Anwärter', glyph: 'anchor', rarity: 'common' });

export function battlepassProgress(player) {
  const total = Number(player?.total), initial = Number(player?.initial_chests);
  const chests = Number.isSafeInteger(total) && Number.isSafeInteger(initial) && initial >= 0 ? Math.max(0, total - initial) : 0;
  const xp = Math.min(chests, Math.floor(Number.MAX_SAFE_INTEGER / XP_PER_CHEST)) * XP_PER_CHEST;
  const level = Math.min(MAX_LEVEL, Math.floor(xp / XP_PER_LEVEL));
  const complete = level === MAX_LEVEL;
  return { chests, xp, level, complete, inLevel: complete ? XP_PER_LEVEL : xp % XP_PER_LEVEL, remaining: complete ? 0 : XP_PER_LEVEL - xp % XP_PER_LEVEL, percent: complete ? 100 : (xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100, next: REWARDS[level] || null };
}
export function unlockedReward(player, level) {
  if (level === 0) return BASE_TITLE;
  if (!Number.isInteger(level) || level < 1 || level > battlepassProgress(player).level) return null;
  return REWARDS[level - 1] || null;
}
export function titleStorageKey(scope, actor) { return `pirate-tracker:battlepass-title:v1:${scope}:${actor}`; }
export function equippedReward(storage, key, player) {
  try { return unlockedReward(player, Number(storage.getItem(key) || 0)) || BASE_TITLE; }
  catch { return BASE_TITLE; }
}
export function equipReward(storage, key, player, level) {
  const reward = unlockedReward(player, level);
  if (!reward) throw new Error('Dieser Titel ist noch nicht freigeschaltet.');
  try { storage.setItem(key, String(reward.level)); }
  catch { throw new Error('Der Titel konnte in diesem Browser nicht gespeichert werden.'); }
  return reward;
}
