// Bilan des performances : volume par semaine et records (course et musculation).
import type { Activity } from './types.ts';
import { estimate1RM } from './strength.ts';
import { findExercise } from './exercises.ts';

export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * 86_400_000);

/** Lundi de la semaine d'une date. */
export function weekStart(d: Date): Date {
  const day = parseDay(dayKey(d));
  const dow = (day.getUTCDay() + 6) % 7; // lundi = 0
  return addDays(day, -dow);
}

const isRun = (a: Activity) => a.sport === 'run' || a.sport === 'trail';

export interface WeekSummary {
  /** Lundi, AAAA-MM-JJ */
  week: string;
  runCount: number;
  runKm: number;
  runMinutes: number;
  runElevM: number;
  liftSessions: number;
  liftSets: number;
  /** Σ charge × reps (kg) */
  tonnageKg: number;
  otherSessions: number;
}

/** Résumé semaine par semaine, du lundi de `from` jusqu'à `to` (semaines vides incluses). */
export function weeklySummary(activities: Activity[], from: Date, to: Date): WeekSummary[] {
  const weeks = new Map<string, WeekSummary>();
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) {
    const k = dayKey(w);
    weeks.set(k, { week: k, runCount: 0, runKm: 0, runMinutes: 0, runElevM: 0, liftSessions: 0, liftSets: 0, tonnageKg: 0, otherSessions: 0 });
  }
  for (const a of activities) {
    if (a.start < weekStart(from) || a.start >= addDays(to, 1)) continue;
    const w = weeks.get(dayKey(weekStart(a.start)));
    if (!w) continue;
    if (isRun(a)) {
      w.runCount++;
      w.runKm += a.distanceM / 1000;
      w.runMinutes += a.durationS / 60;
      w.runElevM += a.elevGainM;
    } else if (a.sport === 'strength') {
      w.liftSessions++;
      w.liftSets += a.sets?.length ?? 0;
      w.tonnageKg += (a.sets ?? []).reduce((s, x) => s + x.loadKg * x.reps, 0);
    } else {
      w.otherSessions++;
    }
  }
  return [...weeks.values()];
}

export interface RunRecord { label: string; value: string; date: string; activity: string }

const fmtPace = (secPerKm: number) => {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00/km` : `${m}:${String(s).padStart(2, '0')}/km`;
};

/** Records de course : plus longue sortie, meilleure allure sur ≥ 5 km et ≥ 10 km, plus gros dénivelé. */
export function runRecords(activities: Activity[]): RunRecord[] {
  const runs = activities.filter(a => isRun(a) && a.distanceM > 0 && a.durationS > 0);
  const out: RunRecord[] = [];
  const pick = (list: Activity[], score: (a: Activity) => number) =>
    list.reduce<Activity | undefined>((best, a) => (!best || score(a) > score(best) ? a : best), undefined);

  const longest = pick(runs, a => a.distanceM);
  if (longest) out.push({ label: 'Plus longue sortie', value: `${(longest.distanceM / 1000).toFixed(1)} km`, date: dayKey(longest.start), activity: longest.name ?? '' });
  for (const km of [5, 10, 21.1]) {
    const best = pick(runs.filter(a => a.distanceM >= km * 1000), a => -(a.durationS / a.distanceM));
    if (best) out.push({ label: `Meilleure allure sur ≥ ${km} km`, value: fmtPace(best.durationS / (best.distanceM / 1000)), date: dayKey(best.start), activity: `${best.name ?? ''} (${(best.distanceM / 1000).toFixed(1)} km)` });
  }
  const climb = pick(runs, a => a.elevGainM);
  if (climb && climb.elevGainM > 0) out.push({ label: 'Plus gros dénivelé', value: `${Math.round(climb.elevGainM)} m D+`, date: dayKey(climb.start), activity: climb.name ?? '' });
  return out;
}

export interface LiftRecord {
  exercise: string;
  bestE1rm: number;
  bestE1rmDate: string;
  /** Série à l'origine du meilleur e1RM, ex. « 5 × 100 kg @ RPE 8 » */
  bestSet: string;
  lastE1rm: number;
  lastDate: string;
  sessions: number;
}

/** Records de musculation par exercice (nom du catalogue si reconnu). */
export function liftRecords(activities: Activity[]): LiftRecord[] {
  const map = new Map<string, LiftRecord & { _last: number; _days: Set<string> }>();
  const sorted = [...activities].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const a of sorted) {
    for (const s of a.sets ?? []) {
      const e = estimate1RM(s.loadKg, s.reps, s.rpe);
      if (!e) continue;
      const name = findExercise(s.exercise)?.name ?? s.exercise.trim();
      const day = dayKey(a.start);
      let r = map.get(name);
      if (!r) {
        r = { exercise: name, bestE1rm: 0, bestE1rmDate: day, bestSet: '', lastE1rm: 0, lastDate: day, sessions: 0, _last: 0, _days: new Set() };
        map.set(name, r);
      }
      if (e > r.bestE1rm) {
        r.bestE1rm = e;
        r.bestE1rmDate = day;
        r.bestSet = `${s.reps} × ${s.loadKg} kg${typeof s.rpe === 'number' ? ` @ RPE ${s.rpe}` : ''}`;
      }
      // Dernière séance : meilleur e1RM du jour le plus récent.
      if (day !== r.lastDate) { r.lastDate = day; r._last = 0; }
      r._last = Math.max(r._last, e);
      r.lastE1rm = r._last;
      r._days.add(day);
      r.sessions = r._days.size;
    }
  }
  return [...map.values()]
    .map(({ _last, _days, ...r }) => r)
    .sort((a, b) => b.bestE1rm - a.bestE1rm);
}
