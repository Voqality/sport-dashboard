// Recettes « hybrides » et liste de courses (calculs purs, testés avec npm run test).
// Valeurs nutritionnelles : estimations par portion, arrondies.

export const AISLES = [
  { id: 'fruits-legumes', name: 'Fruits et légumes' },
  { id: 'boucherie', name: 'Boucherie et poissonnerie' },
  { id: 'cremerie', name: 'Crèmerie et œufs' },
  { id: 'feculents', name: 'Pâtes, riz et céréales' },
  { id: 'conserves', name: 'Conserves et sauces' },
  { id: 'boulangerie', name: 'Boulangerie' },
  { id: 'surgeles', name: 'Surgelés' },
  { id: 'nutrition', name: 'Nutrition sportive' },
  { id: 'divers', name: 'Divers' },
];

export const TAGS = {
  'pre-run': 'Avant une course',
  'post-muscu': 'Après la muscu',
  recup: 'Récupération',
  'veille-course': 'Veille de course',
  batch: 'Se garde 3–4 jours',
  rapide: 'Moins de 15 min',
};

// staple : produit de placard, listé à part (« à vérifier »).
const i = (name, qty, unit, aisle, staple = false) => ({ name, qty, unit, aisle, staple });

export const RECIPES = [
  {
    id: 'overnight-oats', title: 'Overnight oats whey-banane', servings: 1, minutes: 5,
    tags: ['pre-run', 'rapide'], when: 'Petit-déjeuner, 2 h avant une séance',
    macros: { kcal: 560, p: 38, g: 80, l: 10 },
    ingredients: [i('Flocons d’avoine', 70, 'g', 'feculents'), i('Lait demi-écrémé', 200, 'ml', 'cremerie'), i('Whey', 30, 'g', 'nutrition'), i('Banane', 1, 'pièce', 'fruits-legumes'), i('Miel', 10, 'g', 'conserves', true)],
    steps: ['La veille, mélange flocons, lait et whey dans un bocal.', 'Laisse une nuit au frigo.', 'Le matin, ajoute la banane en rondelles et le miel.'],
  },
  {
    id: 'bowl-poulet', title: 'Bowl riz, poulet et légumes', servings: 2, minutes: 25,
    tags: ['post-muscu', 'batch'], when: 'Déjeuner ou dîner après la muscu',
    macros: { kcal: 560, p: 45, g: 70, l: 9 },
    ingredients: [i('Riz basmati', 160, 'g', 'feculents'), i('Blanc de poulet', 300, 'g', 'boucherie'), i('Brocoli', 300, 'g', 'fruits-legumes'), i('Poivron', 1, 'pièce', 'fruits-legumes'), i('Sauce soja', 20, 'ml', 'conserves', true), i('Huile d’olive', 10, 'ml', 'conserves', true)],
    steps: ['Fais cuire le riz.', 'Coupe le poulet en dés et saisis-le 6 à 8 min à la poêle avec l’huile.', 'Ajoute brocoli et poivron, 5 min, puis la sauce soja.', 'Sers sur le riz.'],
  },
  {
    id: 'pates-thon', title: 'Pâtes au thon et tomates', servings: 2, minutes: 20,
    tags: ['veille-course', 'pre-run'], when: 'La veille d’une course ou d’une séance longue',
    macros: { kcal: 620, p: 42, g: 85, l: 10 },
    ingredients: [i('Pâtes', 200, 'g', 'feculents'), i('Thon au naturel', 280, 'g', 'conserves'), i('Coulis de tomate', 400, 'g', 'conserves'), i('Oignon', 1, 'pièce', 'fruits-legumes'), i('Parmesan', 20, 'g', 'cremerie'), i('Huile d’olive', 10, 'ml', 'conserves', true)],
    steps: ['Fais cuire les pâtes.', 'Fais revenir l’oignon émincé dans l’huile, ajoute le coulis, 10 min.', 'Ajoute le thon émietté, mélange aux pâtes, parsème de parmesan.'],
  },
  {
    id: 'omelette-patate', title: 'Omelette patate douce et feta', servings: 1, minutes: 20,
    tags: ['recup'], when: 'Dîner, jour de repos ou après une sortie',
    macros: { kcal: 520, p: 30, g: 42, l: 25 },
    ingredients: [i('Œufs', 3, 'pièce', 'cremerie'), i('Patate douce', 200, 'g', 'fruits-legumes'), i('Feta', 40, 'g', 'cremerie'), i('Épinards frais', 50, 'g', 'fruits-legumes')],
    steps: ['Coupe la patate douce en petits dés et fais-la dorer 10 min à la poêle.', 'Ajoute les épinards, puis les œufs battus.', 'Émiette la feta, couvre 3 min.'],
  },
  {
    id: 'chili', title: 'Chili sin carne', servings: 4, minutes: 35,
    tags: ['batch', 'recup'], when: 'À préparer le dimanche pour la semaine',
    macros: { kcal: 560, p: 28, g: 95, l: 5 },
    ingredients: [i('Haricots rouges', 800, 'g', 'conserves'), i('Lentilles corail', 200, 'g', 'feculents'), i('Tomates concassées', 800, 'g', 'conserves'), i('Oignon', 2, 'pièce', 'fruits-legumes'), i('Poivron', 2, 'pièce', 'fruits-legumes'), i('Riz basmati', 300, 'g', 'feculents'), i('Épices chili', 10, 'g', 'conserves', true)],
    steps: ['Fais revenir oignons et poivrons.', 'Ajoute tomates, lentilles rincées, épices et 300 ml d’eau : 20 min.', 'Ajoute les haricots égouttés, 5 min.', 'Sers avec le riz. Se garde 4 jours au frigo.'],
  },
  {
    id: 'skyr', title: 'Skyr, fruits rouges et granola', servings: 1, minutes: 2,
    tags: ['post-muscu', 'rapide'], when: 'Collation juste après la séance',
    macros: { kcal: 370, p: 30, g: 50, l: 5 },
    ingredients: [i('Skyr nature', 250, 'g', 'cremerie'), i('Fruits rouges surgelés', 100, 'g', 'surgeles'), i('Granola', 30, 'g', 'feculents'), i('Miel', 15, 'g', 'conserves', true)],
    steps: ['Mélange le skyr et les fruits rouges.', 'Ajoute le granola et le miel au moment de manger.'],
  },
  {
    id: 'wrap-poulet', title: 'Wraps poulet, avocat et crudités', servings: 2, minutes: 15,
    tags: ['rapide', 'post-muscu'], when: 'Déjeuner rapide',
    macros: { kcal: 560, p: 42, g: 50, l: 20 },
    ingredients: [i('Tortillas', 4, 'pièce', 'boulangerie'), i('Blanc de poulet', 250, 'g', 'boucherie'), i('Avocat', 1, 'pièce', 'fruits-legumes'), i('Tomate', 2, 'pièce', 'fruits-legumes'), i('Salade', 1, 'pièce', 'fruits-legumes'), i('Fromage blanc', 100, 'g', 'cremerie')],
    steps: ['Fais cuire le poulet en lamelles.', 'Écrase l’avocat avec le fromage blanc, sel et poivre.', 'Garnis les tortillas : crème d’avocat, poulet, tomates, salade.'],
  },
  {
    id: 'saumon', title: 'Saumon, pommes de terre et haricots verts', servings: 2, minutes: 30,
    tags: ['recup'], when: 'Dîner',
    macros: { kcal: 580, p: 34, g: 50, l: 26 },
    ingredients: [i('Pavés de saumon', 2, 'pièce', 'boucherie'), i('Pommes de terre', 500, 'g', 'fruits-legumes'), i('Haricots verts', 300, 'g', 'surgeles'), i('Citron', 1, 'pièce', 'fruits-legumes')],
    steps: ['Fais cuire les pommes de terre à l’eau 20 min.', 'Cuis les haricots verts 8 min.', 'Saisis le saumon 4 min de chaque côté, arrose de citron.'],
  },
  {
    id: 'pancakes', title: 'Pancakes protéinés à la banane', servings: 1, minutes: 15,
    tags: ['pre-run'], when: 'Brunch ou 2 h avant une séance',
    macros: { kcal: 500, p: 38, g: 62, l: 12 },
    ingredients: [i('Flocons d’avoine', 50, 'g', 'feculents'), i('Œufs', 2, 'pièce', 'cremerie'), i('Banane', 1, 'pièce', 'fruits-legumes'), i('Whey', 20, 'g', 'nutrition')],
    steps: ['Mixe flocons, œufs, banane et whey.', 'Fais cuire de petites crêpes épaisses, 2 min par face, dans une poêle bien chaude.'],
  },
  {
    id: 'bolognaise', title: 'Pâtes complètes bolognaise express', servings: 2, minutes: 20,
    tags: ['post-muscu', 'batch'], when: 'Dîner après la muscu',
    macros: { kcal: 640, p: 45, g: 80, l: 14 },
    ingredients: [i('Pâtes complètes', 200, 'g', 'feculents'), i('Bœuf haché 5 %', 250, 'g', 'boucherie'), i('Coulis de tomate', 400, 'g', 'conserves'), i('Courgette', 1, 'pièce', 'fruits-legumes'), i('Oignon', 1, 'pièce', 'fruits-legumes')],
    steps: ['Fais cuire les pâtes.', 'Fais dorer oignon et bœuf, ajoute la courgette en dés puis le coulis : 10 min.', 'Mélange avec les pâtes.'],
  },
];

