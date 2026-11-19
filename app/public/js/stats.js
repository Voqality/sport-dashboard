// Calculs purs (sans accès au navigateur) : testés avec « npm run test ».
import { addDaysKey, mondayOf, RACE } from './plan.js';

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);
export const isRun = (a) => RUN_TYPES.has(a.sport_type ?? a.type);

/** Clé AAAA-MM-JJ d'une activité Strava (start_date_local = heure locale). */
export const activityDay = (a) => String(a.start_date_local).slice(0, 10);

// ───────── Formats ─────────

export function fmtPace(secPerKm) {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '–';
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm % 60);
  if (s === 60) { m += 1; s = 0; }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDuration(totalS) {
  if (!Number.isFinite(totalS) || totalS < 0) return '–';
  const s = Math.round(totalS);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

export const fmtKm = (m) => (m / 1000).toFixed(1).replace('.', ',');
export const fmtKg = (kg) => (Math.round(kg * 10) / 10).toString().replace('.', ',');
export const paceOf = (a) => (a.distance > 0 ? a.moving_time / (a.distance / 1000) : NaN);

// ───────── Musculation ─────────

/** Ressenti d'une série → RPE (échelle 1-10). */
export const FEEL_RPE = { facile: 7, correct: 8, dur: 9.5 };

/** 1RM estimé (moyenne Epley / Brzycki) ; null si inexploitable. */
export function e1rm(kg, reps, rpe) {
  if (!(kg > 0) || !(reps >= 1)) return null;
  const rir = typeof rpe === 'number' ? Math.min(5, Math.max(0, 10 - rpe)) : 0;
  const r = reps + rir;
  if (r > 12) return null;
  return (kg * (1 + r / 30) + (kg * 36) / (37 - r)) / 2;
}

const setE1rm = (s) => e1rm(s.kg, s.reps, FEEL_RPE[s.feel]);

/**
 * Charge proposée pour un exercice, d'après la dernière séance où il a été fait :
 * toutes les séries « facile » → +2,5 kg ; au moins une « dur » → même charge ; sinon même charge.
 */
export function suggestLoad(exerciseId, workouts) {
  const past = [...workouts]
    .filter(w => w.endedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(w => w.sets.filter(s => s.exerciseId === exerciseId && s.kg > 0))
    .find(sets => sets.length);
  if (!past) return null;
  const top = Math.max(...past.map(s => s.kg));
  const topSets = past.filter(s => s.kg === top);
  if (topSets.every(s => s.feel === 'facile')) return { kg: top + 2.5, reason: 'facile la dernière fois : +2,5 kg' };
  if (topSets.some(s => s.feel === 'dur')) return { kg: top, reason: 'dur la dernière fois : même charge' };
  return { kg: top, reason: 'même charge que la dernière fois' };
}

/** Ajuste la série suivante pendant la séance, d'après le ressenti de la série qui vient d'être faite. */
export function nextSetLoad(lastSet) {
  if (!lastSet || !(lastSet.kg > 0)) return lastSet?.kg ?? 0;
  if (lastSet.feel === 'facile') return lastSet.kg + 2.5;
  if (lastSet.feel === 'dur') return Math.max(0, lastSet.kg - 2.5);
  return lastSet.kg;
}

/** Meilleur 1RM estimé par exercice, toutes séances confondues. */
export function liftRecords(workouts) {
  const map = new Map();
  for (const w of workouts) {
    for (const s of w.sets) {
      const e = setE1rm(s);
      if (!e) continue;
      const r = map.get(s.exerciseId);
      if (!r || e > r.e1rm) map.set(s.exerciseId, { exerciseId: s.exerciseId, name: s.name, e1rm: e, kg: s.kg, reps: s.reps, date: w.date });
    }
  }
  return [...map.values()].sort((a, b) => b.e1rm - a.e1rm);
}

/** Records battus pendant une séance, comparés à toutes les séances précédentes. */
export function newRecords(workout, previousWorkouts) {
  const before = new Map(liftRecords(previousWorkouts).map(r => [r.exerciseId, r.e1rm]));
  const best = new Map();
  for (const s of workout.sets) {
    const e = setE1rm(s);
    if (!e) continue;
    const cur = best.get(s.exerciseId);
    if (!cur || e > cur.e1rm) best.set(s.exerciseId, { exerciseId: s.exerciseId, name: s.name, e1rm: e, kg: s.kg, reps: s.reps, feel: s.feel });
  }
  return [...best.values()]
    .filter(r => r.e1rm > (before.get(r.exerciseId) ?? 0) * 1.005 && before.has(r.exerciseId))
    .map(r => ({ ...r, previous: before.get(r.exerciseId) }));
}

// ───────── Course ─────────

/** Kilomètres par semaine (lundi → dimanche) sur les `n` dernières semaines, la plus récente en dernier. */
export function weeklyKm(activities, todayKey, n = 8) {
  const thisMonday = mondayOf(todayKey);
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = addDaysKey(thisMonday, -7 * i);
    const end = addDaysKey(start, 6);
    const km = activities.filter(a => isRun(a) && activityDay(a) >= start && activityDay(a) <= end)
      .reduce((s, a) => s + a.distance / 1000, 0);
    weeks.push({ start, km });
  }
  return weeks;
}

export function runRecords(activities) {
  const runs = activities.filter(a => isRun(a) && a.distance > 0 && a.moving_time > 0);
  const best = (list, score) => list.reduce((b, a) => (!b || score(a) > score(b) ? a : b), null);
  const out = [];
  const longest = best(runs, a => a.distance);
  if (longest) out.push({ label: 'Plus longue sortie', value: `${fmtKm(longest.distance)} km`, activity: longest });
  for (const km of [3, 5, 8]) {
    const fast = best(runs.filter(a => a.distance >= km * 1000 * 0.98), a => -paceOf(a));
    if (fast) out.push({ label: `Meilleure allure sur ${km} km ou plus`, value: `${fmtPace(paceOf(fast))}/km`, activity: fast });
  }
  return out;
}

/**
 * Chrono prédit sur la distance de la course, d'après la meilleure sortie des `days` derniers jours
 * (loi de Riegel, exposant 1,06). Seules les sorties d'au moins 3 km comptent.
 */
export function predictRace(activities, todayKey, days = 60, distanceKm = RACE.distanceKm) {
  const from = addDaysKey(todayKey, -days);
  const candidates = activities.filter(a => isRun(a) && a.distance >= 3000 && a.moving_time > 0 && activityDay(a) >= from && activityDay(a) <= todayKey);
  if (!candidates.length) return null;
  const preds = candidates.map(a => ({ time: a.moving_time * Math.pow((distanceKm * 1000) / a.distance, 1.06), from: a }));
  return preds.reduce((b, p) => (p.time < b.time ? p : b));
}

/** Sortie Strava qui correspond à une séance de course prévue (même jour, la plus longue). */
export function matchRun(session, activities) {
  if (session.sport !== 'run') return null;
  return activities.filter(a => isRun(a) && activityDay(a) === session.date)
    .reduce((b, a) => (!b || a.distance > b.distance ? a : b), null);
}

/** Séance muscu enregistrée pour une séance prévue. */
export function matchWorkout(session, workouts) {
  if (session.sport !== 'muscu') return null;
  return workouts.find(w => w.plannedId === session.id && w.endedAt) ?? null;
}

export function isDone(session, activities, workouts) {
  return Boolean(matchRun(session, activities) || matchWorkout(session, workouts));
}

/** Nombre de jours consécutifs (jusqu'à aujourd'hui inclus, ou hier) où la créatine a été cochée. */
export function streak(checkedDays, todayKey) {
  const set = new Set(checkedDays);
  let day = set.has(todayKey) ? todayKey : addDaysKey(todayKey, -1);
  let n = 0;
  while (set.has(day)) { n++; day = addDaysKey(day, -1); }
  return n;
}
