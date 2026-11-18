// Génère engine/.data/rapport.html : bilan de tes performances (volume par semaine et records).
// Usage : npm run rapport
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Activity, Profile } from '../src/types.ts';
import type { StravaSummary } from '../src/strava.ts';
import { fromStrava, mergeStrengthSessions } from '../src/strava.ts';
import { strengthSessionsFromCsv } from '../src/csv.ts';
import { addDays, dayKey, liftRecords, parseDay, runRecords, weeklySummary } from '../src/summary.ts';
import type { WeekSummary } from '../src/summary.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, '.data');
const OUT = join(DATA, 'rapport.html');
const warnings: string[] = [];

function readProfile(): Profile {
  const own = join(ROOT, 'profil.json');
  return existsSync(own) ? (JSON.parse(readFileSync(own, 'utf8')) as Profile) : {};
}

function readActivities(): Activity[] {
  const stravaPath = join(DATA, 'activities-strava.json');
  let strava: Activity[] = [];
  if (existsSync(stravaPath)) strava = (JSON.parse(readFileSync(stravaPath, 'utf8')) as StravaSummary[]).map(fromStrava);
  else warnings.push('Aucune activité Strava : lance d’abord « npm.cmd run strava ».');
  const csvPath = join(ROOT, 'data', 'muscu.csv');
  let csv: Activity[] = [];
  if (existsSync(csvPath)) {
    const { sessions, issues } = strengthSessionsFromCsv(readFileSync(csvPath, 'utf8'));
    csv = sessions;
    for (const i of issues) warnings.push(`data/muscu.csv ligne ${i.line} : ${i.message}`);
  } else {
    warnings.push('data/muscu.csv absent : pas de records de musculation (copie muscu.exemple.csv en muscu.csv).');
  }
  return mergeStrengthSessions(strava, csv);
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const fmtDay = (k: string) => { const d = parseDay(k); return `${JOURS[d.getUTCDay()]} ${k.slice(8, 10)}/${k.slice(5, 7)}`; };
const fmtShort = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`;
const SPORT_LABEL: Record<Activity['sport'], string> = {
  run: '🏃 Course', trail: '⛰️ Trail', strength: '🏋️ Muscu', football: '⚽ Foot', bike: '🚴 Vélo', walk: '🚶 Marche', other: '• Autre',
};

function describe(a: Activity): string {
  const parts: string[] = [];
  if (a.distanceM > 0) parts.push(`${(a.distanceM / 1000).toFixed(1)} km`);
  if (a.durationS > 0) parts.push(`${Math.round(a.durationS / 60)} min`);
  if ((a.sport === 'run' || a.sport === 'trail') && a.distanceM > 0 && a.durationS > 0) {
    const p = a.durationS / (a.distanceM / 1000);
    parts.push(`${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, '0')}/km`);
  }
  if (a.elevGainM >= 30) parts.push(`D+ ${Math.round(a.elevGainM)} m`);
  if (a.avgHr) parts.push(`FC ${Math.round(a.avgHr)}`);
  if (a.sets?.length) parts.push(`${a.sets.length} séries`);
  return esc(parts.join(' · '));
}

function chart(weeks: WeekSummary[]): string {
  const W = 960, H = 260, L = 44, R = 16, T = 16, B = 34;
  const iw = W - L - R, ih = H - T - B;
  const max = Math.max(10, ...weeks.map(w => w.runKm));
  const step = max > 60 ? 20 : max > 30 ? 10 : 5;
  const top = Math.ceil(max / step) * step;
  const y = (v: number) => T + ih - (v / top) * ih;
  const slot = iw / Math.max(weeks.length, 1);
  const bw = Math.min(36, slot * 0.6);
  const grid = Array.from({ length: top / step + 1 }, (_, i) => i * step).map(v =>
    `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`).join('');
  const bars = weeks.map((w, i) => {
    const cx = L + slot * i + slot / 2;
    const h = (w.runKm / top) * ih;
    const lift = w.liftSessions ? `<text x="${cx}" y="${T + ih - h - 6}" class="lift" text-anchor="middle">${'●'.repeat(Math.min(w.liftSessions, 5))}</text>` : '';
    return `<rect x="${cx - bw / 2}" y="${T + ih - h}" width="${bw}" height="${h}" rx="3" class="bar"><title>Semaine du ${fmtShort(w.week)} : ${w.runKm.toFixed(1)} km, ${w.liftSessions} séance(s) muscu</title></rect>${lift}`
      + (i % 2 === 0 ? `<text x="${cx}" y="${H - 12}" class="axis" text-anchor="middle">${fmtShort(w.week)}</text>` : '');
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kilomètres courus par semaine">${grid}${bars}</svg>`;
}

