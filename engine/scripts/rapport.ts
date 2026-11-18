// Génère engine/.data/rapport.html : fatigue des jambes jour par jour, comparée à ton ressenti.
// Usage : npm run rapport
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Activity, DayMetrics, Profile } from '../src/types.ts';
import type { StravaSummary } from '../src/strava.ts';
import { fromStrava, mergeStrengthSessions } from '../src/strava.ts';
import { feelingsFromCsv, strengthSessionsFromCsv } from '../src/csv.ts';
import { addDays, buildTimeline, dayKey, parseDay, pearson } from '../src/model.ts';
import { lowerBodyDecision } from '../src/regulation.ts';
import { activityLoadUA } from '../src/load.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, '.data');
const OUT = join(DATA, 'rapport.html');

const warnings: string[] = [];

function readProfile(): Profile {
  const own = join(ROOT, 'profil.json');
  const path = existsSync(own) ? own : join(ROOT, 'profil.exemple.json');
  if (path !== own) warnings.push('profil.json absent : valeurs d’exemple utilisées (FC max 190, FC repos 55). Copie profil.exemple.json en profil.json et mets tes vraies valeurs.');
  const p = JSON.parse(readFileSync(path, 'utf8')) as Profile;
  if (!(p.fcMax > p.fcRepos)) throw new Error('profil.json : fcMax doit être supérieure à fcRepos.');
  return p;
}

function readActivities(): Activity[] {
  const stravaPath = join(DATA, 'activities-strava.json');
  let strava: Activity[] = [];
  if (existsSync(stravaPath)) {
    strava = (JSON.parse(readFileSync(stravaPath, 'utf8')) as StravaSummary[]).map(fromStrava);
  } else {
    warnings.push('Aucune activité Strava : lance d’abord « npm run strava ».');
  }
  const csvPath = join(ROOT, 'data', 'muscu.csv');
  let csv: Activity[] = [];
  if (existsSync(csvPath)) {
    const { sessions, issues } = strengthSessionsFromCsv(readFileSync(csvPath, 'utf8'));
    csv = sessions;
    for (const i of issues) warnings.push(`data/muscu.csv ligne ${i.line} : ${i.message}`);
  } else {
    warnings.push('data/muscu.csv absent : les séances muscu sont estimées sans le détail des séries (copie muscu.exemple.csv en muscu.csv).');
  }
  return mergeStrengthSessions(strava, csv);
}

