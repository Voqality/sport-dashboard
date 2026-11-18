// Catalogue minimal d'exercices pour le prototype : muscles sollicités (poids dont la somme = 1)
// et stress excentrique sur les jambes (0-3, cf. exercises.eccentric_leg_stress du doc 02).
import type { MuscleCompartment } from './types.ts';

export interface ExerciseDef {
  name: string;
  aliases: string[];
  muscles: Partial<Record<MuscleCompartment, number>>;
  eccentric: number;
}

export const EXERCISES: ExerciseDef[] = [
  { name: 'Squat', aliases: ['squat', 'back squat', 'squat barre', 'squat arriere'], muscles: { quads: 0.5, glutes: 0.25, hamstrings: 0.1, core: 0.1, back: 0.05 }, eccentric: 1 },
  { name: 'Front squat', aliases: ['front squat', 'squat avant'], muscles: { quads: 0.6, glutes: 0.2, core: 0.15, back: 0.05 }, eccentric: 1 },
  { name: 'Presse à cuisses', aliases: ['presse', 'presse a cuisses', 'leg press'], muscles: { quads: 0.6, glutes: 0.3, hamstrings: 0.1 }, eccentric: 0 },
  { name: 'Hack squat', aliases: ['hack squat'], muscles: { quads: 0.7, glutes: 0.25, hamstrings: 0.05 }, eccentric: 1 },
  { name: 'Soulevé de terre', aliases: ['souleve de terre', 'deadlift', 'sdt', 'trap bar', 'souleve de terre trap bar'], muscles: { hamstrings: 0.3, glutes: 0.3, back: 0.25, quads: 0.1, arms: 0.05 }, eccentric: 1 },
  { name: 'Soulevé de terre roumain', aliases: ['souleve de terre roumain', 'rdl', 'romanian deadlift', 'sdt roumain', 'souleve de terre jambes tendues'], muscles: { hamstrings: 0.55, glutes: 0.3, back: 0.15 }, eccentric: 3 },
  { name: 'Fentes', aliases: ['fentes', 'fente', 'lunges', 'fentes marchees', 'walking lunges'], muscles: { quads: 0.5, glutes: 0.35, hamstrings: 0.1, core: 0.05 }, eccentric: 2 },
  { name: 'Squat bulgare', aliases: ['squat bulgare', 'bulgare', 'bulgarian split squat', 'split squat'], muscles: { quads: 0.5, glutes: 0.35, hamstrings: 0.1, core: 0.05 }, eccentric: 3 },
  { name: 'Step-up', aliases: ['step up', 'step-up', 'montees sur banc'], muscles: { quads: 0.5, glutes: 0.4, calves: 0.1 }, eccentric: 1 },
  { name: 'Hip thrust', aliases: ['hip thrust', 'pont fessier', 'glute bridge'], muscles: { glutes: 0.7, hamstrings: 0.2, quads: 0.1 }, eccentric: 0 },
  { name: 'Leg curl', aliases: ['leg curl', 'ischios machine', 'curl ischios'], muscles: { hamstrings: 1 }, eccentric: 1 },
  { name: 'Nordic curl', aliases: ['nordic', 'nordic curl', 'nordic hamstring'], muscles: { hamstrings: 0.9, glutes: 0.1 }, eccentric: 3 },
  { name: 'Leg extension', aliases: ['leg extension', 'extension quadriceps', 'quadriceps machine'], muscles: { quads: 1 }, eccentric: 0 },
  { name: 'Mollets', aliases: ['mollets', 'extension mollets', 'calf raise', 'mollets debout', 'mollets assis'], muscles: { calves: 1 }, eccentric: 1 },
  { name: 'Sauts / pliométrie', aliases: ['box jump', 'sauts', 'pliometrie', 'squat jump', 'pogo', 'bonds'], muscles: { quads: 0.35, calves: 0.35, glutes: 0.3 }, eccentric: 2 },
  { name: 'Kettlebell swing', aliases: ['kettlebell swing', 'swing', 'kb swing'], muscles: { glutes: 0.4, hamstrings: 0.35, back: 0.15, core: 0.1 }, eccentric: 1 },
  { name: 'Sled push', aliases: ['sled push', 'traineau', 'prowler', 'sled pull'], muscles: { quads: 0.45, glutes: 0.3, calves: 0.15, shoulders: 0.1 }, eccentric: 0 },
  { name: 'Wall ball', aliases: ['wall ball', 'wall balls'], muscles: { quads: 0.45, glutes: 0.2, shoulders: 0.25, core: 0.1 }, eccentric: 1 },
  { name: 'Développé couché', aliases: ['developpe couche', 'bench', 'bench press', 'dc', 'developpe couche halteres', 'developpe incline'], muscles: { chest: 0.6, arms: 0.25, shoulders: 0.15 }, eccentric: 0 },
  { name: 'Développé militaire', aliases: ['developpe militaire', 'overhead press', 'ohp', 'developpe epaules', 'developpe assis'], muscles: { shoulders: 0.6, arms: 0.25, core: 0.15 }, eccentric: 0 },
  { name: 'Pompes', aliases: ['pompes', 'push up', 'push-up', 'push ups'], muscles: { chest: 0.55, arms: 0.25, shoulders: 0.1, core: 0.1 }, eccentric: 0 },
  { name: 'Dips', aliases: ['dips'], muscles: { chest: 0.45, arms: 0.4, shoulders: 0.15 }, eccentric: 0 },
  { name: 'Tractions', aliases: ['tractions', 'pull up', 'pull-up', 'chin up', 'traction'], muscles: { back: 0.65, arms: 0.3, core: 0.05 }, eccentric: 0 },
  { name: 'Tirage', aliases: ['tirage', 'tirage vertical', 'lat pulldown', 'tirage horizontal', 'tirage poulie'], muscles: { back: 0.7, arms: 0.3 }, eccentric: 0 },
  { name: 'Rowing', aliases: ['rowing', 'rowing barre', 'rowing haltere', 'row', 'barbell row'], muscles: { back: 0.65, arms: 0.2, hamstrings: 0.05, core: 0.1 }, eccentric: 0 },
  { name: 'Curl biceps', aliases: ['curl', 'curl biceps', 'biceps', 'curl marteau'], muscles: { arms: 1 }, eccentric: 0 },
  { name: 'Triceps', aliases: ['triceps', 'extension triceps', 'barre au front', 'pushdown'], muscles: { arms: 1 }, eccentric: 0 },
  { name: 'Élévations latérales', aliases: ['elevations laterales', 'lateral raise', 'oiseau'], muscles: { shoulders: 1 }, eccentric: 0 },
  { name: 'Gainage', aliases: ['gainage', 'planche', 'plank', 'abdos', 'crunch', 'ab wheel', 'releve de jambes'], muscles: { core: 1 }, eccentric: 0 },
];

/** Normalise un nom : minuscules, sans accents, espaces simples. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const INDEX = new Map<string, ExerciseDef>();
for (const ex of EXERCISES) {
  INDEX.set(normalizeName(ex.name), ex);
  for (const a of ex.aliases) INDEX.set(normalizeName(a), ex);
}

/** Exercice inconnu : réparti « corps entier » pour ne pas ignorer la charge. */
export const GENERIC_EXERCISE: ExerciseDef = {
  name: 'Exercice non reconnu',
  aliases: [],
  muscles: { quads: 0.15, hamstrings: 0.1, glutes: 0.1, chest: 0.15, back: 0.2, shoulders: 0.1, arms: 0.1, core: 0.1 },
  eccentric: 0,
};

export function findExercise(name: string): ExerciseDef | undefined {
  const n = normalizeName(name);
  if (INDEX.has(n)) return INDEX.get(n);
  // Correspondance partielle : l'alias le plus long contenu dans le nom saisi.
  let best: ExerciseDef | undefined;
  let bestLen = 0;
  for (const [alias, ex] of INDEX) {
    if (alias.length > bestLen && (n.includes(alias) || alias.includes(n)) && n.length >= 3) {
      best = ex;
      bestLen = alias.length;
    }
  }
  return best;
}
