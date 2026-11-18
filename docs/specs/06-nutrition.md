# 6. Nutrition, supplémentation & supermarché intelligent

> Recommandations générales pour des adultes en bonne santé, fondées sur les consensus de nutrition du sport (ISSN, ACSM, IOC). L'app affiche un avertissement et oriente vers un diététicien-nutritionniste / médecin en cas de pathologie, grossesse, trouble du comportement alimentaire ou si l'utilisateur est mineur.

## 6.1 Calculateur de calories et de macros (dynamique, recalculé chaque jour)

### Dépense énergétique
```
BMR (Mifflin-St Jeor)   H : 10·kg + 6,25·cm − 5·âge + 5      F : 10·kg + 6,25·cm − 5·âge − 161
   (si % de masse grasse connu : Katch-McArdle  370 + 21,6 · masse maigre)
Base hors sport          BMR × NAP   avec NAP = 1,3 (sédentaire) · 1,45 (actif) · 1,6 (métier physique)
Course (net)             ≈ 1,0 kcal × kg × km  + 0,01 kcal × kg × D+ (m)
Musculation / HYROX      (MET − 1) × kg × h    MET : muscu 3,5 – 6 (selon densité), HYROX 8, foot 7
Total du jour (TDEE)     Base + Σ dépenses des séances (prévues le matin, réelles après import)
```
Les calories annoncées par les montres/Strava sont affichées mais **non utilisées** (souvent surestimées) ; le calcul interne prime.

### Objectif de composition
| Objectif | Ajustement | Garde-fous |
|---|---|---|
| Maintien / performance | 0 % | — |
| Recomposition | −10 % **les jours de repos/légers seulement** | jamais de déficit les jours durs |
| Sèche | −10 à −20 % | ≥ BMR ; pas de déficit les jours « dur/long » ; perte ≤ 0,5-1 %/sem. |
| Prise de masse | +5 à +10 % | prise ≤ 0,25-0,5 %/sem. |

### Périodisation des glucides selon la charge du jour (« fuel for the work required »)
| Type de jour | Critère (UA prévues) | Glucides g/kg | Protéines g/kg | Lipides |
|---|---|---|---|---|
| Repos | < 20 | 3-4 | 1,8-2,0 | complément, ≥ 0,8 g/kg et ≥ 20 % des kcal |
| Léger | 20-60 | 4-5 | 1,8 | idem |
| Modéré | 60-120 | 5-7 | 1,8 | idem |
| Dur (2 séances, seuil + muscu) | 120-200 | 6-8 | 2,0 | idem |
| Sortie longue > 90 min / très dur | > 200 ou SL | 8-10 | 1,8 | idem |
| Recharge pré-marathon (J-2, J-1) | course A | 10-12 | 1,5 | réduits, aliments pauvres en fibres |

