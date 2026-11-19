// Plan « Défi de la colline » : 8 km le samedi 9 janvier 2027, objectif 5:10/km (41:20).
// 7 semaines, du lundi 23 novembre 2026 : 2 à 3 courses + 1 muscu par semaine.

export const RACE = {
  name: 'Défi de la colline',
  date: '2027-01-09',
  distanceKm: 8,
  targetPace: '5:10',
  targetTimeS: 41 * 60 + 20,
};

export const PLAN_START = '2026-11-23';
export const PLAN_WEEKS = 7;

export const PHASES = [
  { name: 'Reprise', weeks: [1, 2] },
  { name: 'Développement', weeks: [3, 4] },
  { name: 'Spécifique', weeks: [5, 6] },
  { name: 'Affûtage', weeks: [7] },
];

export const PACES = {
  ef: '6:00–6:30',
  course: '5:10',
  seuil: '4:55–5:00',
  rapide: '4:30–4:40',
};

/** Séance de musculation « coureur » (≈ 45 min), pensée pour les côtes. */
const MUSCU_BASE = [
  { id: 'squat', name: 'Squat', sets: 3, reps: 8, unit: 'reps', rest: 120, loaded: true },
  { id: 'fentes', name: 'Fentes marchées', sets: 3, reps: 10, unit: 'reps / jambe', rest: 90, loaded: true },
  { id: 'hip-thrust', name: 'Hip thrust', sets: 3, reps: 10, unit: 'reps', rest: 90, loaded: true },
  { id: 'mollets', name: 'Mollets debout', sets: 3, reps: 15, unit: 'reps', rest: 60, loaded: true },
  { id: 'tractions', name: 'Tractions ou rowing', sets: 3, reps: 8, unit: 'reps', rest: 90, loaded: true },
  { id: 'gainage', name: 'Gainage', sets: 3, reps: 40, unit: 's', rest: 45, loaded: false },
];

const muscu = (date, variant = 'normal') => ({
  id: `muscu-${date}`,
  date,
  sport: 'muscu',
  title: variant === 'legere' ? 'Muscu légère' : variant === 'derniere' ? 'Dernière muscu avant la course' : 'Muscu · force coureur',
  detail: variant === 'legere'
    ? '2 séries par exercice, charges confortables'
    : variant === 'derniere'
      ? 'Charges −10 %, garde 2 reps en réserve'
      : 'Garde 1 à 2 reps en réserve sur chaque série',
  minutes: variant === 'legere' ? 30 : 45,
  exercises: MUSCU_BASE.map(e => ({ ...e, sets: variant === 'legere' ? 2 : e.sets })),
});

const run = (date, title, detail, estKm, steps, extra = {}) => ({
  id: `run-${date}`,
  date,
  sport: 'run',
  title,
  detail,
  estKm,
  steps,
  ...extra,
});

const optional = (date) => run(date, 'Footing facile (option)', '30 min tranquille, seulement si tu te sens bien', 5,
  [{ kind: 'easy', label: '30 min EF', min: 30, pace: PACES.ef }], { optional: true });

const warm = { kind: 'warm', label: 'Échauffement 15 min', min: 15, pace: PACES.ef };
const cool = (min = 10) => ({ kind: 'cool', label: `Retour au calme ${min} min`, min, pace: PACES.ef });