function html(activities: Activity[], weeks: WeekSummary[], from: Date, to: Date): string {
  const inRange = activities.filter(a => a.start >= from && a.start < addDays(to, 1)).sort((a, b) => b.start.getTime() - a.start.getTime());
  const runs = runRecords(inRange);
  const lifts = liftRecords(activities);
  const tot = weeks.reduce((s, w) => ({ km: s.km + w.runKm, runs: s.runs + w.runCount, lift: s.lift + w.liftSessions, other: s.other + w.otherSessions, ton: s.ton + w.tonnageKg }), { km: 0, runs: 0, lift: 0, other: 0, ton: 0 });
  const last4 = weeks.slice(-4);
  const avgKm4 = last4.reduce((s, w) => s + w.runKm, 0) / Math.max(last4.length, 1);
  const lastAct = inRange[0];
  const runRows = runs.map(r => `<tr><td>${esc(r.label)}</td><td class="num big">${esc(r.value)}</td><td class="nowrap">${fmtDay(r.date)}</td><td class="muted">${esc(r.activity)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="muted">Aucune course sur la période.</td></tr>';
  const liftRows = lifts.map(r => {
    const delta = r.lastE1rm - r.bestE1rm;
    return `<tr><td>${esc(r.exercise)}</td><td class="num big">${r.bestE1rm.toFixed(1)} kg</td><td class="num">${esc(r.bestSet)}</td><td class="nowrap">${fmtDay(r.bestE1rmDate)}</td><td class="num">${r.lastE1rm.toFixed(1)} kg ${delta < -0.05 ? `<span class="muted">(${delta.toFixed(1)})</span>` : '<span class="pr">record</span>'}</td><td class="num">${r.sessions}</td></tr>`;
  }).join('') || '<tr><td colspan="6" class="muted">Aucune série de musculation : remplis data/muscu.csv.</td></tr>';
  const actRows = inRange.slice(0, 40).map(a => `<tr><td class="nowrap">${fmtDay(dayKey(a.start))}</td><td class="nowrap">${SPORT_LABEL[a.sport]}</td><td>${esc(a.name ?? '')}</td><td class="num">${describe(a)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="muted">Aucune activité sur la période.</td></tr>';

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bilan HYBRID</title>
<style>
:root{--bg:#07090f;--s:#0f1420;--line:#243050;--fg:#e8edf5;--mut:#8a9bb6;--run:#00d4ff;--lift:#ff6b35;--ok:#3ddc84;--warn:#ffc04d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;padding:28px max(16px,3vw) 60px}
.wrap{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:24px}h1{margin:0;font-size:30px}h2{margin:0 0 10px;font-size:19px}
.muted{color:var(--mut)}.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.tile{background:var(--s);border:1px solid var(--line);border-radius:12px;padding:14px}.tile b{display:block;font-size:30px;font-variant-numeric:tabular-nums}.tile span{color:var(--mut);font-size:13px}
.card{background:var(--s);border:1px solid var(--line);border-radius:12px;padding:16px;overflow-x:auto}
svg{width:100%;min-width:600px;height:auto}.grid{stroke:var(--line)}.axis{fill:var(--mut);font-size:11px}.bar{fill:var(--run);opacity:.85}.lift{fill:var(--lift);font-size:10px;letter-spacing:1px}
.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--mut);margin-top:6px}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mut);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
tr:last-child td{border-bottom:0}.num{font-variant-numeric:tabular-nums;white-space:nowrap}.big{font-weight:700}.nowrap{white-space:nowrap}
.pr{color:var(--ok);font-size:12px;font-weight:700;margin-left:4px}
.warn{background:#ffc04d14;border:1px solid #ffc04d55;border-radius:12px;padding:12px 16px}.warn ul{margin:6px 0 0;padding-left:18px}
</style></head><body><div class="wrap">
<header><h1>Bilan HYBRID</h1><p class="muted">Du ${fmtDay(dayKey(from))} au ${fmtDay(dayKey(to))}</p></header>
${warnings.length ? `<div class="warn"><b>À savoir</b><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
<section class="tiles">
<div class="tile"><span>Course</span><b>${tot.km.toFixed(0)} km</b><span>${tot.runs} sorties</span></div>
<div class="tile"><span>Moyenne des 4 dernières semaines</span><b>${avgKm4.toFixed(1)} km</b><span>par semaine</span></div>
<div class="tile"><span>Musculation</span><b>${tot.lift}</b><span>séances · ${Math.round(tot.ton / 1000)} t soulevées</span></div>
<div class="tile"><span>Autres sports</span><b>${tot.other}</b><span>séances</span></div>
<div class="tile"><span>Dernière activité</span><b>${lastAct ? fmtShort(dayKey(lastAct.start)) : '–'}</b><span>${lastAct ? SPORT_LABEL[lastAct.sport] : 'aucune'}</span></div>
</section>
<section class="card"><h2>Kilomètres par semaine</h2>${chart(weeks)}<div class="legend"><span>Barres : km courus (semaine du lundi au dimanche)</span><span style="color:var(--lift)">● une séance de muscu</span></div></section>
<section class="card"><h2>Records de course (période)</h2><table><thead><tr><th>Record</th><th>Valeur</th><th>Date</th><th>Activité</th></tr></thead><tbody>${runRows}</tbody></table></section>
<section class="card"><h2>Records de musculation (1RM estimé)</h2><table><thead><tr><th>Exercice</th><th>Meilleur 1RM estimé</th><th>Série</th><th>Date</th><th>Dernière séance</th><th>Séances</th></tr></thead><tbody>${liftRows}</tbody></table></section>
<section class="card"><h2>Activités récentes</h2><table><thead><tr><th>Jour</th><th>Sport</th><th>Nom</th><th>Détails</th></tr></thead><tbody>${actRows}</tbody></table></section>
</div></body></html>`;
}

function openFile(path: string): void {
  const cmd = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { spawn(cmd, [path], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref(); } catch { /* chemin affiché */ }
}

function main(): void {
  const p = readProfile();
  const activities = readActivities();
  const nDays = p.jours && p.jours > 0 ? p.jours : 90;
  const now = new Date();
  const to = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const from = addDays(to, -(nDays - 1));
  const weeks = weeklySummary(activities, from, to);
  mkdirSync(DATA, { recursive: true });
  writeFileSync(OUT, html(activities, weeks, from, to));
  const km = weeks.reduce((s, w) => s + w.runKm, 0);
  console.log(`\n✅ Bilan : ${OUT}`);
  console.log(`   ${km.toFixed(0)} km courus sur ${nDays} jours.`);
  if (warnings.length) console.log(`   ℹ ${warnings.length} remarque(s) en haut du bilan.`);
  console.log('');
  openFile(OUT);
}

main();
