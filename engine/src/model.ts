// Assemble la chronologie jour par jour : charges, ATL/CTL/TSB/ACWR, fatigue à 08:00 — doc 04 §4.1.
import type { Activity, DayMetrics, Impulse, Profile } from './types.ts';
import { activityLoadUA, estimate1RM } from './load.ts';
import { fatigueMapAt, impulsesForActivity, legFatigue } from './fatigue.ts';
import { findExercise, normalizeName } from './exercises.ts';

export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Meilleur e1RM observé par exercice dans les données (clé : nom normalisé du catalogue). */
export function bestE1rmByExercise(activities: Activity[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const a of activities) {
    for (const s of a.sets ?? []) {
      const e = estimate1RM(s.loadKg, s.reps, s.rpe);
      if (!e) continue;
      const key = normalizeName(findExercise(s.exercise)?.name ?? s.exercise);
      best.set(key, Math.max(best.get(key) ?? 0, e));
    }
  }
  return best;
}

export interface TimelineResult {
  days: DayMetrics[];
  impulses: Impulse[];
  unknownExercises: string[];
}

/**
 * Construit la chronologie de `from` à `to` (inclus).
 * Les activités antérieures à `from` comptent pour la fatigue et les moyennes (période d'amorçage).
 */
export function buildTimeline(activities: Activity[], p: Profile, from: Date, to: Date): TimelineResult {
  const sorted = [...activities].sort((a, b) => a.start.getTime() - b.start.getTime());
  const e1rm = bestE1rmByExercise(sorted);
  const unknown = new Set<string>();
  const impulses = sorted.flatMap(a => impulsesForActivity(a, p, { e1rmByExercise: e1rm, unknownExercises: unknown }));

  const byDay = new Map<string, Activity[]>();
  for (const a of sorted) {
    const k = dayKey(a.start);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }

  // Les moyennes exponentielles démarrent au premier jour de données.
  const first = sorted.length ? parseDay(dayKey(sorted[0].start)) : from;
  const start = first < from ? first : from;
  const lAtl = 1 - Math.exp(-1 / 7);
  const lCtl = 1 - Math.exp(-1 / 42);
  const l28 = 1 - Math.exp(-1 / 28);
  let atl = 0, ctl = 0, ew28 = 0;

  const days: DayMetrics[] = [];
  for (let d = start; d <= to; d = addDays(d, 1)) {
    const key = dayKey(d);
    const acts = byDay.get(key) ?? [];
    let uaRun = 0, uaLift = 0, uaOther = 0;
    for (const a of acts) {
      const ua = activityLoadUA(a, p);
      if (a.sport === 'run' || a.sport === 'trail') uaRun += ua;
      else if (a.sport === 'strength') uaLift += ua;
      else uaOther += ua;
    }
    const total = uaRun + uaLift + uaOther;
    const tsb = ctl - atl; // fraîcheur du matin, avant la charge du jour
    atl += (total - atl) * lAtl;
    ctl += (total - ctl) * lCtl;
    ew28 += (total - ew28) * l28;
    const acwr = ew28 >= 10 ? atl / ew28 : null;

    if (d >= from) {
      const morning = new Date(d.getTime() + 8 * 3_600_000);
      const fatigue = fatigueMapAt(impulses, morning);
      days.push({
        date: key, activities: acts, uaRun, uaLift, uaOther, uaTotal: total,
        atl, ctl, tsb, acwr, fatigue, leg: legFatigue(fatigue),
      });
    }
  }
  return { days, impulses, unknownExercises: [...unknown] };
}

/** Corrélation de Pearson ; null si moins de 5 paires ou variance nulle. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return null;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}
