import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Activity, Profile } from '../src/types.ts';
import { activityLoadUA, estimate1RM, suggestedLoad, hrZone } from '../src/load.ts';
import { effortFromRpe, fatigueAt, impulsesForActivity, legFatigue, fatigueMapAt } from '../src/fatigue.ts';
import { buildTimeline, parseDay, addDays, pearson } from '../src/model.ts';
import { lowerBodyDecision } from '../src/regulation.ts';
import { strengthSessionsFromCsv, parseDateKey, feelingsFromCsv } from '../src/csv.ts';
import { findExercise } from '../src/exercises.ts';
import { fromStrava, mergeStrengthSessions } from '../src/strava.ts';

const P: Profile = { sexe: 'H', poidsKg: 75, fcMax: 190, fcRepos: 50, fcSeuil: 170 };
const at = (d: string, h = 9) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00Z`);
const run = (d: string, km: number, min: number, hr?: number, elev = 0): Activity =>
  ({ id: `r-${d}-${km}`, source: 'strava', sport: 'run', start: at(d), durationS: min * 60, distanceM: km * 1000, elevGainM: elev, avgHr: hr });

test('1 h à la FC seuil ≈ 100 UA', () => {
  assert.equal(Math.round(activityLoadUA(run('2026-01-01', 15, 60, 170), P)), 100);
});

test('sRPE : 60 min à RPE 7,5 ≈ 100 UA', () => {
  const a: Activity = { id: 'f', source: 'csv', sport: 'football', start: at('2026-01-01'), durationS: 3600, distanceM: 0, elevGainM: 0, rpe: 7.5 };
  assert.equal(Math.round(activityLoadUA(a, P)), 100);
});

test('zones FC', () => {
  assert.equal(hrZone(undefined, P), 2);
  assert.equal(hrZone(130, P), 1);
  assert.equal(hrZone(150, P), 2);
  assert.equal(hrZone(165, P), 4);
  assert.equal(hrZone(175, P), 5);
});

test('e1RM : 5 × 100 kg à RPE 8 ≈ 122 kg, séries trop longues ignorées', () => {
  const e = estimate1RM(100, 5, 8)!;
  assert.ok(e > 118 && e < 126, `e1RM = ${e}`);
  assert.equal(estimate1RM(50, 15), null);
  assert.equal(estimate1RM(0, 5), null);
  assert.equal(suggestedLoad(e, 5, 8), 100);
});

test('effort selon RPE : croissant et borné', () => {
  assert.equal(effortFromRpe(4), 0.25);
  assert.equal(effortFromRpe(10), 1);
  assert.ok(effortFromRpe(8.5) > effortFromRpe(8) && effortFromRpe(8.5) < effortFromRpe(9));
});

test('fatigue bornée 0-100 et décroissante dans le temps', () => {
  const imp = Array.from({ length: 30 }, (_, i) => impulsesForActivity(run(`2026-01-${String(i + 1).padStart(2, '0')}`, 30, 180, 175, 800), P)).flat();
  const f1 = fatigueAt(imp, 'quads', at('2026-01-30', 20));
  const f2 = fatigueAt(imp, 'quads', at('2026-02-02', 20));
  assert.ok(f1 <= 100 && f1 > 90, `f1 = ${f1}`);
  assert.ok(f2 < f1 && f2 >= 0);
  assert.equal(fatigueAt(imp, 'chest', at('2026-01-30', 20)) >= 0, true);
});

test('une sortie longue vallonnée fatigue plus les quadriceps qu’un footing', () => {
  const easy = impulsesForActivity(run('2026-01-01', 8, 45, 145), P);
  const long = impulsesForActivity(run('2026-01-01', 18, 105, 150, 300), P);
  const t = at('2026-01-02', 8);
  assert.ok(fatigueAt(long, 'quads', t) > fatigueAt(easy, 'quads', t) + 15);
});

test('le squat fatigue les quadriceps, le développé couché non', () => {
  const lift = (ex: string): Activity => ({ id: ex, source: 'csv', sport: 'strength', start: at('2026-01-01', 18), durationS: 3600, distanceM: 0, elevGainM: 0,
    sets: Array.from({ length: 5 }, () => ({ exercise: ex, loadKg: 100, reps: 5, rpe: 8 })) });
  const t = at('2026-01-02', 8);
  assert.ok(fatigueAt(impulsesForActivity(lift('Squat'), P), 'quads', t) > 20);
  assert.equal(fatigueAt(impulsesForActivity(lift('Développé couché'), P), 'quads', t), 0);
  assert.ok(fatigueAt(impulsesForActivity(lift('Développé couché'), P), 'chest', t) > 20);
});

test('fatigue jambes = moyenne pondérée des 4 compartiments', () => {
  const m = fatigueMapAt([], at('2026-01-01'));
  m.quads = 100; m.calves = 100; m.glutes = 100; m.hamstrings = 100;
  assert.equal(Math.round(legFatigue(m)), 100);
});

test('chronologie : ratio aigu/chronique ≈ 1 avec une charge stable', () => {
  const acts: Activity[] = [];
  const start = parseDay('2026-01-01');
  for (let i = 0; i < 120; i++) {
    const d = addDays(start, i).toISOString().slice(0, 10);
    acts.push(run(d, 10, 50, 150));
  }
  const { days } = buildTimeline(acts, P, addDays(start, 90), addDays(start, 119));
  assert.equal(days.length, 30);
  const last = days[days.length - 1];
  assert.ok(last.acwr! > 0.95 && last.acwr! < 1.05, `acwr = ${last.acwr}`);
  assert.ok(Math.abs(last.tsb) < 15);
});

test('règles de régulation bas du corps (doc 04 §4.3)', () => {
  assert.equal(lowerBodyDecision(20).action, 'inchangee');
  assert.equal(lowerBodyDecision(50).action, 'volume-20');
  assert.equal(lowerBodyDecision(70).action, 'volume-35');
  assert.equal(lowerBodyDecision(80).action, 'haut-du-corps');
});

test('CSV muscu : « ; », virgule décimale, dates FR, regroupement par séance', () => {
  const csv = 'date;heure;exercice;charge_kg;reps;rpe;duree_seance_min;rpe_seance\n'
    + '10/11/2026;18:30;Squat;102,5;5;8;60;7\n'
    + '10/11/2026;18:30;Squat;102,5;5;8,5;;\n'
    + '2026-11-12;;Tractions;0;8;;;\n'
    + ';;;;;;;\n';
  const { sessions, issues } = strengthSessionsFromCsv(csv);
  assert.equal(sessions.length, 2);
  const s = sessions.find(x => x.sets!.length === 2)!;
  assert.equal(s.sets![0].loadKg, 102.5);
  assert.equal(s.sets![1].rpe, 8.5);
  assert.equal(s.durationS, 3600);
  assert.equal(s.rpe, 7);
  assert.equal(issues.length, 1);
  assert.equal(parseDateKey('3/2/2026'), '2026-02-03');
  assert.equal(feelingsFromCsv('date,jambes\n2026-11-11,7').get('2026-11-11')!.legs, 7);
});

test('reconnaissance des exercices (accents, alias, variantes)', () => {
  assert.equal(findExercise('Soulevé de terre roumain')!.name, 'Soulevé de terre roumain');
  assert.equal(findExercise('RDL')!.name, 'Soulevé de terre roumain');
  assert.equal(findExercise('squat bulgare haltères')!.name, 'Squat bulgare');
  assert.equal(findExercise('DEVELOPPE COUCHE')!.name, 'Développé couché');
  assert.equal(findExercise('zzz'), undefined);
});

test('Strava : conversion et fusion avec la séance muscu du carnet', () => {
  const s = fromStrava({ id: 1, name: 'Muscu', sport_type: 'WeightTraining', start_date_local: '2026-11-10T18:20:00Z', moving_time: 3300, elapsed_time: 3600, distance: 0, total_elevation_gain: 0 });
  const r = fromStrava({ id: 2, name: 'Footing', sport_type: 'Run', start_date_local: '2026-11-11T07:00:00Z', moving_time: 2700, elapsed_time: 2800, distance: 8000, total_elevation_gain: 40, average_heartrate: 148, has_heartrate: true });
  assert.equal(s.sport, 'strength');
  assert.equal(r.avgHr, 148);
  const { sessions } = strengthSessionsFromCsv('date;exercice;charge_kg;reps;rpe\n2026-11-10;Squat;100;5;8');
  const merged = mergeStrengthSessions([s, r], sessions);
  assert.equal(merged.length, 2);
  const lift = merged.find(a => a.sport === 'strength')!;
  assert.equal(lift.sets!.length, 1);
  assert.equal(lift.durationS, 3300);
});

test('corrélation de Pearson', () => {
  assert.equal(pearson([1, 2, 3], [1, 2, 3]), null);
  assert.ok(Math.abs(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])! - 1) < 1e-9);
  assert.ok(pearson([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])! < -0.99);
});
