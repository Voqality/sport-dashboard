// Conversion des activités Strava (résumé de GET /athlete/activities) vers le format du moteur.
import type { Activity, Sport } from './types.ts';

export interface StravaSummary {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date_local: string;
  moving_time: number;
  elapsed_time: number;
  distance: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  has_heartrate?: boolean;
  average_cadence?: number;
  gear_id?: string | null;
}

const SPORT_MAP: Record<string, Sport> = {
  Run: 'run', VirtualRun: 'run',
  TrailRun: 'trail',
  WeightTraining: 'strength', Workout: 'strength', Crossfit: 'strength', HighIntensityIntervalTraining: 'strength',
  Soccer: 'football',
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike', Velomobile: 'bike',
  Walk: 'walk', Hike: 'walk',
};

export function stravaSport(s: StravaSummary): Sport {
  return SPORT_MAP[s.sport_type ?? ''] ?? SPORT_MAP[s.type ?? ''] ?? 'other';
}

export function fromStrava(s: StravaSummary): Activity {
  // start_date_local porte un « Z » mais représente l'heure locale : c'est exactement notre convention naïve.
  return {
    id: `strava-${s.id}`,
    source: 'strava',
    sport: stravaSport(s),
    name: s.name,
    start: new Date(s.start_date_local),
    durationS: s.moving_time || s.elapsed_time,
    distanceM: s.distance ?? 0,
    elevGainM: s.total_elevation_gain ?? 0,
    avgHr: s.has_heartrate === false ? undefined : s.average_heartrate,
  };
}

/**
 * Fusionne Strava et le carnet CSV : une séance muscu Strava du même jour qu'une séance CSV
 * est remplacée par la séance CSV (qui a le détail des séries), en gardant la durée Strava.
 */
export function mergeStrengthSessions(strava: Activity[], csv: Activity[]): Activity[] {
  const day = (a: Activity) => a.start.toISOString().slice(0, 10);
  const used = new Set<string>();
  const merged = csv.map(c => {
    const twin = strava.find(s => s.sport === 'strength' && day(s) === day(c) && !used.has(s.id));
    if (!twin) return c;
    used.add(twin.id);
    return { ...c, durationS: c.durationS > 0 ? c.durationS : twin.durationS, start: twin.start, name: twin.name ?? c.name };
  });
  return [...strava.filter(s => !used.has(s.id)), ...merged];
}
