// Musculation : 1RM estimé et charge suggérée — doc 04 §4.4.

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** 1RM estimé (moyenne Epley / Brzycki) ; null si la série n'est pas exploitable (> 12 reps effectives). */
export function estimate1RM(loadKg: number, reps: number, rpe?: number): number | null {
  if (!(loadKg > 0) || !(reps >= 1)) return null;
  const rir = typeof rpe === 'number' ? clamp(10 - rpe, 0, 5) : 0;
  const repsEff = reps + rir;
  if (repsEff > 12) return null;
  const epley = loadKg * (1 + repsEff / 30);
  const brzycki = (loadKg * 36) / (37 - repsEff);
  return (epley + brzycki) / 2;
}

/** Charge suggérée pour un nombre de reps à un RPE cible, arrondie à l'incrément (inverse exacte d'estimate1RM). */
export function suggestedLoad(e1rm: number, reps: number, targetRpe: number, increment = 2.5): number {
  const r = reps + clamp(10 - targetRpe, 0, 5);
  const factor = ((1 + r / 30) + 36 / (37 - r)) / 2;
  return Math.round(e1rm / factor / increment) * increment;
}