- **Protéines** : 1,6-2,2 g/kg/j (jusqu'à 2,4 en sèche), réparties en **4-5 prises de 0,3-0,4 g/kg** ; option 30-40 g de caséine avant le coucher.
- **Hydratation** : ~35 ml/kg/j + 0,5-0,75 l par heure d'effort (ajusté à la chaleur), électrolytes au-delà de 90 min.
- **Timing autour des séances** (affiché dans la vue du jour) :
  - 2-3 h avant une séance qualité : repas riche en glucides (1-4 g/kg), **pauvre en fibres et en graisses**.
  - < 60 min avant : 30-60 g de glucides simples si besoin.
  - Pendant (> 60-75 min) : 30-60 g de glucides/h ; jusqu'à 90 g/h (glucose + fructose) sur marathon/trail long, si l'intestin a été entraîné.
  - Après : 0,3-0,4 g/kg de protéines + glucides (1-1,2 g/kg/h pendant 3-4 h si une autre séance a lieu dans les 8 h).
- Les cibles se **mettent à jour en temps réel** : séance ajoutée/supprimée, activité Strava plus longue que prévu → recalcul et notification (« +320 kcal, +60 g de glucides ce soir »).

## 6.2 Supplémentation

### Whey protéine
- **Pas obligatoire** : l'app ne la recommande que pour **combler l'écart** entre l'apport alimentaire et la cible du jour.
- Dose par prise : 0,3-0,4 g/kg de protéines (≈ 20-40 g). Poudre ≈ 75-90 % de protéines → `poudre_g = protéines_g / teneur`.
- Moment recommandé : après la séance de musculation, ou dans une collation pour atteindre la cible (petit-déjeuner pauvre en protéines, par ex.).
- Intolérance au lactose → isolat ou protéine végétale (pois + riz).
- Calcul quotidien : `besoin_whey = max(0, cible_protéines − protéines_prévues_repas)`, plafonné à 2 prises/jour.

### Créatine monohydrate
- **Dose d'entretien : 3-5 g/jour**, tous les jours (jours de repos compris). La **régularité compte plus que le moment** de la prise ; avec un repas ou après l'entraînement par commodité.
- **Phase de charge optionnelle** : 0,3 g/kg/j répartis en 4 prises pendant 5-7 jours, puis entretien (saturation plus rapide, plus de risque d'inconfort digestif).
- À savoir : prise de poids de 1-2 kg (eau intracellulaire), à anticiper avant une course objectif (l'app le signale si la charge commence moins de 3 semaines avant une course A ; on privilégie alors l'entretien sans charge).
- Contre-indication / avis médical : maladie rénale, traitement néphrotoxique.
- Choisir des produits **certifiés antidopage** (ex. label Informed Sport / norme AFNOR NF V94-001) pour les compétiteurs.

### Protocole stocké (exemple `user_supplements.protocol`)
```json
{"supplement":"creatine_mono","loading":false,"daily_g":5,"timing":"any","reminder":"08:00"}
{"supplement":"whey","daily_g":"dynamic","doses":[{"at":"post_workout","g":30}],"only_if_protein_gap":true}
```
- Rappels push (heure choisie), bouton « Pris ✓ » (widget iOS/Android), série de régularité.
- Autres compléments à efficacité établie, en option : caféine (3-6 mg/kg, 60 min avant un effort clé, déconseillée en fin de journée), électrolytes. Rien en dehors d'une **liste blanche**.

### Alerte de stock bas
```
consommation_jour = moyenne des prises réelles sur 14 j (sinon dose prévue)
jours_restants    = stock_g / consommation_jour
alerte si jours_restants ≤ délai_réappro (7 j par défaut) + 3
```
- Notification : « Créatine : ~9 jours restants. » → **[Ajouter à la liste de courses]** (rayon « Nutrition sportive », `origin = supplement_low_stock`) ou lien marchand (v2, affiliation signalée).
- Le stock est mis à jour à chaque prise validée ; scan d'un nouveau pot = réapprovisionnement (contenance lue via Open Food Facts).

## 6.3 Planificateur de recettes « hybrides »

### Base de recettes
Chaque recette est taguée par **contexte** et **timing** :
| Tag | Critères nutritionnels |
|---|---|
| `pre_run` (2-3 h avant) | glucides ≥ 60 % des kcal, fibres ≤ 5 g/portion, lipides ≤ 12 g |
| `post_lift` | protéines ≥ 30 g/portion, glucides modérés-élevés |
| `recovery` (après une séance longue) | ratio glucides/protéines ≈ 3:1 |
| `carb_load` | ≥ 120 g de glucides/portion, pauvre en fibres |
| `rest_day` | protéines élevées, légumes, glucides modérés |
| `race_morning` | facile à digérer, connu, 1-4 g/kg de glucides |

Exemples : overnight oats whey-banane (pré-run matin) · bowl riz-poulet-teriyaki (post-muscu) · pâtes au thon et tomates (veille de course) · omelette patate douce-feta (récup) · chili sin carne lentilles-quinoa (jour de repos, batch cooking) · riz au lait protéiné (collation du soir).

### Génération du menu de la semaine
- Entrées : cibles quotidiennes (6.1) issues du **plan d'entraînement de la semaine**, horaires des séances, préférences (végétarien, allergies, budget, temps de préparation), recettes favorites/exclues.
- Problème d'optimisation (programmation linéaire en nombres entiers, ex. OR-Tools) :
  - variables : recette × repas × jour × portions (pas de 0,5) ;
  - contraintes : macros du jour à ±10 %, tags de timing respectés (pré-run le matin d'une séance qualité, pauvre en fibres la veille d'une course), pas plus de 2 fois la même recette par semaine, temps de préparation par jour, restes du batch cooking réutilisés ;
  - objectif : minimiser l'écart aux macros + le coût estimé + maximiser les recettes aimées.
- L'utilisateur peut verrouiller/échanger un repas ; le solveur recalcule le reste.

## 6.4 Liste de courses automatique triée par rayon

1. Agréger les ingrédients des repas planifiés sur la période (`Σ portions × grammes`).
2. Soustraire le **garde-manger** (`pantry_items`, mis à jour par coche « acheté » et par scan).
3. Convertir en **unités d'achat** (ex. 750 g de poulet → 2 barquettes de 400 g ; arrondi au conditionnement le plus proche).
4. Ajouter les suppléments en stock bas et les articles manuels/ajoutés par le coach.
5. Associer chaque article à un **rayon** (`foods.aisle_id`, sinon catégorie Open Food Facts → table de correspondance ; les aliments inconnus sont classés une fois puis mis en cache).
6. Trier dans l'**ordre de parcours du magasin** (ordre par défaut : fruits & légumes → boulangerie → boucherie/poissonnerie → crèmerie → épicerie salée → féculents → épicerie sucrée → surgelés → boissons → nutrition sportive → hygiène), réordonnable par glisser-déposer et mémorisé par magasin.
7. Partage (lien / texte) et mode « en magasin » (gros texte, coches, écran toujours allumé).

## 6.5 Scanner de produits en magasin

Flux : scan EAN-13 → cache local `foods` → sinon Open Food Facts (`/api/v2/product/{ean}.json`) → calcul du **score d'adéquation hybride (0-100)** selon le **contexte** (déduit automatiquement de l'heure et du plan, modifiable) :

| Critère (pour 100 g ou par portion) | Général | Pré-run | Post-muscu | Jour de course |
|---|---|---|---|---|
| Densité protéique (g / 100 kcal) | ++ | + | +++ | 0 |
| Glucides | 0 | ++ | + | +++ |
| Fibres | ++ | −−− (> 3 g/portion) | + | −−− |
| Lipides / gras saturés | − / −− | −−− | − | −−− |
| Sucres ajoutés | −− | 0 | 0 | + (pendant l'effort) |
| Sel | − | 0 | 0 | + (électrolytes) |
| Ultra-transformé (NOVA 4) | −− | − | − | 0 |
| Nutri-Score | bonus A/B, malus D/E | — | — | — |
| **Allergènes / régime du profil** | **rouge bloquant** | idem | idem | idem |

```
score = clamp(50 + Σ poids_critère(contexte) × valeur_normalisée, 0, 100)
verdict : ≥ 75 « Excellent choix » · 55-74 « OK » · 35-54 « Occasionnel » · < 35 « À éviter dans ce contexte »
```
Restitution : score + verdict + **3 raisons principales** + alternative plus adaptée scannée par d'autres utilisateurs (v2) + bouton « Ajouter à la liste » / « Ajouter au journal ».

Exemple : *skyr nature 0 %* en contexte post-muscu → 88 « Excellent » (✓ 10 g de protéines / 100 g, ✓ 17 g de protéines / 100 kcal, ✓ peu transformé) ; *barre de céréales aux fruits secs* en pré-fractionné → 41 « Occasionnel » (⚠ 7 g de fibres, ⚠ 14 g de lipides).

Mention obligatoire : « Données Open Food Facts, licence ODbL ».