export const SESSIONS = [
  // Semaine 1 · Reprise
  run('2026-11-24', 'Footing + accélérations', '35 min EF puis 6 accélérations de 15 s', 6,
    [{ kind: 'easy', label: '35 min EF', min: 35, pace: PACES.ef }, { kind: 'work', label: '6 × 15 s vite', min: 3, pace: PACES.rapide }]),
  muscu('2026-11-26'),
  optional('2026-11-27'),
  run('2026-11-29', '5 km dont 2 km à allure course', '3 km tranquille puis 2 km à 5:10/km', 5,
    [{ kind: 'easy', label: '3 km EF', min: 19, pace: PACES.ef }, { kind: 'work', label: '2 km à 5:10', min: 10, pace: PACES.course }]),

  // Semaine 2 · Reprise
  run('2026-12-01', 'Fractionné 8 × 1 min', '8 × (1 min rapide / 1 min trot)', 6.5,
    [warm, { kind: 'work', label: '8 × 1 min rapide', min: 8, pace: PACES.rapide, reps: 8, recovery: '1 min trot' }, cool(5)]),
  muscu('2026-12-03'),
  optional('2026-12-04'),
  run('2026-12-06', '6 km dont 3 × 1 km à allure course', '3 × 1 km à 5:10, récup 2 min en trottinant', 6,
    [{ kind: 'easy', label: '2 km EF', min: 13, pace: PACES.ef }, { kind: 'work', label: '3 × 1 km à 5:10', min: 16, pace: PACES.course, reps: 3, recovery: '2 min' }, cool(5)]),

  // Semaine 3 · Développement
  run('2026-12-08', 'Côtes 8 × 30 s', 'En montée, effort fort ; redescends en marchant', 5.5,
    [warm, { kind: 'work', label: '8 × 30 s en côte', min: 10, pace: 'à l’effort', reps: 8, recovery: 'descente en marchant' }, cool()]),
  muscu('2026-12-10'),
  optional('2026-12-11'),
  run('2026-12-13', '7 km dont 2 × 2 km à allure course', '2 × 2 km à 5:10, récup 2 min', 7,
    [{ kind: 'easy', label: '2 km EF', min: 13, pace: PACES.ef }, { kind: 'work', label: '2 × 2 km à 5:10', min: 23, pace: PACES.course, reps: 2, recovery: '2 min' }, cool(6)]),

  // Semaine 4 · Développement
  run('2026-12-15', '5 × 1 000 m au seuil', '5 × 1 000 m à 4:55–5:00, récup 2 min', 8,
    [warm, { kind: 'work', label: '5 × 1 000 m à 4:55–5:00', min: 33, pace: PACES.seuil, reps: 5, recovery: '2 min' }, cool()]),
  muscu('2026-12-17'),
  optional('2026-12-18'),
  run('2026-12-20', '8 km en endurance', 'Toute la distance de course, tranquille', 8,
    [{ kind: 'easy', label: '8 km EF', min: 50, pace: PACES.ef }]),

  // Semaine 5 · Spécifique (allégée, Noël)
  run('2026-12-22', 'Côtes 10 × 30 s', 'En montée, effort fort ; redescends en marchant', 6,
    [warm, { kind: 'work', label: '10 × 30 s en côte', min: 12, pace: 'à l’effort', reps: 10, recovery: 'descente en marchant' }, cool()]),
  muscu('2026-12-24', 'legere'),
  run('2026-12-27', '6 km facile', 'Semaine allégée : tu récupères', 6,
    [{ kind: 'easy', label: '6 km EF', min: 38, pace: PACES.ef }]),

  // Semaine 6 · Spécifique
  run('2026-12-29', '2 × 3 km à allure course', '2 × 3 km à 5:10, récup 3 min', 9,
    [warm, { kind: 'work', label: '2 × 3 km à 5:10', min: 34, pace: PACES.course, reps: 2, recovery: '3 min' }, cool()]),
  muscu('2026-12-31', 'derniere'),
  run('2027-01-03', '8 km, dernier km à allure course', '7 km tranquille puis 1 km à 5:10', 8,
    [{ kind: 'easy', label: '7 km EF', min: 44, pace: PACES.ef }, { kind: 'work', label: '1 km à 5:10', min: 5, pace: PACES.course }]),

  // Semaine 7 · Affûtage
  run('2027-01-05', '3 × 1 km à allure course', '3 × 1 km à 5:10 puis 4 accélérations', 6.5,
    [warm, { kind: 'work', label: '3 × 1 km à 5:10', min: 16, pace: PACES.course, reps: 3, recovery: '2 min' }, { kind: 'work', label: '4 accélérations', min: 2, pace: PACES.rapide }, cool(5)]),
  run('2027-01-07', 'Footing d’activation', '20 min facile + 4 accélérations, pas de muscu jambes', 4,
    [{ kind: 'easy', label: '20 min EF', min: 20, pace: PACES.ef }, { kind: 'work', label: '4 accélérations', min: 2, pace: PACES.rapide }]),
  run('2027-01-09', 'Défi de la colline · 8 km', 'Objectif 41:20 (5:10/km). 1ᵉʳ km à 5:15–5:20, côtes à l’effort, accélère sur les 2 derniers km.', 8,
    [{ kind: 'warm', label: 'Échauffement 10 min', min: 10, pace: PACES.ef }, { kind: 'race', label: '8 km à 5:10', min: 41, pace: PACES.course }], { race: true }),
];

// ───────── Dates ─────────

/** Date du jour au format AAAA-MM-JJ, heure locale. */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysKey(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

export function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86_400_000);
}

/** Lundi de la semaine d'une date. */
export function mondayOf(key) {
  const dow = (parseKey(key).getDay() + 6) % 7;
  return addDaysKey(key, -dow);
}

/** Numéro de semaine du plan (1 à 7), 0 avant le début, 8 après la course. */
export function planWeek(key) {
  const diff = daysBetween(PLAN_START, key);
  if (diff < 0) return 0;
  return Math.min(PLAN_WEEKS + 1, Math.floor(diff / 7) + 1);
}

export function phaseOf(week) {
  return PHASES.find(p => p.weeks.includes(week))?.name ?? '';
}

/** Séances du plan, avec les déplacements choisis par l'utilisateur (moves : { id → nouvelle date }). */
export function sessionsWithMoves(moves = {}) {
  return SESSIONS.map(s => (moves[s.id] ? { ...s, date: moves[s.id], movedFrom: s.date } : s))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function sessionsOfWeek(mondayKey, moves) {
  const end = addDaysKey(mondayKey, 6);
  return sessionsWithMoves(moves).filter(s => s.date >= mondayKey && s.date <= end);
}

export function sessionsOn(key, moves) {
  return sessionsWithMoves(moves).filter(s => s.date === key);
}

export function nextSession(key, moves) {
  return sessionsWithMoves(moves).find(s => s.date > key && !s.optional);
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function formatDay(key, { short = false, withDow = true } = {}) {
  const d = parseKey(key);
  const dow = short ? JOURS_COURTS[d.getDay()] : JOURS[d.getDay()];
  const txt = `${d.getDate()} ${short ? MOIS_COURTS[d.getMonth()] : MOIS[d.getMonth()]}`;
  return withDow ? `${dow} ${txt}` : txt;
}

export const dowShort = (key) => JOURS_COURTS[parseKey(key).getDay()];
export const dayNum = (key) => parseKey(key).getDate();
