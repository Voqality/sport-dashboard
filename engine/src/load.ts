// Charge d'entraînement unifiée (UA) et 1RM estimé — doc 04 §4.1 et §4.4.
import type { Activity, Profile, SetLog } from './types.ts';

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** RPE de séance par défaut quand rien n'est saisi. */
const DEFAULT_RPE: Record<Activity['sport'], number> = {
  run: 5, trail: 6, strength: 6, football: 7, bike: 4, walk: 2, other: 5,
};

/** sRPE (Foster) converti en UA : 60 min à RPE 7,5 ≈ 100 UA. */
export function sRpeUA(rpe: number, minutes: number): number {
  return (rpe * minutes) / 4.5;
}

export function lactateThresholdHr(p: Profile): number {
  return p.fcSeuil ?? Math.round(0.9 * p.fcMax);
}

/** Intensité relative à la FC seuil (méthode de la FC de réserve). */
export function hrIntensity(avgHr: number, p: Profile): number {
  const lthr = lactateThresholdHr(p);
  return clamp((avgHr - p.fcRepos) / (lthr - p.fcRepos), 0.3, 1.3);
}

/** Zone 1-5 à partir de la FC moyenne, en % de la FC seuil (repères de Friel). */
export function hrZone(avgHr: number | undefined, p: Profile): 1 | 2 | 3 | 4 | 5 {
  if (!avgHr) return 2;
  const r = avgHr / lactateThresholdHr(p);
  if (r < 0.81) return 1;
  if (r < 0.9) return 2;
  if (r < 0.94) return 3;
  if (r < 1.0) return 4;
  return 5;
}

export function meanSetRpe(sets: SetLog[] | undefined): number | undefined {
  const r = (sets ?? []).map(s => s.rpe).filter((x): x is number => typeof x === 'number');
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : undefined;
}

/** Durée d'une séance muscu : saisie, sinon ~2,5 min par série. */
export function strengthDurationS(a: Activity): number {
  if (a.durationS > 0) return a.durationS;
  return Math.max(20, (a.sets?.length ?? 0) * 2.5) * 60;
}

/** Charge unifiée d'une activité, en UA (1 h au seuil ≈ 100 UA). */
export function activityLoadUA(a: Activity, p: Profile): number {
  const endurance = a.sport === 'run' || a.sport === 'trail' || a.sport === 'bike' || a.sport === 'walk';
  if (endurance && a.avgHr && a.durationS > 0) {
    const ifr = hrIntensity(a.avgHr, p);
    return (a.durationS / 3600) * ifr * ifr * 100;
  }
  if (a.sport === 'strength') {
    const rpe = a.rpe ?? meanSetRpe(a.sets) ?? DEFAULT_RPE.strength;
    return sRpeUA(rpe, strengthDurationS(a) / 60);
  }
  return sRpeUA(a.rpe ?? DEFAULT_RPE[a.sport], a.durationS / 60);
}

/** 1RM estimé (moyenne Epley / Brzycki) ; null si la série n'est pas exploitable. */
export function estimate1RM(loadKg: number, reps: number, rpe?: number): number | null {
  if (!(loadKg > 0) || !(reps >= 1)) return null;
  const rir = typeof rpe === 'number' ? clamp(10 - rpe, 0, 5) : 0;
  const repsEff = reps + rir;
  if (repsEff > 12) return null;
  const epley = loadKg * (1 + repsEff / 30);
  const brzycki = (loadKg * 36) / (37 - repsEff);
  return (epley + brzycki) / 2;
}

/** Charge suggérée pour un nombre de reps à un RPE cible, arrondie à l'incrément. */
export function suggestedLoad(e1rm: number, reps: number, targetRpe: number, increment = 2.5): number {
  // Inverse exacte d'estimate1RM : même moyenne Epley / Brzycki.
  const r = reps + clamp(10 - targetRpe, 0, 5);
  const factor = ((1 + r / 30) + 36 / (37 - r)) / 2;
  const raw = e1rm / factor;
  return Math.round(raw / increment) * increment;
}
