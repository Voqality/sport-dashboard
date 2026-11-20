// Recettes « hybrides » et liste de courses (calculs purs, testés avec npm run test).
// Valeurs nutritionnelles : estimations par portion, arrondies.

export const AISLES = [
  { id: 'fruits-legumes', name: 'Fruits et légumes' },
  { id: 'boucherie', name: 'Boucherie et poissonnerie' },
  { id: 'cremerie', name: 'Crèmerie et œufs' },
  { id: 'feculents', name: 'Pâtes, riz et céréales' },
  { id: 'conserves', name: 'Conserves et sauces' },
  { id: 'epicerie', name: 'Épicerie sucrée et fruits secs' },
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
    id: 'overnight-oats', meal: 'petit-dej', protein: 'laitier', title: 'Overnight oats whey-banane', servings: 1, minutes: 5,
    tags: ['pre-run', 'rapide'], when: 'Petit-déjeuner, 2 h avant une séance',
    macros: { kcal: 560, p: 38, g: 80, l: 10 },
    ingredients: [i('Flocons d’avoine', 70, 'g', 'feculents'), i('Lait demi-écrémé', 200, 'ml', 'cremerie'), i('Whey', 30, 'g', 'nutrition'), i('Banane', 1, 'pièce', 'fruits-legumes'), i('Miel', 10, 'g', 'epicerie', true)],
    steps: ['La veille, mélange flocons, lait et whey dans un bocal.', 'Laisse une nuit au frigo.', 'Le matin, ajoute la banane en rondelles et le miel.'],
  },
  {
    id: 'bowl-poulet', meal: 'plat', protein: 'poulet', title: 'Bowl riz, poulet et légumes', servings: 2, minutes: 25,
    tags: ['post-muscu', 'batch'], when: 'Déjeuner ou dîner après la muscu',
    macros: { kcal: 560, p: 45, g: 70, l: 9 },
    ingredients: [i('Riz basmati', 160, 'g', 'feculents'), i('Blanc de poulet', 300, 'g', 'boucherie'), i('Brocoli', 300, 'g', 'fruits-legumes'), i('Poivron', 1, 'pièce', 'fruits-legumes'), i('Sauce soja', 20, 'ml', 'conserves', true), i('Huile d’olive', 10, 'ml', 'conserves', true)],
    steps: ['Fais cuire le riz.', 'Coupe le poulet en dés et saisis-le 6 à 8 min à la poêle avec l’huile.', 'Ajoute brocoli et poivron, 5 min, puis la sauce soja.', 'Sers sur le riz.'],
  },
  {
    id: 'pates-thon', meal: 'plat', protein: 'poisson', title: 'Pâtes au thon et tomates', servings: 2, minutes: 20,
    tags: ['veille-course', 'pre-run'], when: 'La veille d’une course ou d’une séance longue',
    macros: { kcal: 620, p: 42, g: 85, l: 10 },
    ingredients: [i('Pâtes', 200, 'g', 'feculents'), i('Thon au naturel', 280, 'g', 'conserves'), i('Coulis de tomate', 400, 'g', 'conserves'), i('Oignon', 1, 'pièce', 'fruits-legumes'), i('Parmesan', 20, 'g', 'cremerie'), i('Huile d’olive', 10, 'ml', 'conserves', true)],
    steps: ['Fais cuire les pâtes.', 'Fais revenir l’oignon émincé dans l’huile, ajoute le coulis, 10 min.', 'Ajoute le thon émietté, mélange aux pâtes, parsème de parmesan.'],
  },
  {
    id: 'omelette-patate', meal: 'plat', protein: 'oeufs', title: 'Omelette patate douce et feta', servings: 1, minutes: 20,
    tags: ['recup'], when: 'Dîner, jour de repos ou après une sortie',
    macros: { kcal: 520, p: 30, g: 42, l: 25 },
    ingredients: [i('Œufs', 3, 'pièce', 'cremerie'), i('Patate douce', 200, 'g', 'fruits-legumes'), i('Feta', 40, 'g', 'cremerie'), i('Épinards frais', 50, 'g', 'fruits-legumes')],
    steps: ['Coupe la patate douce en petits dés et fais-la dorer 10 min à la poêle.', 'Ajoute les épinards, puis les œufs battus.', 'Émiette la feta, couvre 3 min.'],
  },
  {
    id: 'chili', meal: 'plat', protein: 'vegetarien', title: 'Chili sin carne', servings: 4, minutes: 35,
    tags: ['batch', 'recup'], when: 'À préparer le dimanche pour la semaine',
    macros: { kcal: 560, p: 28, g: 95, l: 5 },
    ingredients: [i('Haricots rouges', 800, 'g', 'conserves'), i('Lentilles corail', 200, 'g', 'feculents'), i('Tomates concassées', 800, 'g', 'conserves'), i('Oignon', 2, 'pièce', 'fruits-legumes'), i('Poivron', 2, 'pièce', 'fruits-legumes'), i('Riz basmati', 300, 'g', 'feculents'), i('Épices chili', 10, 'g', 'conserves', true)],
    steps: ['Fais revenir oignons et poivrons.', 'Ajoute tomates, lentilles rincées, épices et 300 ml d’eau : 20 min.', 'Ajoute les haricots égouttés, 5 min.', 'Sers avec le riz. Se garde 4 jours au frigo.'],
  },
  {
    id: 'skyr', meal: 'collation', protein: 'laitier', title: 'Skyr, fruits rouges et granola', servings: 1, minutes: 2,
    tags: ['post-muscu', 'rapide'], when: 'Collation juste après la séance',
    macros: { kcal: 370, p: 30, g: 50, l: 5 },
    ingredients: [i('Skyr nature', 250, 'g', 'cremerie'), i('Fruits rouges surgelés', 100, 'g', 'surgeles'), i('Granola', 30, 'g', 'feculents'), i('Miel', 15, 'g', 'epicerie', true)],
    steps: ['Mélange le skyr et les fruits rouges.', 'Ajoute le granola et le miel au moment de manger.'],
  },
  {
    id: 'wrap-poulet', meal: 'plat', protein: 'poulet', title: 'Wraps poulet, avocat et crudités', servings: 2, minutes: 15,
    tags: ['rapide', 'post-muscu'], when: 'Déjeuner rapide',
    macros: { kcal: 560, p: 42, g: 50, l: 20 },
    ingredients: [i('Tortillas', 4, 'pièce', 'boulangerie'), i('Blanc de poulet', 250, 'g', 'boucherie'), i('Avocat', 1, 'pièce', 'fruits-legumes'), i('Tomate', 2, 'pièce', 'fruits-legumes'), i('Salade', 1, 'pièce', 'fruits-legumes'), i('Fromage blanc', 100, 'g', 'cremerie')],
    steps: ['Fais cuire le poulet en lamelles.', 'Écrase l’avocat avec le fromage blanc, sel et poivre.', 'Garnis les tortillas : crème d’avocat, poulet, tomates, salade.'],
  },
  {
    id: 'saumon', meal: 'plat', protein: 'poisson', title: 'Saumon, pommes de terre et haricots verts', servings: 2, minutes: 30,
    tags: ['recup'], when: 'Dîner',
    macros: { kcal: 580, p: 34, g: 50, l: 26 },
    ingredients: [i('Pavés de saumon', 2, 'pièce', 'boucherie'), i('Pommes de terre', 500, 'g', 'fruits-legumes'), i('Haricots verts', 300, 'g', 'surgeles'), i('Citron', 1, 'pièce', 'fruits-legumes')],
    steps: ['Fais cuire les pommes de terre à l’eau 20 min.', 'Cuis les haricots verts 8 min.', 'Saisis le saumon 4 min de chaque côté, arrose de citron.'],
  },
  {
    id: 'pancakes', meal: 'petit-dej', protein: 'oeufs', title: 'Pancakes protéinés à la banane', servings: 1, minutes: 15,
    tags: ['pre-run'], when: 'Brunch ou 2 h avant une séance',
    macros: { kcal: 500, p: 38, g: 62, l: 12 },
    ingredients: [i('Flocons d’avoine', 50, 'g', 'feculents'), i('Œufs', 2, 'pièce', 'cremerie'), i('Banane', 1, 'pièce', 'fruits-legumes'), i('Whey', 20, 'g', 'nutrition')],
    steps: ['Mixe flocons, œufs, banane et whey.', 'Fais cuire de petites crêpes épaisses, 2 min par face, dans une poêle bien chaude.'],
  },
  {
    id: 'bolognaise', meal: 'plat', protein: 'boeuf', title: 'Pâtes complètes bolognaise express', servings: 2, minutes: 20,
    tags: ['post-muscu', 'batch'], when: 'Dîner après la muscu',
    macros: { kcal: 640, p: 45, g: 80, l: 14 },
    ingredients: [i('Pâtes complètes', 200, 'g', 'feculents'), i('Bœuf haché 5 %', 250, 'g', 'boucherie'), i('Coulis de tomate', 400, 'g', 'conserves'), i('Courgette', 1, 'pièce', 'fruits-legumes'), i('Oignon', 1, 'pièce', 'fruits-legumes')],
    steps: ['Fais cuire les pâtes.', 'Fais dorer oignon et bœuf, ajoute la courgette en dés puis le coulis : 10 min.', 'Mélange avec les pâtes.'],
  },
  // ── Petits-déjeuners ──
  {
    id: 'tartines-oeufs', meal: 'petit-dej', protein: 'oeufs', title: 'Tartines complètes, œufs brouillés et avocat', servings: 1, minutes: 10,
    tags: ['rapide', 'recup'], when: 'Petit-déjeuner salé',
    macros: { kcal: 520, p: 26, g: 45, l: 24 },
    ingredients: [i('Pain complet', 100, 'g', 'boulangerie'), i('Œufs', 2, 'pièce', 'cremerie'), i('Avocat', 0.5, 'pièce', 'fruits-legumes')],
    steps: ['Fais griller le pain.', 'Brouille les œufs à feu doux.', 'Écrase l’avocat sur le pain, ajoute les œufs, sel et poivre.'],
  },
  {
    id: 'porridge-pomme', meal: 'petit-dej', protein: 'laitier', title: 'Porridge pomme-cannelle et fromage blanc', servings: 1, minutes: 10,
    tags: ['pre-run'], when: 'Petit-déjeuner, 2 h avant une séance',
    macros: { kcal: 520, p: 30, g: 75, l: 9 },
    ingredients: [i('Flocons d’avoine', 60, 'g', 'feculents'), i('Lait demi-écrémé', 250, 'ml', 'cremerie'), i('Pomme', 1, 'pièce', 'fruits-legumes'), i('Fromage blanc', 150, 'g', 'cremerie'), i('Cannelle', 2, 'g', 'epicerie', true)],
    steps: ['Fais cuire les flocons dans le lait 5 min en remuant.', 'Ajoute la pomme en dés et la cannelle.', 'Sers avec le fromage blanc par-dessus.'],
  },
  {
    id: 'smoothie-bowl', meal: 'petit-dej', protein: 'laitier', title: 'Smoothie bowl banane-myrtilles', servings: 1, minutes: 5,
    tags: ['pre-run', 'rapide'], when: 'Petit-déjeuner léger avant une séance',
    macros: { kcal: 480, p: 38, g: 70, l: 5 },
    ingredients: [i('Banane', 1, 'pièce', 'fruits-legumes'), i('Myrtilles surgelées', 100, 'g', 'surgeles'), i('Skyr nature', 150, 'g', 'cremerie'), i('Flocons d’avoine', 30, 'g', 'feculents'), i('Whey', 20, 'g', 'nutrition')],
    steps: ['Mixe la banane, les myrtilles, le skyr et la whey.', 'Verse dans un bol et parsème de flocons.'],
  },
  {
    id: 'bagel-saumon', meal: 'petit-dej', protein: 'poisson', title: 'Bagel saumon fumé et fromage frais', servings: 1, minutes: 5,
    tags: ['rapide'], when: 'Petit-déjeuner ou brunch',
    macros: { kcal: 480, p: 28, g: 52, l: 16 },
    ingredients: [i('Bagels', 1, 'pièce', 'boulangerie'), i('Saumon fumé', 60, 'g', 'boucherie'), i('Fromage frais', 30, 'g', 'cremerie'), i('Concombre', 0.25, 'pièce', 'fruits-legumes')],
    steps: ['Toaste le bagel.', 'Tartine de fromage frais, ajoute le saumon et des rondelles de concombre.'],
  },

  // ── Plats ──
  {
    id: 'curry-pois-chiches', meal: 'plat', protein: 'vegetarien', title: 'Curry de pois chiches et épinards', servings: 3, minutes: 25,
    tags: ['batch', 'recup'], when: 'Dîner, se prépare pour plusieurs jours',
    macros: { kcal: 600, p: 20, g: 90, l: 15 },
    ingredients: [i('Pois chiches', 530, 'g', 'conserves'), i('Lait de coco léger', 400, 'ml', 'conserves'), i('Épinards frais', 200, 'g', 'fruits-legumes'), i('Oignon', 1, 'pièce', 'fruits-legumes'), i('Riz basmati', 240, 'g', 'feculents'), i('Curry en poudre', 10, 'g', 'epicerie', true)],
    steps: ['Fais cuire le riz.', 'Fais revenir l’oignon avec le curry.', 'Ajoute pois chiches égouttés et lait de coco : 10 min.', 'Ajoute les épinards jusqu’à ce qu’ils fondent.'],
  },
  {
    id: 'dinde-quinoa', meal: 'plat', protein: 'dinde', title: 'Dinde, quinoa et légumes rôtis', servings: 2, minutes: 30,
    tags: ['post-muscu'], when: 'Dîner après la muscu',
    macros: { kcal: 540, p: 45, g: 60, l: 10 },
    ingredients: [i('Escalopes de dinde', 300, 'g', 'boucherie'), i('Quinoa', 160, 'g', 'feculents'), i('Courgette', 1, 'pièce', 'fruits-legumes'), i('Poivron', 1, 'pièce', 'fruits-legumes'), i('Huile d’olive', 10, 'ml', 'conserves', true)],
    steps: ['Fais rôtir courgette et poivron en dés au four, 20 min à 200 °C, avec l’huile.', 'Cuis le quinoa 12 min.', 'Saisis la dinde 3 min de chaque côté.'],
  },
  {
    id: 'cabillaud-riz', meal: 'plat', protein: 'poisson', title: 'Cabillaud, riz et poêlée de légumes', servings: 2, minutes: 25,
    tags: ['recup'], when: 'Dîner léger',
    macros: { kcal: 500, p: 40, g: 68, l: 5 },
    ingredients: [i('Dos de cabillaud', 300, 'g', 'boucherie'), i('Riz basmati', 160, 'g', 'feculents'), i('Poêlée de légumes surgelée', 400, 'g', 'surgeles'), i('Citron', 1, 'pièce', 'fruits-legumes')],
    steps: ['Fais cuire le riz.', 'Fais chauffer la poêlée de légumes.', 'Cuis le cabillaud 4 min de chaque côté à la poêle, arrose de citron.'],
  },
  {
    id: 'steak-patate-douce', meal: 'plat', protein: 'boeuf', title: 'Steak haché, patates douces rôties et salade', servings: 2, minutes: 35,
    tags: ['post-muscu'], when: 'Dîner après la muscu',
    macros: { kcal: 600, p: 38, g: 65, l: 18 },
    ingredients: [i('Steaks hachés 5 %', 2, 'pièce', 'boucherie'), i('Patate douce', 500, 'g', 'fruits-legumes'), i('Salade', 1, 'pièce', 'fruits-legumes'), i('Tomate', 2, 'pièce', 'fruits-legumes'), i('Huile d’olive', 10, 'ml', 'conserves', true)],
    steps: ['Coupe les patates douces en frites, huile, four 25 min à 210 °C.', 'Cuis les steaks à la poêle.', 'Sers avec la salade et les tomates.'],
  },
  {
    id: 'poke-thon', meal: 'plat', protein: 'poisson', title: 'Poke bowl thon, riz et edamame', servings: 2, minutes: 20,
    tags: ['post-muscu', 'rapide'], when: 'Déjeuner frais',
    macros: { kcal: 560, p: 42, g: 70, l: 10 },
    ingredients: [i('Riz basmati', 160, 'g', 'feculents'), i('Thon au naturel', 280, 'g', 'conserves'), i('Edamame surgelés', 150, 'g', 'surgeles'), i('Concombre', 1, 'pièce', 'fruits-legumes'), i('Carotte', 2, 'pièce', 'fruits-legumes'), i('Sauce soja', 20, 'ml', 'conserves', true)],
    steps: ['Fais cuire le riz et laisse tiédir.', 'Cuis les edamame 4 min.', 'Dispose riz, thon, edamame, concombre et carotte râpée ; arrose de sauce soja.'],
  },
  {
    id: 'gnocchis-pesto', meal: 'plat', protein: 'poulet', title: 'Gnocchis, poulet, pesto et tomates cerises', servings: 2, minutes: 15,
    tags: ['veille-course', 'rapide'], when: 'Dîner riche en glucides avant une grosse séance',
    macros: { kcal: 650, p: 38, g: 85, l: 17 },
    ingredients: [i('Gnocchis', 500, 'g', 'feculents'), i('Blanc de poulet', 250, 'g', 'boucherie'), i('Pesto', 60, 'g', 'conserves'), i('Tomates cerises', 250, 'g', 'fruits-legumes')],
    steps: ['Saisis le poulet en dés.', 'Fais dorer les gnocchis à la poêle 6 min.', 'Ajoute tomates cerises et pesto, mélange 2 min.'],
  },
  {
    id: 'risotto-champignons', meal: 'plat', protein: 'poulet', title: 'Risotto champignons et poulet', servings: 2, minutes: 35,
    tags: ['recup'], when: 'Dîner du dimanche',
    macros: { kcal: 600, p: 42, g: 70, l: 14 },
    ingredients: [i('Riz à risotto', 160, 'g', 'feculents'), i('Champignons de Paris', 250, 'g', 'fruits-legumes'), i('Blanc de poulet', 250, 'g', 'boucherie'), i('Oignon', 1, 'pièce', 'fruits-legumes'), i('Parmesan', 30, 'g', 'cremerie'), i('Bouillon cube', 1, 'pièce', 'conserves', true)],
    steps: ['Fais revenir oignon et riz 2 min.', 'Ajoute le bouillon louche par louche pendant 18 min.', 'Pendant ce temps, saisis poulet et champignons.', 'Mélange le tout avec le parmesan.'],
  },
  {
    id: 'tortilla', meal: 'plat', protein: 'oeufs', title: 'Tortilla de pommes de terre', servings: 2, minutes: 30,
    tags: ['recup', 'batch'], when: 'Dîner ou repas à emporter',
    macros: { kcal: 520, p: 24, g: 45, l: 26 },
    ingredients: [i('Œufs', 6, 'pièce', 'cremerie'), i('Pommes de terre', 500, 'g', 'fruits-legumes'), i('Oignon', 1, 'pièce', 'fruits-legumes'), i('Huile d’olive', 20, 'ml', 'conserves', true)],
    steps: ['Fais cuire pommes de terre en fines tranches et oignon à la poêle, 15 min.', 'Verse les œufs battus, cuis à feu doux 8 min.', 'Retourne avec une assiette, 3 min de plus.'],
  },
  {
    id: 'dahl', meal: 'plat', protein: 'vegetarien', title: 'Dahl de lentilles corail et riz', servings: 3, minutes: 30,
    tags: ['batch', 'recup'], when: 'Dîner, se garde 3 jours',
    macros: { kcal: 580, p: 24, g: 95, l: 10 },
    ingredients: [i('Lentilles corail', 250, 'g', 'feculents'), i('Lait de coco léger', 400, 'ml', 'conserves'), i('Tomates concassées', 400, 'g', 'conserves'), i('Oignon', 1, 'pièce', 'fruits-legumes'), i('Riz basmati', 240, 'g', 'feculents'), i('Curry en poudre', 10, 'g', 'epicerie', true)],
    steps: ['Fais revenir l’oignon avec le curry.', 'Ajoute lentilles rincées, tomates, lait de coco et 300 ml d’eau : 20 min.', 'Sers avec le riz.'],
  },
  {
    id: 'porc-nouilles', meal: 'plat', protein: 'porc', title: 'Sauté de porc, nouilles et brocoli', servings: 2, minutes: 20,
    tags: ['post-muscu', 'rapide'], when: 'Dîner rapide après la muscu',
    macros: { kcal: 580, p: 44, g: 65, l: 12 },
    ingredients: [i('Filet mignon de porc', 300, 'g', 'boucherie'), i('Nouilles chinoises', 160, 'g', 'feculents'), i('Brocoli', 300, 'g', 'fruits-legumes'), i('Sauce soja', 30, 'ml', 'conserves', true)],
    steps: ['Cuis les nouilles.', 'Saisis le porc en lamelles, ajoute le brocoli en petits bouquets, 5 min.', 'Ajoute nouilles et sauce soja, mélange 2 min.'],
  },
  {
    id: 'pates-cremeuses', meal: 'plat', protein: 'poulet', title: 'Pâtes crémeuses poulet-épinards', servings: 2, minutes: 20,
    tags: ['veille-course', 'post-muscu'], when: 'Dîner riche en glucides',
    macros: { kcal: 680, p: 46, g: 80, l: 16 },
    ingredients: [i('Pâtes', 200, 'g', 'feculents'), i('Blanc de poulet', 250, 'g', 'boucherie'), i('Épinards frais', 150, 'g', 'fruits-legumes'), i('Crème légère', 150, 'ml', 'cremerie'), i('Parmesan', 20, 'g', 'cremerie')],
    steps: ['Cuis les pâtes.', 'Saisis le poulet, ajoute les épinards puis la crème : 3 min.', 'Mélange avec les pâtes et le parmesan.'],
  },
  {
    id: 'salade-riz', meal: 'plat', protein: 'poisson', title: 'Salade de riz, thon, maïs et œufs', servings: 2, minutes: 20,
    tags: ['batch'], when: 'Déjeuner à emporter',
    macros: { kcal: 540, p: 34, g: 70, l: 12 },
    ingredients: [i('Riz basmati', 160, 'g', 'feculents'), i('Thon au naturel', 140, 'g', 'conserves'), i('Maïs', 150, 'g', 'conserves'), i('Œufs', 2, 'pièce', 'cremerie'), i('Tomate', 2, 'pièce', 'fruits-legumes'), i('Huile d’olive', 10, 'ml', 'conserves', true)],
    steps: ['Cuis le riz et les œufs (10 min pour des œufs durs).', 'Laisse refroidir.', 'Mélange riz, thon, maïs, tomates et œufs en quartiers, assaisonne.'],
  },

  // ── Collations ──
  {
    id: 'riz-au-lait', meal: 'collation', protein: 'laitier', title: 'Riz au lait protéiné', servings: 2, minutes: 30,
    tags: ['recup'], when: 'Collation du soir',
    macros: { kcal: 380, p: 26, g: 55, l: 5 },
    ingredients: [i('Riz rond', 80, 'g', 'feculents'), i('Lait demi-écrémé', 500, 'ml', 'cremerie'), i('Whey', 30, 'g', 'nutrition'), i('Cannelle', 2, 'g', 'epicerie', true)],
    steps: ['Cuis le riz dans le lait à feu doux 25 min en remuant.', 'Hors du feu, ajoute la whey et la cannelle.'],
  },
  {
    id: 'tartine-cacahuete', meal: 'collation', protein: 'vegetarien', title: 'Tartine beurre de cacahuète et banane', servings: 1, minutes: 3,
    tags: ['pre-run', 'rapide'], when: '1 h avant une séance',
    macros: { kcal: 380, p: 12, g: 55, l: 12 },
    ingredients: [i('Pain complet', 60, 'g', 'boulangerie'), i('Beurre de cacahuète', 20, 'g', 'epicerie'), i('Banane', 1, 'pièce', 'fruits-legumes')],
    steps: ['Tartine le beurre de cacahuète.', 'Ajoute la banane en rondelles.'],
  },
  {
    id: 'fromage-blanc-noix', meal: 'collation', protein: 'laitier', title: 'Fromage blanc, noix et miel', servings: 1, minutes: 2,
    tags: ['recup', 'rapide'], when: 'Collation ou dessert',
    macros: { kcal: 330, p: 20, g: 25, l: 16 },
    ingredients: [i('Fromage blanc', 200, 'g', 'cremerie'), i('Noix', 20, 'g', 'epicerie'), i('Miel', 15, 'g', 'epicerie', true)],
    steps: ['Verse le fromage blanc dans un bol, ajoute noix concassées et miel.'],
  },
  {
    id: 'shaker-banane', meal: 'collation', protein: 'laitier', title: 'Shaker whey, lait et banane', servings: 1, minutes: 2,
    tags: ['post-muscu', 'rapide'], when: 'Dans les 30 min après la séance',
    macros: { kcal: 380, p: 34, g: 48, l: 5 },
    ingredients: [i('Whey', 30, 'g', 'nutrition'), i('Lait demi-écrémé', 300, 'ml', 'cremerie'), i('Banane', 1, 'pièce', 'fruits-legumes')],
    steps: ['Secoue la whey avec le lait.', 'Mange la banane à côté, ou mixe le tout.'],
  },
  {
    id: 'energy-balls', meal: 'collation', protein: 'vegetarien', title: 'Energy balls avoine, dattes et cacahuète', servings: 4, minutes: 15,
    tags: ['pre-run', 'batch'], when: '1 h avant une séance, ou pendant une sortie longue',
    macros: { kcal: 260, p: 7, g: 38, l: 9 },
    ingredients: [i('Dattes', 150, 'g', 'epicerie'), i('Flocons d’avoine', 80, 'g', 'feculents'), i('Beurre de cacahuète', 40, 'g', 'epicerie'), i('Cacao en poudre', 10, 'g', 'epicerie', true)],
    steps: ['Mixe les dattes dénoyautées avec le beurre de cacahuète.', 'Ajoute flocons et cacao, mixe encore.', 'Forme des boules, 1 h au frigo. Se garde 1 semaine.'],
  },
  {
    id: 'galettes-jambon', meal: 'collation', protein: 'porc', title: 'Galettes de riz, jambon et fromage frais', servings: 1, minutes: 3,
    tags: ['rapide', 'recup'], when: 'Collation salée',
    macros: { kcal: 300, p: 20, g: 30, l: 9 },
    ingredients: [i('Galettes de riz', 4, 'pièce', 'feculents'), i('Jambon blanc', 2, 'pièce', 'boucherie'), i('Fromage frais', 30, 'g', 'cremerie')],
    steps: ['Tartine les galettes de fromage frais.', 'Ajoute le jambon.'],
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

// ───────── Menu de la semaine (varié) ─────────

export const MEAL_TYPES = { 'petit-dej': 'Petits-déjeuners', plat: 'Plats', collation: 'Collations' };
/** Nombre de repas à prévoir par défaut sur une semaine. */
export const DEFAULT_NEEDS = { 'petit-dej': 5, plat: 8, collation: 3 };
/** Combien de fois on mange en moyenne la même recette dans la semaine (on cuisine une fois, on mange 2 ou 3 fois). */
const REPEAT = { 'petit-dej': 3, plat: 2, collation: 2 };

/** Générateur pseudo-aléatoire reproductible (même graine → même menu). */
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const a = [...list];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

/** Ordonne les candidats : d'abord ceux qui n'ont pas été mangés récemment, dans un ordre aléatoire. */
function ranked(type, rand, avoid, exclude = []) {
  const pool = RECIPES.filter(r => r.meal === type && !exclude.includes(r.id));
  const fresh = shuffle(pool.filter(r => !avoid.includes(r.id)), rand);
  const recent = shuffle(pool.filter(r => avoid.includes(r.id)), rand);
  return [...fresh, ...recent];
}

/**
 * Génère un menu varié : { recetteId: portions }.
 * - seed : rend le menu reproductible (ex. « 2026-11-23#0 ») ; changer la graine donne un autre menu.
 * - needs : nombre de repas par type.
 * - avoid : recettes mangées les semaines précédentes (choisies en dernier recours seulement).
 * - mustTag : un tag à inclure obligatoirement parmi les plats (ex. « veille-course » la semaine de la course).
 */
export function generateMenu({ seed, needs = DEFAULT_NEEDS, avoid = [], mustTag = null } = {}) {
  const rand = rng(seed);
  const menu = {};
  for (const type of Object.keys(MEAL_TYPES)) {
    let remaining = Math.max(0, Math.round(needs[type] ?? 0));
    if (!remaining) continue;
    const target = Math.max(1, Math.ceil(remaining / REPEAT[type]));
    let candidates = ranked(type, rand, avoid);
    const picked = [];
    if (type === 'plat' && mustTag) {
      const forced = candidates.find(r => r.tags.includes(mustTag));
      if (forced) picked.push(forced);
    }
    // Variété des protéines : on évite deux plats avec la même protéine tant que c'est possible.
    for (const r of candidates) {
      if (picked.length >= target) break;
      if (picked.includes(r)) continue;
      if (type === 'plat' && picked.some(p => p.protein === r.protein) && candidates.some(c => !picked.includes(c) && !picked.some(p => p.protein === c.protein))) continue;
      picked.push(r);
    }
    for (const r of candidates) { if (picked.length >= target) break; if (!picked.includes(r)) picked.push(r); }
    // Répartition des portions : une recette « batch » donne toutes ses portions, les autres se partagent le reste.
    picked.forEach((r, idx) => {
      const left = picked.length - idx;
      const share = r.servings >= 3 ? Math.min(r.servings, remaining - (left - 1)) : Math.ceil(remaining / left);
      const n = Math.max(1, Math.min(remaining - (left - 1), share));
      menu[r.id] = n;
      remaining -= n;
    });
  }
  return menu;
}

/** Remplace une recette du menu par une autre du même type, absente du menu et si possible pas mangée récemment. */
export function swapRecipe(menu, id, { seed, avoid = [] } = {}) {
  const r = recipeById(id);
  if (!r || !menu[id]) return menu;
  const rand = rng(`${seed}|${id}`);
  const inMenu = Object.keys(menu);
  const others = Object.keys(menu).map(recipeById).filter(x => x && x.meal === 'plat' && x.id !== id);
  let candidates = ranked(r.meal, rand, avoid, inMenu);
  if (r.meal === 'plat') {
    const diverse = candidates.filter(c => !others.some(o => o.protein === c.protein));
    if (diverse.length) candidates = [...diverse, ...candidates.filter(c => !diverse.includes(c))];
  }
  const next = candidates[0];
  if (!next) return menu;
  const out = {};
  for (const [k, v] of Object.entries(menu)) out[k === id ? next.id : k] = v;
  return out;
}