function readFeelings() {
  const path = join(ROOT, 'data', 'ressenti.csv');
  if (!existsSync(path)) {
    warnings.push('data/ressenti.csv absent : sans ressenti, impossible de vérifier si la courbe colle à la réalité.');
    return new Map<string, { legs: number; note?: string }>();
  }
  return feelingsFromCsv(readFileSync(path, 'utf8'));
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const r0 = (x: number) => Math.round(x).toString();
const SPORT_LABEL: Record<Activity['sport'], string> = {
  run: '🏃 Course', trail: '⛰️ Trail', strength: '🏋️ Muscu', football: '⚽ Foot', bike: '🚴 Vélo', walk: '🚶 Marche', other: '• Autre',
};
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const fmtDay = (k: string) => { const d = parseDay(k); return `${JOURS[d.getUTCDay()]} ${k.slice(8, 10)}/${k.slice(5, 7)}`; };

function describe(a: Activity, p: Profile): string {
  const parts = [SPORT_LABEL[a.sport]];
  if (a.distanceM > 0) parts.push(`${(a.distanceM / 1000).toFixed(1)} km`);
  if (a.durationS > 0) parts.push(`${Math.round(a.durationS / 60)} min`);
  if (a.elevGainM >= 50) parts.push(`D+ ${Math.round(a.elevGainM)} m`);
  if (a.avgHr) parts.push(`FC ${Math.round(a.avgHr)}`);
  if (a.sets?.length) parts.push(`${a.sets.length} séries`);
  parts.push(`${r0(activityLoadUA(a, p))} UA`);
  return esc(parts.join(' · '));
}

function chart(days: DayMetrics[], feelings: Map<string, { legs: number }>): string {
  const W = 960, H = 320, L = 44, R = 16, T = 16, B = 40;
  const iw = W - L - R, ih = H - T - B;
  const n = days.length;
  const x = (i: number) => L + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => T + ih - (v / 100) * ih;
  const maxUA = Math.max(100, ...days.map(d => d.uaTotal));
  const bw = Math.max(2, iw / Math.max(n, 1) * 0.6);
  const grid = [0, 25, 50, 75, 100].map(v =>
    `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`).join('');
  const bands = `<rect x="${L}" y="${y(75)}" width="${iw}" height="${y(60) - y(75)}" class="band-hi"/><rect x="${L}" y="${y(100)}" width="${iw}" height="${y(75) - y(100)}" class="band-max"/>`;
  const bars = days.map((d, i) => {
    if (d.uaTotal <= 0) return '';
    const h = (d.uaTotal / maxUA) * ih * 0.35;
    const cls = d.uaLift > d.uaRun ? 'bar-lift' : 'bar-run';
    return `<rect x="${x(i) - bw / 2}" y="${T + ih - h}" width="${bw}" height="${h}" class="${cls}"><title>${d.date} : ${r0(d.uaTotal)} UA</title></rect>`;
  }).join('');
  const line = (vals: number[], cls: string) =>
    `<polyline class="${cls}" points="${vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
  const dots = days.map((d, i) => {
    const f = feelings.get(d.date);
    return f ? `<circle cx="${x(i)}" cy="${y(f.legs * 10)}" r="4" class="feel"><title>${d.date} : ressenti ${f.legs}/10</title></circle>` : '';
  }).join('');
  const ticks = days.map((d, i) => (i % 7 === 0 ? `<text x="${x(i)}" y="${H - 14}" class="axis" text-anchor="middle">${d.date.slice(8, 10)}/${d.date.slice(5, 7)}</text>` : '')).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Fatigue des jambes et fatigue générale, jour par jour">${bands}${grid}${bars}${line(days.map(d => d.fatigue.systemic), 'sys')}${line(days.map(d => d.leg), 'leg')}${dots}${ticks}</svg>`;
}

function verdict(r: number | null, n: number): string {
  if (r === null) return `<p class="muted">Pas assez de ressentis pour comparer (${n} jour(s) noté(s), il en faut au moins 5 ; vise 3 à 4 semaines).</p>`;
  const v = r >= 0.5 ? ['ok', 'La courbe colle bien à ton ressenti.'] : r >= 0.3 ? ['mid', 'La courbe suit ton ressenti, mais avec des écarts : on ajustera les constantes.'] : ['bad', 'La courbe ne colle pas encore à ton ressenti : on va calibrer le modèle ensemble.'];
  return `<p class="verdict ${v[0]}"><b>Corrélation ${r.toFixed(2)}</b> sur ${n} jours notés. ${v[1]}</p>`;
}

function html(days: DayMetrics[], feelings: Map<string, { legs: number; note?: string }>, p: Profile, unknown: string[]): string {
  const today = days[days.length - 1];
  const paired = days.filter(d => feelings.has(d.date));
  const r = pearson(paired.map(d => d.leg), paired.map(d => feelings.get(d.date)!.legs));
  const last = days.slice(-35).reverse();
  const totals = days.reduce((s, d) => ({ run: s.run + d.uaRun, lift: s.lift + d.uaLift, other: s.other + d.uaOther }), { run: 0, lift: 0, other: 0 });
  const rows = last.map(d => {
    const f = feelings.get(d.date);
    const dec = lowerBodyDecision(d.leg);
    const acts = d.activities.map(a => `<div>${describe(a, p)}</div>`).join('') || '<span class="muted">Repos</span>';
    const lvl = d.leg >= 75 ? 'max' : d.leg >= 60 ? 'hi' : d.leg >= 40 ? 'mid' : 'lo';
    return `<tr><td class="nowrap">${fmtDay(d.date)}</td><td class="num"><span class="pill ${lvl}">${r0(d.leg)}</span></td><td class="num">${f ? `${f.legs}/10` : '<span class="muted">–</span>'}</td><td class="num">${r0(d.fatigue.quads)} · ${r0(d.fatigue.calves)} · ${r0(d.fatigue.hamstrings)} · ${r0(d.fatigue.glutes)}</td><td class="num">${r0(d.fatigue.systemic)}</td><td class="num">${d.acwr === null ? '–' : d.acwr.toFixed(2)}</td><td>${dec.label}</td><td class="acts">${acts}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rapport fatigue HYBRID</title>
<style>
:root{--bg:#07090f;--s:#0f1420;--s2:#161d2c;--line:#243050;--fg:#e8edf5;--mut:#8a9bb6;--run:#00d4ff;--lift:#ff6b35;--ok:#3ddc84;--warn:#ffc04d;--bad:#ff5d6c;--ai:#a78bfa}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;padding:28px max(16px,3vw) 60px}
.wrap{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:26px}h1{margin:0;font-size:30px;letter-spacing:.02em}h2{margin:0 0 10px;font-size:19px}
.muted{color:var(--mut)}.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.tile{background:var(--s);border:1px solid var(--line);border-radius:12px;padding:14px}.tile b{display:block;font-size:30px;font-variant-numeric:tabular-nums}.tile span{color:var(--mut);font-size:13px}
.card{background:var(--s);border:1px solid var(--line);border-radius:12px;padding:16px;overflow-x:auto}
svg{width:100%;min-width:640px;height:auto}.grid{stroke:var(--line);stroke-width:1}.axis{fill:var(--mut);font-size:11px}
.leg{fill:none;stroke:var(--lift);stroke-width:2.5}.sys{fill:none;stroke:var(--run);stroke-width:1.5;stroke-dasharray:4 3}.feel{fill:var(--ai);stroke:var(--bg);stroke-width:1.5}
.bar-run{fill:var(--run);opacity:.28}.bar-lift{fill:var(--lift);opacity:.28}.band-hi{fill:var(--warn);opacity:.06}.band-max{fill:var(--bad);opacity:.07}
.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--mut);margin-top:8px}.legend i{display:inline-block;width:14px;height:3px;margin-right:6px;vertical-align:middle}
table{border-collapse:collapse;width:100%;min-width:900px;font-size:13.5px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--mut);font-weight:500;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.num{font-variant-numeric:tabular-nums;white-space:nowrap}.nowrap{white-space:nowrap}.acts div{white-space:nowrap}
.pill{display:inline-block;min-width:36px;text-align:center;border-radius:99px;padding:1px 8px;font-weight:700}.pill.lo{background:#3ddc8424;color:var(--ok)}.pill.mid{background:#ffc04d24;color:var(--warn)}.pill.hi{background:#ff6b3530;color:var(--lift)}.pill.max{background:#ff5d6c30;color:var(--bad)}
.verdict{padding:10px 14px;border-radius:10px;margin:0}.verdict.ok{background:#3ddc841f}.verdict.mid{background:#ffc04d1f}.verdict.bad{background:#ff5d6c1f}
.warn{background:#ffc04d14;border:1px solid #ffc04d55;border-radius:12px;padding:12px 16px}.warn ul{margin:6px 0 0;padding-left:18px}
</style></head><body><div class="wrap">
<header><h1>Rapport fatigue HYBRID</h1><p class="muted">Du ${fmtDay(days[0].date)} au ${fmtDay(today.date)} · fatigue mesurée chaque matin à 8 h · prototype moteur v0.1</p></header>
${warnings.length || unknown.length ? `<div class="warn"><b>À vérifier</b><ul>${warnings.map(w => `<li>${esc(w)}</li>`).join('')}${unknown.length ? `<li>Exercices non reconnus (comptés « corps entier ») : ${esc(unknown.join(', '))}</li>` : ''}</ul></div>` : ''}
<section class="tiles">
<div class="tile"><span>Fatigue jambes ce matin</span><b>${r0(today.leg)}</b><span>${esc(lowerBodyDecision(today.leg).label)}</span></div>
<div class="tile"><span>Fatigue générale</span><b>${r0(today.fatigue.systemic)}</b><span>sur 100</span></div>
<div class="tile"><span>Forme (CTL) · fraîcheur (TSB)</span><b>${r0(today.ctl)} · ${today.tsb >= 0 ? '+' : ''}${r0(today.tsb)}</b><span>UA / jour</span></div>
<div class="tile"><span>Ratio aigu / chronique</span><b>${today.acwr === null ? '–' : today.acwr.toFixed(2)}</b><span>zone conseillée 0,8 – 1,3</span></div>
<div class="tile"><span>Charge sur la période</span><b>${r0(totals.run + totals.lift + totals.other)}</b><span>course ${r0(totals.run)} · muscu ${r0(totals.lift)} · autre ${r0(totals.other)}</span></div>
</section>
<section class="card"><h2>Fatigue des jambes, jour par jour</h2>${chart(days, feelings)}
<div class="legend"><span><i style="background:var(--lift)"></i>Fatigue jambes (0-100)</span><span><i style="background:var(--run)"></i>Fatigue générale</span><span><i style="background:var(--ai);height:8px;width:8px;border-radius:50%"></i>Ton ressenti × 10</span><span>Barres : charge du jour (cyan = course, orange = muscu)</span><span>Bandes : 60-75 alléger fort · 75+ pas de jambes</span></div></section>
<section class="card"><h2>Est-ce que ça colle à ton ressenti ?</h2>${verdict(r, paired.length)}</section>
<section class="card"><h2>Les 5 dernières semaines</h2><table><thead><tr><th>Jour</th><th>Jambes</th><th>Ressenti</th><th>Quadri · mollets · ischios · fessiers</th><th>Générale</th><th>Ratio</th><th>Si séance jambes ce jour-là</th><th>Activités</th></tr></thead><tbody>${rows}</tbody></table></section>
<p class="muted">Constantes du modèle : doc 04 §4.2 (quadriceps et ischios τ = 36 h, mollets et fessiers τ = 30 h). Les 3 premières semaines, la forme chronique (CTL) est sous-estimée faute d’historique.</p>
</div></body></html>`;
}

function openFile(path: string): void {
  const cmd = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { spawn(cmd, [path], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref(); } catch { /* chemin affiché */ }
}

function main(): void {
  const p = readProfile();
  const activities = readActivities();
  const feelings = readFeelings();
  const nDays = p.jours && p.jours > 0 ? p.jours : 90;
  const now = new Date();
  const to = parseDay(dayKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))));
  const from = addDays(to, -(nDays - 1));
  const { days, unknownExercises } = buildTimeline(activities, p, from, to);
  mkdirSync(DATA, { recursive: true });
  writeFileSync(OUT, html(days, feelings, p, unknownExercises));
  const today = days[days.length - 1];
  console.log(`\n✅ Rapport : ${OUT}`);
  console.log(`   Fatigue jambes ce matin : ${r0(today.leg)}/100 → ${lowerBodyDecision(today.leg).label}`);
  if (warnings.length) console.log(`   ⚠ ${warnings.length} point(s) à vérifier, détaillés en haut du rapport.`);
  console.log('');
  openFile(OUT);
}

main();
