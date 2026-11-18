// Types partagés du moteur HYBRID.
// Convention : toutes les dates sont en « heure locale naïve » stockée comme UTC
// (ex. une séance à 18:30 heure de Paris → Date.UTC(..., 18, 30)).

export type Sport = 'run' | 'trail' | 'strength' | 'football' | 'bike' | 'walk' | 'other';

export interface Profile {
  sexe?: 'H' | 'F';
  poidsKg?: number;
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
  sets?: SetLog[];
}
