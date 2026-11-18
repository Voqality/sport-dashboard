// Modèle de fatigue systémique + locale par groupe musculaire — doc 04 §4.2.
import type { Activity, Compartment, FatigueMap, Impulse, MuscleCompartment, Profile } from './types.ts';
import { activityLoadUA, hrZone, clamp } from './load.ts';
import { findExercise, GENERIC_EXERCISE, normalizeName } from './exercises.ts';

export interface CompartmentCfg { tauH: number; k: number }

/** Constantes par défaut (à calibrer avec les ressentis). */
export const COMPARTMENTS: Record<Compartment, CompartmentCfg> = {
  quads: { tauH: 36, k: 40 },
  hamstrings: { tauH: 36, k: 40 },
  glutes: { tauH: 30, k: 35 },
  calves: { tauH: 30, k: 35 },
  chest: { tauH: 30, k: 40 },
  back: { tauH: 30, k: 40 },
  shoulders: { tauH: 30, k: 40 },
  arms: { tauH: 30, k: 40 },
  core: { tauH: 20, k: 30 },
  systemic: { tauH: 28, k: 120 },
};

export const ALL_COMPARTMENTS = Object.keys(COMPARTMENTS) as Compartment[];

/** Pondération de la fatigue « jambes » (alignée sur l'impact course). */
export const LEG_WEIGHTS: Partial<Record<MuscleCompartment, number>> = {
  quads: 0.35, calves: 0.25, glutes: 0.2, hamstrings: 0.2,
};

const ZONE_FACTOR = { 1: 1.0, 2: 1.0, 3: 1.3, 4: 1.6, 5: 2.0 } as const;
const RUN_SPLIT: Partial<Record<MuscleCompartment, number>> = { quads: 0.35, calves: 0.3, glutes: 0.2, hamstrings: 0.15 };
const FOOTBALL_SPLIT: Partial<Record<MuscleCompartment, number>> = { quads: 0.3, hamstrings: 0.35, glutes: 0.15, calves: 0.2 };
const BIKE_SPLIT: Partial<Record<MuscleCompartment, number>> = { quads: 0.55, glutes: 0.3, hamstrings: 0.15 };

/** Effort d'une série selon son RPE (interpolé). */
export function effortFromRpe(rpe: number | undefined): number {
  if (typeof rpe !== 'number') return 0.6;
  const pts: Array<[number, number]> = [[5, 0.25], [6, 0.45], [7, 0.6], [8, 0.75], [9, 0.9], [10, 1.0]];
  if (rpe <= 5) return 0.25;
  if (rpe >= 10) return 1.0;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x0, y0] = pts[i - 1];
    if (rpe <= x1) return y0 + ((rpe - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 0.6;
}

function endOf(a: Activity): Date {
  const dur = a.sport === 'strength' && a.durationS <= 0 ? (a.sets?.length ?? 0) * 150 : a.durationS;
  return new Date(a.start.getTime() + dur * 1000);
}

function spread(out: Impulse[], at: Date, total: number, split: Partial<Record<MuscleCompartment, number>>): void {
  for (const [m, w] of Object.entries(split)) {
    if (w && total > 0) out.push({ at, compartment: m as MuscleCompartment, value: total * w });
  }
}

export interface ImpulseOptions {
  /** Meilleur e1RM connu par exercice (nom normalisé) pour estimer l'intensité relative. */
  e1rmByExercise?: Map<string, number>;
  /** Exercices non reconnus rencontrés (pour le rapport). */
  unknownExercises?: Set<string>;
}

/** Transforme une activité en impulsions de fatigue (une par compartiment touché). */
export function impulsesForActivity(a: Activity, p: Profile, opts: ImpulseOptions = {}): Impulse[] {
  const out: Impulse[] = [];
  const at = endOf(a);
  const ua = activityLoadUA(a, p);
  out.push({ at, compartment: 'systemic', value: ua });

  switch (a.sport) {
    case 'run':
    case 'trail': {
      const km = a.distanceM / 1000;
      const hours = a.durationS / 3600;
      const base = ZONE_FACTOR[hrZone(a.avgHr, p)]
        * (a.sport === 'trail' ? 1.2 : 1.0)
        * (1 + Math.max(0, hours - 1.5) * 0.2);
      spread(out, at, km * base * 6, RUN_SPLIT);
      // Descente ≈ dénivelé positif (boucle) : excentrique, quadriceps uniquement.
      const descent = a.elevGainM;
      if (descent > 0) out.push({ at, compartment: 'quads', value: (descent / 100) * 1.5 * 6 });
      break;
    }
    case 'football':
      spread(out, at, ua * 0.8, FOOTBALL_SPLIT);
      break;
    case 'bike':
      spread(out, at, ua * 0.3, BIKE_SPLIT);
      break;
    case 'walk': {
      const km = a.distanceM / 1000;
      spread(out, at, km * 1.2 + (a.elevGainM / 100) * 2, { quads: 0.35, calves: 0.35, glutes: 0.3 });
      break;
    }
    case 'strength': {
      for (const s of a.sets ?? []) {
        const ex = findExercise(s.exercise);
        if (!ex) opts.unknownExercises?.add(s.exercise);
        const def = ex ?? GENERIC_EXERCISE;
        const best = opts.e1rmByExercise?.get(normalizeName(def === GENERIC_EXERCISE ? s.exercise : def.name));
        const rel = best && s.loadKg > 0 ? clamp(s.loadKg / best, 0, 1) : 0.75;
        const value = effortFromRpe(s.rpe) * (0.6 + 0.4 * rel) * (1 + 0.15 * def.eccentric) * 10;
        spread(out, at, value, def.muscles);
      }
      break;
    }
    default:
      spread(out, at, ua * 0.3, { quads: 0.3, glutes: 0.2, back: 0.2, core: 0.3 });
  }
  return out;
}

/** Fatigue d'un compartiment (0-100) à un instant donné. */
export function fatigueAt(impulses: Impulse[], compartment: Compartment, at: Date): number {
  const cfg = COMPARTMENTS[compartment];
  let F = 0;
  for (const i of impulses) {
    if (i.compartment !== compartment || i.at > at) continue;
    const h = (at.getTime() - i.at.getTime()) / 3_600_000;
    F += i.value * Math.exp(-h / cfg.tauH);
  }
  return 100 * (1 - Math.exp(-F / cfg.k));
}

export function fatigueMapAt(impulses: Impulse[], at: Date): FatigueMap {
  const m = {} as FatigueMap;
  for (const c of ALL_COMPARTMENTS) m[c] = fatigueAt(impulses, c, at);
  return m;
}

export function legFatigue(m: FatigueMap): number {
  let s = 0;
  for (const [c, w] of Object.entries(LEG_WEIGHTS)) s += (m[c as MuscleCompartment] ?? 0) * (w ?? 0);
  return s;
}
