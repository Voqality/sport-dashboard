// Types partagés du moteur HYBRID.
// Convention : toutes les dates sont en « heure locale naïve » stockée comme UTC
// (ex. une séance à 18:30 heure de Paris → Date.UTC(..., 18, 30)). Le moteur ne fait
// jamais de conversion de fuseau : tout est comparé dans le même référentiel.

export type Compartment =
  | 'quads' | 'hamstrings' | 'glutes' | 'calves'
  | 'chest' | 'back' | 'shoulders' | 'arms' | 'core'
  | 'systemic';

export type MuscleCompartment = Exclude<Compartment, 'systemic'>;

export type Sport = 'run' | 'trail' | 'strength' | 'football' | 'bike' | 'walk' | 'other';

export interface Profile {
  sexe: 'H' | 'F';
  poidsKg: number;
  fcMax: number;
  fcRepos: number;
  /** FC au seuil lactique ; si absente : 90 % de la FC max. */
  fcSeuil?: number | null;
  /** Nombre de jours analysés par défaut. */
  jours?: number;
}

export interface SetLog {
  exercise: string;
  loadKg: number;
  reps: number;
  rpe?: number;
}

export interface Activity {
  id: string;
  source: 'strava' | 'csv';
  sport: Sport;
  name?: string;
  /** Début, heure locale naïve. */
  start: Date;
  durationS: number;
  distanceM: number;
  elevGainM: number;
  avgHr?: number;
  /** RPE de séance (1-10), si connu. */
  rpe?: number;
  sets?: SetLog[];
}

export interface Impulse {
  at: Date;
  compartment: Compartment;
  value: number;
}

export type FatigueMap = Record<Compartment, number>;

export interface DayMetrics {
  /** AAAA-MM-JJ */
  date: string;
  activities: Activity[];
  uaRun: number;
  uaLift: number;
  uaOther: number;
  uaTotal: number;
  atl: number;
  ctl: number;
  /** Fraîcheur du matin : CTL(veille) − ATL(veille). */
  tsb: number;
  /** EWMA 7 j / EWMA 28 j ; null tant que la base chronique est trop faible. */
  acwr: number | null;
  /** Fatigue par compartiment (0-100), mesurée à 08:00. */
  fatigue: FatigueMap;
  /** Fatigue des jambes agrégée (0-100), à 08:00. */
  leg: number;
}
