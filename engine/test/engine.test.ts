import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Activity } from '../src/types.ts';
import { estimate1RM, suggestedLoad } from '../src/strength.ts';
import { strengthSessionsFromCsv, parseDateKey } from '../src/csv.ts';
import { findExercise } from '../src/exercises.ts';
import { fromStrava, mergeStrengthSessions } from '../src/strava.ts';
import { liftRecords, parseDay, runRecords, weekStart, weeklySummary, dayKey } from '../src/summary.ts';

const at = (d: string, h = 9) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00Z`);
const run = (d: string, km: number, min: number, elev = 0, name = 'Course'): Activity =>
  ({ id: `r-${d}-${km}`, source: 'strava', sport: 'run', name, start: at(d), durationS: min * 60, distanceM: km * 1000, elevGainM: elev });
const lift = (d: string, sets: Array<[string, number, number, number?]>): Activity =>
  ({ id: `l-${d}`, source: 'csv', sport: 'strength', start: at(d, 18), durationS: 3600, distanceM: 0, elevGainM: 0,
     sets: sets.map(([exercise, loadKg, reps, rpe]) => ({ exercise, loadKg, reps, rpe })) });

test('e1RM : 5 × 100 kg à RPE 8 ≈ 122 kg, séries trop longues ignorées', () => {
  const e = estimate1RM(100, 5, 8)!;
  assert.ok(e > 118 && e < 126, `e1RM = ${e}`);
  assert.equal(estimate1RM(50, 15), null);
  assert.equal(estimate1RM(0, 5), null);
  assert.equal(suggestedLoad(e, 5, 8), 100);
});

test('semaines : lundi comme début, semaines vides incluses', () => {
  assert.equal(dayKey(weekStart(parseDay('2026-11-18'))), '2026-11-16'); // mercredi → lundi
  assert.equal(dayKey(weekStart(parseDay('2026-11-16'))), '2026-11-16');
  assert.equal(dayKey(weekStart(parseDay('2026-11-22'))), '2026-11-16'); // dimanche → lundi
  const weeks = weeklySummary([run('2026-11-03', 10, 55), run('2026-11-05', 6, 33), lift('2026-11-18', [['Squat', 100, 5, 8]])],
    parseDay('2026-11-01'), parseDay('2026-11-18'));
  assert.deepEqual(weeks.map(w => w.week), ['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16']);
  assert.equal(weeks[1].runCount, 2);
  assert.equal(weeks[1].runKm, 16);
  assert.equal(weeks[2].runKm, 0);
  assert.equal(weeks[3].liftSessions, 1);
  assert.equal(weeks[3].tonnageKg, 500);
});

test('records de course', () => {
  const recs = runRecords([run('2026-11-01', 8, 40), run('2026-11-05', 12, 66, 250, 'Longue'), run('2026-11-08', 5.2, 24, 0, 'Rapide')]);
  const get = (l: string) => recs.find(r => r.label === l)!;
  assert.equal(get('Plus longue sortie').value, '12.0 km');
  assert.equal(get('Meilleure allure sur ≥ 5 km').value, '4:37/km');
  assert.equal(get('Meilleure allure sur ≥ 10 km').date, '2026-11-05');
  assert.equal(recs.find(r => r.label === 'Meilleure allure sur ≥ 21.1 km'), undefined);
  assert.equal(get('Plus gros dénivelé').value, '250 m D+');
});

test('records de musculation : regroupés par exercice du catalogue', () => {
  const recs = liftRecords([
    lift('2026-11-01', [['back squat', 100, 5, 8], ['DC', 70, 6, 8]]),
    lift('2026-11-08', [['Squat', 105, 5, 9], ['Squat', 95, 5, 7]]),
  ]);
  const squat = recs.find(r => r.exercise === 'Squat')!;
  assert.equal(squat.sessions, 2);
  assert.equal(squat.bestE1rmDate, '2026-11-08');
  assert.equal(squat.bestSet, '5 × 105 kg @ RPE 9');
  assert.equal(squat.lastE1rm, squat.bestE1rm);
  assert.ok(recs.find(r => r.exercise === 'Développé couché'));
});

test('CSV muscu : « ; », virgule décimale, dates FR, regroupement par séance', () => {
  const csv = 'date;heure;exercice;charge_kg;reps;rpe;duree_seance_min\n'
    + '10/11/2026;18:30;Squat;102,5;5;8;60\n'
    + '10/11/2026;18:30;Squat;102,5;5;8,5;\n'
    + '2026-11-12;;Tractions;0;8;;\n'
    + ';;;;;;\n';
  const { sessions, issues } = strengthSessionsFromCsv(csv);
  assert.equal(sessions.length, 2);
  const s = sessions.find(x => x.sets!.length === 2)!;
  assert.equal(s.sets![0].loadKg, 102.5);
  assert.equal(s.sets![1].rpe, 8.5);
  assert.equal(s.durationS, 3600);
  assert.equal(issues.length, 1);
  assert.equal(parseDateKey('3/2/2026'), '2026-02-03');
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
  const l = merged.find(a => a.sport === 'strength')!;
  assert.equal(l.sets!.length, 1);
  assert.equal(l.durationS, 3300);
});
