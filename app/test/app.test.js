import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RACE, SESSIONS, PLAN_START, planWeek, mondayOf, sessionsOfWeek, sessionsWithMoves, nextSession, addDaysKey, daysBetween, formatDay,
} from '../public/js/plan.js';
import {
  fmtPace, fmtDuration, e1rm, suggestLoad, nextSetLoad, liftRecords, newRecords, weeklyKm, runRecords, predictRace, matchRun, streak,
} from '../public/js/stats.js';
import worker from '../worker/index.js';

const run = (id, day, km, min, type = 'Run') => ({ id, name: `Course ${id}`, sport_type: type, start_date_local: `${day}T08:00:00Z`, distance: km * 1000, moving_time: min * 60 });

test('plan : 7 semaines, du lundi 23 novembre au samedi 9 janvier', () => {
  assert.equal(PLAN_START, '2026-11-23');
  assert.equal(mondayOf(PLAN_START), PLAN_START);
  assert.equal(SESSIONS[SESSIONS.length - 1].date, RACE.date);
  assert.ok(SESSIONS[SESSIONS.length - 1].race);
  assert.equal(planWeek('2026-11-19'), 0);
  assert.equal(planWeek('2026-11-23'), 1);
  assert.equal(planWeek('2027-01-09'), 7);
  assert.equal(daysBetween('2026-11-19', RACE.date), 51);
  assert.equal(formatDay('2027-01-09'), 'samedi 9 janvier');
  assert.equal(formatDay('2026-11-23', { short: true }), 'Lun 23 nov.');
});

test('plan : chaque semaine a 1 muscu (sauf l’affûtage) et 2 courses obligatoires au moins', () => {
  for (let w = 1; w <= 7; w++) {
    const monday = addDaysKey(PLAN_START, (w - 1) * 7);
    const s = sessionsOfWeek(monday, {});
    const runs = s.filter(x => x.sport === 'run' && !x.optional);
    const muscu = s.filter(x => x.sport === 'muscu');
    assert.ok(runs.length >= 2, `semaine ${w} : ${runs.length} courses`);
    assert.equal(muscu.length, w === 7 ? 0 : 1, `semaine ${w}`);
  }
  // Ids uniques et dates triées
  assert.equal(new Set(SESSIONS.map(s => s.id)).size, SESSIONS.length);
});

test('plan : déplacer une séance et trouver la suivante', () => {
  const moved = sessionsWithMoves({ 'run-2026-11-24': '2026-11-25' });
  assert.equal(moved.find(s => s.id === 'run-2026-11-24').date, '2026-11-25');
  assert.equal(moved.find(s => s.id === 'run-2026-11-24').movedFrom, '2026-11-24');
  assert.equal(nextSession('2026-11-26', {}).id, 'run-2026-11-29'); // saute la séance optionnelle du vendredi
});

test('formats', () => {
  assert.equal(fmtPace(310), '5:10');
  assert.equal(fmtPace(299.7), '5:00');
  assert.equal(fmtDuration(41 * 60 + 20), '41:20');
  assert.equal(fmtDuration(3725), '1:02:05');
});

test('muscu : 1RM, charge proposée, ajustement entre séries', () => {
  assert.ok(Math.abs(e1rm(100, 5, 8) - 122.4) < 1);
  const workouts = [{ id: 'a', date: '2026-11-26', endedAt: 1, sets: [
    { exerciseId: 'squat', name: 'Squat', kg: 60, reps: 8, feel: 'facile' },
    { exerciseId: 'squat', name: 'Squat', kg: 60, reps: 8, feel: 'facile' },
  ] }];
  assert.deepEqual(suggestLoad('squat', workouts).kg, 62.5);
  workouts[0].sets[1].feel = 'dur';
  assert.equal(suggestLoad('squat', workouts).kg, 60);
  assert.equal(suggestLoad('mollets', workouts), null);
  assert.equal(nextSetLoad({ kg: 60, feel: 'facile' }), 62.5);
  assert.equal(nextSetLoad({ kg: 60, feel: 'dur' }), 57.5);
  assert.equal(nextSetLoad({ kg: 60, feel: 'correct' }), 60);
});

test('muscu : records et nouveaux records', () => {
  const w1 = { id: '1', date: '2026-11-26', endedAt: 1, sets: [{ exerciseId: 'squat', name: 'Squat', kg: 60, reps: 8, feel: 'correct' }] };
  const w2 = { id: '2', date: '2026-12-03', endedAt: 2, sets: [{ exerciseId: 'squat', name: 'Squat', kg: 65, reps: 8, feel: 'correct' }, { exerciseId: 'mollets', name: 'Mollets', kg: 40, reps: 12, feel: 'facile' }] };
  assert.equal(liftRecords([w1, w2])[0].kg, 65);
  const recs = newRecords(w2, [w1]);
  assert.equal(recs.length, 1); // les mollets n'avaient pas d'historique : pas un « record battu »
  assert.equal(recs[0].exerciseId, 'squat');
  assert.equal(newRecords(w1, []).length, 0);
});

