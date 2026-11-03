import { number, roundSeconds, roundTotal } from './core.js';
export function dailyChart(state, days = 7) {
  const list = Array.from({ length: days }, (_, i) => {
    const date = new Date(); date.setUTCDate(date.getUTCDate() - days + 1 + i);
    const day = date.toISOString().slice(0, 10);
    return { day, label: date.toLocaleDateString('de-DE', { weekday: 'short', timeZone: 'UTC' }), max: Number(state.daily.find(x => x.day === day && x.player_id === 'max')?.chests || 0), szymon: Number(state.daily.find(x => x.day === day && x.player_id === 'szymon')?.chests || 0) };
  });
  const top = Math.max(10, ...list.map(x => Math.max(x.max, x.szymon)));
  const low = Math.min(0, ...list.map(x => Math.min(x.max, x.szymon)));
  const W = 520, H = 164, left = 30, bottom = 137, plot = 480;
  const y = value => bottom - (value - low) / (top - low) * 110;
  const rows = [0, .5, 1].map(ratio => `<line class="grid" x1="${left}" x2="${W}" y1="${bottom - ratio * 110}" y2="${bottom - ratio * 110}"/><text x="0" y="${bottom - ratio * 110 + 3}">${Math.round(low + (top-low) * ratio)}</text>`).join('');
  const gap = plot / days, bar = Math.min(13, gap / 4);
  const bars = list.map((day, i) => {
    const x = left + gap * (i + .5);
    return `<g><title>${day.day}: Max ${day.max}, Szymon ${day.szymon} Truhen</title>${['max','szymon'].map((id,j) => `<rect x="${x + (j ? 2 : -bar - 2)}" y="${Math.min(y(0),y(day[id]))}" width="${bar}" height="${Math.max(1.5, Math.abs(y(day[id])-y(0)))}" rx="2" fill="${j ? '#93acb0' : '#bca77b'}" opacity="${day[id] ? '.95' : '.25'}"/>`).join('')}<text text-anchor="middle" x="${x}" y="158">${days > 7 ? day.day.slice(8) : day.label}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Täglich erfasste Truhen der letzten ${days} Tage, nach UTC. ${list.map(d => `${d.day}: Max ${d.max}, Szymon ${d.szymon}`).join('; ')}">${rows}${bars}</svg>${list.every(d => !d.max && !d.szymon) ? '<p class="chart-empty">Deine nächsten Truhen schreiben hier Geschichte.</p>' : ''}<div class="chart-legend"><span><i></i>Max</span><span><i class="steel"></i>Szymon</span><span>Erfassungsdatum · UTC · inkl. Korrekturen</span></div>`;
}
export function rateChart(state) {
  const rounds = state.rounds.filter(r => r.ended_at && roundSeconds(state, r) >= 1 && !(r.manual && !state.counts.some(c => c.round_id === r.id && c.duration_seconds))).slice(0,12).reverse();
  if (!rounds.length) return '<div class="empty"><p>Nach der ersten abgeschlossenen Runde mit Dauer siehst du hier eure Farmgeschwindigkeit.</p></div>';
  const values = rounds.map(r => roundTotal(state, r.id) / roundSeconds(state,r) * 3600);
  const top = Math.max(10,...values), step = 460 / Math.max(1, values.length - 1);
  const points = values.map((v,i) => `${40 + i * step},${145 - v / top * 115}`);
  return `<svg class="chart" viewBox="0 0 530 175" role="img" aria-label="Truhen pro Stunde je Runde: ${values.map(number).join(', ')}"><line class="grid" x1="40" x2="510" y1="145" y2="145"/><line class="grid" x1="40" x2="510" y1="30" y2="30"/><text x="2" y="33">${Math.round(top)}</text><text x="14" y="149">0</text><polyline points="${points.join(' ')}" fill="none" stroke="#bca77b" stroke-width="2.5"/>${points.map((p,i) => { const [x,y] = p.split(','); return `<circle cx="${x}" cy="${y}" r="4" fill="#bca77b"><title>Runde ${i+1}: ${number(values[i])} Truhen/h</title></circle><text x="${x}" y="168" text-anchor="middle">${i+1}</text>`; }).join('')}</svg><p class="tab-note">Teamtempo pro Runde, auf eine Stunde hochgerechnet. Die letzten zwölf Runden.</p>`;
}