export const recipeById = (id) => RECIPES.find(r => r.id === id);

/** Clé d'un article : même produit et même unité → même ligne. */
export const itemKey = (name, unit) => `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}|${unit}`;

/** Arrondi pratique pour les courses : grammes et ml à 10 près (5 près sous 100), pièces à l'unité supérieure. */
export function roundQty(qty, unit) {
  if (unit === 'pièce') return Math.ceil(qty - 1e-9);
  const step = qty < 100 ? 5 : 10;
  return Math.ceil(qty / step - 1e-9) * step;
}

export function fmtQty(qty, unit) {
  if (unit === 'pièce') return `× ${qty}`;
  if (qty >= 1000) return `${String(Math.round(qty / 100) / 10).replace('.', ',')} ${unit === 'g' ? 'kg' : 'l'}`;
  return `${qty} ${unit}`;
}

/**
 * Liste de courses à partir des portions choisies ({ recetteId: portions }) et des ajouts manuels.
 * Renvoie { aisles: [{ id, name, items }], staples: [...] } dans l'ordre des rayons.
 */
export function buildShoppingList(plan = {}, extras = []) {
  const map = new Map();
  for (const [id, portions] of Object.entries(plan)) {
    const r = recipeById(id);
    if (!r || !(portions > 0)) continue;
    const factor = portions / r.servings;
    for (const ing of r.ingredients) {
      const key = itemKey(ing.name, ing.unit);
      const cur = map.get(key) ?? { key, name: ing.name, unit: ing.unit, aisle: ing.aisle, staple: ing.staple, qty: 0, recipes: [] };
      cur.qty += ing.qty * factor;
      if (!cur.recipes.includes(r.title)) cur.recipes.push(r.title);
      map.set(key, cur);
    }
  }
  const items = [...map.values()].map(x => ({ ...x, qty: roundQty(x.qty, x.unit) }));
  for (const e of extras) items.push({ key: `extra|${e.id}`, name: e.name, unit: '', qty: 0, aisle: e.aisle ?? 'divers', staple: false, recipes: [], extra: true });

  const aisles = AISLES.map(a => ({
    ...a,
    items: items.filter(x => !x.staple && x.aisle === a.id).sort((x, y) => x.name.localeCompare(y.name, 'fr')),
  })).filter(a => a.items.length);
  const staples = items.filter(x => x.staple).sort((x, y) => x.name.localeCompare(y.name, 'fr'));
  return { aisles, staples };
}

/** Texte de la liste, pour l'envoyer par message. */
export function shoppingListText(list, checked = []) {
  const done = new Set(checked);
  const lines = ['🛒 Courses HYBRID'];
  for (const a of list.aisles) {
    const todo = a.items.filter(x => !done.has(x.key));
    if (!todo.length) continue;
    lines.push('', a.name.toUpperCase());
    for (const x of todo) lines.push(`☐ ${x.name}${x.qty ? ` ${fmtQty(x.qty, x.unit)}` : ''}`);
  }
  if (list.staples.length) lines.push('', 'À VÉRIFIER DANS LES PLACARDS', ...list.staples.map(x => `☐ ${x.name}`));
  return lines.join('\n');
}