test('course : km par semaine, records, prédiction, rapprochement avec le plan', () => {
  const acts = [run(1, '2026-11-10', 5, 26), run(2, '2026-11-12', 4, 20.67), run(3, '2026-11-18', 6.5, 40), run(4, '2026-11-18', 2, 12, 'Walk')];
  const weeks = weeklyKm(acts, '2026-11-19', 3);
  assert.deepEqual(weeks.map(w => w.start), ['2026-11-02', '2026-11-09', '2026-11-16']);
  assert.equal(weeks[1].km, 9);
  assert.equal(weeks[2].km, 6.5);
  const recs = runRecords(acts);
  assert.equal(recs[0].value, '6,5 km');
  const pred = predictRace(acts, '2026-11-19');
  assert.equal(pred.from.id, 1); // 5 km en 26:00 → 42:48, meilleur que 4 km en 20:40 → 43:05
  assert.ok(pred.time > 42 * 60 && pred.time < 44 * 60, fmtDuration(pred.time));
  assert.equal(matchRun({ sport: 'run', date: '2026-11-18' }, acts).id, 3);
  assert.equal(matchRun({ sport: 'run', date: '2026-11-19' }, acts), null);
});

test('créatine : jours de suite', () => {
  assert.equal(streak(['2026-11-17', '2026-11-18', '2026-11-19'], '2026-11-19'), 3);
  assert.equal(streak(['2026-11-17', '2026-11-18'], '2026-11-19'), 2); // pas encore cochée aujourd'hui
  assert.equal(streak(['2026-11-15'], '2026-11-19'), 0);
});

test('relais Strava : rejette les requêtes invalides sans appeler Strava', async () => {
  const env = { STRAVA_CLIENT_ID: '298644', STRAVA_CLIENT_SECRET: 'x' };
  const post = (path, body) => worker.fetch(new Request(`https://h.test${path}`, { method: 'POST', body: JSON.stringify(body) }), env);
  assert.equal((await post('/api/strava/token', { code: 'a b' })).status, 400);
  assert.equal((await post('/api/strava/refresh', {})).status, 400);
  const r = await worker.fetch(new Request('https://h.test/api/strava/activities?after=1'), env);
  assert.equal(r.status, 401);
  const r2 = await worker.fetch(new Request('https://h.test/api/strava/activities?after=-3', { headers: { Authorization: 'Bearer abcdefghijklmnopqrstuvwxyz' } }), env);
  assert.equal(r2.status, 400);
  assert.equal((await worker.fetch(new Request('https://h.test/autre'), env)).status, 404);
});

import { RECIPES, AISLES, buildShoppingList, roundQty, fmtQty, shoppingListText } from '../public/js/recipes.js';

test('recettes : données cohérentes', () => {
  const aisleIds = new Set(AISLES.map(a => a.id));
  assert.equal(new Set(RECIPES.map(r => r.id)).size, RECIPES.length);
  for (const r of RECIPES) {
    assert.ok(r.servings >= 1 && r.ingredients.length && r.steps.length, r.id);
    for (const x of r.ingredients) assert.ok(aisleIds.has(x.aisle), `${r.id} : rayon ${x.aisle}`);
  }
});

test('liste de courses : fusion, mise à l’échelle, arrondis, rayons', () => {
  assert.equal(roundQty(43, 'g'), 45);
  assert.equal(roundQty(213, 'g'), 220);
  assert.equal(roundQty(0.5, 'pièce'), 1);
  assert.equal(fmtQty(1600, 'g'), '1,6 kg');
  assert.equal(fmtQty(2, 'pièce'), '× 2');
  // 2 overnight oats (1 portion chacune) + 1 portion de pancakes : flocons 2×70 + 50 = 190 g, bananes 3, whey 80 g
  const list = buildShoppingList({ 'overnight-oats': 2, pancakes: 1 }, [{ id: '1', name: 'Café', aisle: 'divers' }]);
  const all = list.aisles.flatMap(a => a.items);
  assert.equal(all.find(x => x.name === 'Flocons d’avoine').qty, 190);
  assert.equal(all.find(x => x.name === 'Banane').qty, 3);
  assert.equal(all.find(x => x.name === 'Whey').qty, 80);
  assert.ok(all.find(x => x.name === 'Café').extra);
  assert.deepEqual(list.staples.map(x => x.name), ['Miel']);
  // Ordre des rayons respecté
  const order = AISLES.map(a => a.id);
  const idx = list.aisles.map(a => order.indexOf(a.id));
  assert.deepEqual(idx, [...idx].sort((a, b) => a - b));
  // Moitié d'une recette pour 2 (1 portion de bowl) : 80 g de riz
  assert.equal(buildShoppingList({ 'bowl-poulet': 1 }).aisles.flatMap(a => a.items).find(x => x.name === 'Riz basmati').qty, 80);
  // Texte partagé sans les articles cochés
  const txt = shoppingListText(list, [all.find(x => x.name === 'Whey').key]);
  assert.ok(txt.includes('Flocons d’avoine 190 g') && !txt.includes('Whey'));
  assert.equal(buildShoppingList({}).aisles.length, 0);
});
