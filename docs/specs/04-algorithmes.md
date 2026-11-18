# 4. Logiques algorithmiques clés

> Tous les algorithmes vivent dans le module `load-engine` / `performance` / `gamification` du backend, sont **déterministes, versionnés** (`engine_version`) et couverts par des tests unitaires avec jeux de données de référence. Les constantes ci-dessous sont des **valeurs par défaut fondées sur la littérature**, destinées à être **personnalisées** par l'historique de chaque athlète (calibration bayésienne simple, §4.10).
>
> ⚠️ Rappel : ce sont des outils d'aide à l'entraînement, pas des diagnostics médicaux.

Sommaire : 4.1 Charge unifiée · 4.2 Fatigue locale & systémique · 4.3 Régulation automatique · 4.4 1RM & charges suggérées · 4.5 Readiness Score · 4.6 Race Predictor · 4.7 Tapering · 4.8 Génération du plan hybride · 4.9 Score & Statut Hybride, badges · 4.10 Gear Tracker, analyse de course, calibration

---

## 4.1 Charge d'entraînement unifiée (UA)

Objectif : une **monnaie commune** entre course, muscu, foot, HYROX. Échelle calibrée pour que **1 h à intensité seuil ≈ 100 UA** (proche du TSS).

### Course (par ordre de préférence selon les données disponibles)
1. **rTSS (allure)** si allure seuil connue :
   `IF = GAP_normalisée / vitesse_seuil` ; `UA = durée_h × IF² × 100`
   (GAP = vitesse ajustée à la pente, calculée sur les streams `velocity_smooth` + `grade_smooth`).
2. **hrTSS (fréquence cardiaque)** si FC présente :
   temps en zones × coefficients `Z1 0.55 · Z2 0.75 · Z3 0.95 · Z4 1.15 · Z5 1.40` (UA/min ≈ coeff² × 100/60).
3. **sRPE (Foster)** sinon : `UA = RPE_séance × minutes / 4.5` (60 min à RPE 7,5 ≈ 100 UA).

### Musculation, foot, HYROX
- **Systémique** : `UA = sRPE × minutes / 4.5` (la FC sous-estime la charge en muscu).
- **Locale** (par groupe musculaire, §4.2) : calculée série par série.
- Si RPE de séance manquant : estimation `RPE ≈ moyenne pondérée des RPE de séries` ; défaut 6.

### Agrégats quotidiens (`daily_metrics`)
```
ATL_t = ATL_{t-1} + (L_t − ATL_{t-1}) × (1 − e^{−1/7})     # fatigue aiguë
CTL_t = CTL_{t-1} + (L_t − CTL_{t-1}) × (1 − e^{−1/42})    # forme chronique
TSB_t = CTL_{t-1} − ATL_{t-1}                                # fraîcheur du matin
ACWR_t = EWMA7(L) / EWMA28(L)                               # ratio aigu:chronique
Monotonie = moyenne7(L) / écart-type7(L)
```
Usage de l'ACWR : **garde-fou, pas vérité absolue** (sa valeur prédictive des blessures est débattue). Zones : `< 0.8` sous-charge · `0.8–1.3` optimal · `1.3–1.5` vigilance · `> 1.5` risque → le moteur plafonne la charge de la semaine suivante.

---

## 4.2 Modèle de fatigue : systémique + locale (cœur de l'hybride)

L'idée clé : un 10 km facile et un squat lourd n'ont pas la même charge **cardio**, mais tous deux fatiguent les **quadriceps**. On modélise donc **10 compartiments musculaires** + 1 compartiment systémique, chacun avec un **impulse** et une **décroissance exponentielle**.

### Impulse d'une série de musculation
```
effort(RPE) = {≤5: 0.25, 6: 0.45, 7: 0.60, 8: 0.75, 9: 0.90, 10: 1.00}
intensité   = 0.6 + 0.4 × (charge / e1RM)          # séries lourdes un peu plus coûteuses
excentrique = 1 + 0.15 × exercise.eccentric_leg_stress   # RDL, fentes, bulgares…
impulse_m   = effort × intensité × excentrique × poids_muscle(exercice, m) × 10
```

### Impulse d'une course
```
par km :   base = 1.0
           × facteur_intensité (zone dominante : Z1-2 1.0 · Z3 1.3 · Z4 1.6 · Z5 2.0)
           × (trail ? 1.2 : 1.0)
           × (1 + max(0, durée_h − 1.5) × 0.2)          # sorties longues
descente : + D−(m)/100 × 1.5   (uniquement quadriceps : excentrique)
répartition : quadriceps 0.35 · mollets 0.30 · fessiers 0.20 · ischios 0.15
leg_impulse = Σ km × base × 6
```
Foot : impulse jambes ≈ `sRPE × min / 4.5 × 0.8` réparti quadriceps/ischios/adducteurs, avec bonus ischios (sprints).

### Décroissance et normalisation
```
F_m(t) = Σ_i impulse_{m,i} × e^{−(t − t_i)/τ_m}
fatigue_m(%) = 100 × (1 − e^{−F_m / k_m})            # saturation 0-100
```
| Compartiment | τ (h) défaut | k_m |
|---|---|---|
| Quadriceps, ischios | 36 | 40 |
| Fessiers, mollets | 30 | 35 |
| Haut du corps (pecs, dos, épaules, bras) | 30 | 40 |
| Gainage | 20 | 30 |
| **Systémique** (à partir des UA) | 28 | 120 |

`leg_fatigue = 0.35·quads + 0.25·mollets + 0.2·fessiers + 0.2·ischios` (pondération alignée sur l'impact course).

Le moteur **projette** la fatigue à l'heure prévue de chaque séance des 72 h à venir (et pas seulement « maintenant »).

```ts
// load-engine/fatigue.ts (extrait)
export function projectFatigue(impulses: Impulse[], at: Date, cfg: CompartmentCfg): number {
  const F = impulses
    .filter(i => i.at <= at)
    .reduce((s, i) => s + i.value * Math.exp(-(hoursBetween(i.at, at)) / cfg.tauH), 0);
  return 100 * (1 - Math.exp(-F / cfg.k));
}
```

---

## 4.3 Régulation automatique (course ⇄ musculation)

Déclenchée à chaque `activity.imported`, `workout.completed`, `wellness.checkin`, et chaque nuit à 03:00 (heure locale). Elle ne touche que les séances des **72 h** suivantes non commencées, **enregistre l'original** (`planned_sessions.original`) et une **raison lisible**.

### Règles pour une séance de musculation **bas du corps**
| Fatigue jambes projetée | Readiness | Action |
|---|---|---|
| < 40 | ≥ 60 | Inchangée |
| 40–60 | ≥ 45 | Volume −20 % (−1 série sur les polyarticulaires), RPE cible −0,5, charges conservées |
| 60–75 | quelconque | Volume −35 %, RPE plafonné à 7, **remplacement des exercices très excentriques** (RDL → hip thrust, fentes → presse, sauts supprimés) |
| > 75 | quelconque | Séance convertie en **haut du corps + gainage**, ou déplacée si un créneau respecte les contraintes ci-dessous |
| — | < 35 | Séance remplacée par mobilité 20-30 min (proposée, l'utilisateur peut forcer) |

Principe : en phase de **force**, on préserve l'**intensité** (charge) et on coupe le **volume** ; en **hypertrophie**, on coupe plutôt les dernières séries proches de l'échec.

### Règles pour une séance de **course qualité** (seuil, VMA, allure spécifique)
| Condition | Action |
|---|---|
| Muscu jambes lourde (impulse quads > seuil) dans les 24 h précédentes | Déplacer la séance qualité (+1 j) ou convertir en endurance fondamentale |
| Readiness < 40 | Convertir en EF 30-40 min Z1-Z2 ou repos |
| Readiness 40-55 | Réduire le nombre de répétitions de 25 %, allures inchangées |
| Fatigue mollets > 70 | Supprimer les côtes/VMA courtes, privilégier seuil sur plat |
| ACWR > 1.5 | Réduction de 20 % du volume de la semaine, priorités 3 supprimées d'abord |

### Contraintes de planification (aussi utilisées par le générateur, §4.8)
- **Jours durs durs, jours faciles faciles** : la muscu jambes est placée **le même jour** qu'une séance qualité (course le matin, muscu ≥ 6 h après) plutôt que la veille.
- Pas de muscu jambes lourde **< 24 h avant** une séance qualité ni **< 48 h avant** la sortie longue.
- Ordre intra-journée : séance prioritaire en premier ; course facile après muscu = OK.
- Séances `priority = 1` (séances clés) : jamais supprimées par le moteur, seulement déplacées/allégées ; le moteur sacrifie d'abord les `priority = 3`.
- Progression course : volume hebdo ≤ +10 % (sauf retour après coupure, sous le CTL antérieur) ; sortie longue ≤ 30-35 % du volume hebdo.

```ts
// load-engine/regulate.ts (squelette)
for (const s of upcomingSessions(user, 72h)) {
  const ctx = { legF: projectLegFatigue(s.at), sysF: projectSystemic(s.at),
                readiness: readinessFor(s.date), acwr, phase: phaseFor(s.date) };
  const decision = RULES.find(r => r.matches(s, ctx))?.apply(s, ctx);   // règles ordonnées
  if (decision && !deepEqual(decision.after, s)) {
    savePlannedSession(decision.after, { original: s, reason: decision.reasonFr, by: 'engine' });
    emit('session.regulated', { sessionId: s.id, reason: decision.reasonFr });
  }
}
```

---

## 4.4 1RM estimé & charges suggérées

- Seules les séries `working`/`amrap` de **1 à 10 reps** sont utilisées.
- Avec RPE : `reps_eff = reps + RIR` où `RIR = 10 − RPE`.
- **e1RM** (moyenne Epley/Brzycki, plus robuste) :
  ```
  Epley    = charge × (1 + reps_eff / 30)
  Brzycki  = charge × 36 / (37 − reps_eff)          # reps_eff ≤ 12
  e1RM     = (Epley + Brzycki) / 2
  ```
- e1RM du jour = max des séries ; tendance affichée = EWMA (α = 0,3) pour lisser le bruit.
- **Charge suggérée** pour `reps` cibles à `RPE` cible :
  `charge = e1RM / (1 + (reps + 10 − RPE)/30)`, arrondie à l'incrément disponible (2,5 kg barre, 2 kg haltères).
- **Auto-régulation intra-séance** : si RPE réalisé < cible − 1 → +2,5-5 % à la série suivante ; si > cible + 1 → −5 %.
- **Détection de PR** : nouvel e1RM > max historique × 1,005, ou rep-max (1/3/5/8/10RM) battu à reps égales. **Plausibilité** : un saut d'e1RM > 15 % en < 14 j → PR marqué « à confirmer » (pas de badge avant confirmation).

---

## 4.5 Readiness Score (0-100), calculé chaque matin

| Composante | Calcul du sous-score (0-100) | Poids |
|---|---|---|
| **HRV** (si dispo) | `z = (ln RMSSD_jour − moyenne_7j(ln RMSSD)) / écart-type_60j` ; score = clamp(60 + 20·z) | 0.25 |
| **Ressentis (Hooper)** | 5 items 1-7 (sommeil, fatigue, stress, courbatures, humeur) : `H ∈ [5,35]` ; score = `100 × (35 − H) / 30` | 0.25 |
| **Charge** | f(TSB, fatigue systémique, leg_fatigue) : `TSB ≥ +5 → 90 ; 0 → 75 ; −10 → 60 ; −20 → 40 ; −30 → 20` (interpolé), −0,3 × max(0, leg_fatigue − 50) | 0.25 |
| **Sommeil** | `min(100, heures / besoin × 100)` pondéré par la qualité | 0.15 |
| **FC repos** | écart à la base 30 j : 0 → 90 ; +3 bpm → 70 ; +5 → 50 ; +8 → 25 | 0.10 |

- **Renormalisation** des poids si une composante manque (sans montre : Hooper 0.45, Charge 0.40, Sommeil 0.15).
- **Plafonds de sécurité** : douleur déclarée → max 50 ; maladie/fièvre déclarée → max 25 et aucune séance intense proposée.
- Interprétation : `≥ 75` vert (go qualité) · `55-74` vert clair (normal) · `40-54` ambre (alléger) · `< 40` rouge (récupération).
- Les composantes sont stockées dans `readiness_components` pour l'explicabilité et le coach IA.

---

## 4.6 Race Predictor (course × force × volume)

### Étape 1 — Performances de référence (12 dernières semaines)
- Courses officielles (poids 1.0), best efforts extraits des streams (fenêtre glissante sur 1 km, 5 km, 10 km… poids 0.7) **uniquement si effort quasi-maximal** (FC moy ≥ 88 % FCmax ou RPE ≥ 8).
- Efforts sous-maximaux : estimation via la relation allure/FC individuelle (régression sur les sorties Z2-Z4) extrapolée à FC seuil.
- Pondération temporelle : `w = poids × e^{−âge_jours / 45}` ; ajustement dénivelé via GAP.

### Étape 2 — VDOT (Daniels & Gilbert)
```
v (m/min) = d / t ;  t en minutes
VO2      = −4.60 + 0.182258·v + 0.000104·v²
%VO2max  = 0.8 + 0.1894393·e^{−0.012778·t} + 0.2989558·e^{−0.1932605·t}
VDOT     = VO2 / %VO2max
```
VDOT de référence = moyenne pondérée des VDOT des perfs retenues. Les allures d'entraînement (E, M, T, I, R) en découlent.

### Étape 3 — Exposant d'endurance personnel (Riegel)
`T₂ = T₁ × (D₂/D₁)^b`, `b` ajusté par régression log-log sur les perfs de l'athlète (≥ 2 distances distinctes), borné à [1.03 ; 1.12], défaut 1.06. Un `b` élevé = profil « vitesse » (typique des profils muscu) → l'app le signale.

### Étape 4 — Prédiction de base
Moyenne pondérée de : (a) inversion numérique du VDOT pour la distance cible, (b) Riegel personnalisé depuis la perf la plus proche en distance.

### Étape 5 — Modificateurs hybrides (multiplicatifs, bornés)
| Facteur | Règle | Borne |
|---|---|---|
| **Volume spécifique** | Volume hebdo moyen 8 sem. vs requis (10k : 25 km ; semi : 35 km ; marathon : 55 km) et sortie longue max vs requise (semi 16 km, marathon 30 km) | +0 à +3 % (semi), +0 à +10 % (marathon) |
| **Force & économie de course** | Muscu bas du corps lourde ≥ 2×/sem depuis ≥ 8 sem. **et** e1RM squat ≥ 1,25 × PDC → amélioration projetée de l'économie de course (la littérature rapporte ~2-5 % d'économie), appliquée **uniquement à la projection jusqu'à la date de course**, pas à l'état actuel (déjà reflété par les chronos récents) | −0 à −1,5 % |
| **Masse corporelle** | Variation de poids depuis la perf de référence (prise de muscle) : +1 % de masse ≈ +0,5 % de temps | ±2 % |
| **Fatigue hybride** | Si l'athlète maintient un volume muscu jambes élevé en période spécifique (fatigue jambes moyenne > 55) | +0 à +1,5 % |
| **Progression jusqu'à J** | Tendance du CTL et du VDOT sur 8 semaines, extrapolée sur les semaines restantes, plafonnée (≤ 0,5 %/sem., ≤ 4 % total) | −0 à −4 % |
| **Parcours** | Profil GPX de la course → coût énergétique de la pente (modèle de Minetti) | variable |

### Étape 6 — Incertitude
- Intervalle ~80 % : `σ = 2 % + 1 % × |ln(D_cible / D_ref)| + 1 % si < 3 perfs retenues + 2 % si marathon et sortie longue max < 25 km`.
- `confidence` ∈ [0,1] affichée en clair (« fiabilité moyenne : peu de références au-delà de 10 km »).
- **Probabilité d'atteindre l'objectif** = `Φ((objectif − prédit) / σ)`.

### Étape 7 — Calibration
Après chaque course officielle : résidu `r = réel/prédit − 1` stocké ; biais individuel `β ← 0.7β + 0.3r` appliqué aux prédictions suivantes. Les modificateurs « force » et « fatigue hybride » sont des **heuristiques v1**, à recalibrer en v2 sur des données consenties (voir les restrictions de l'accord API Strava, doc 07).

---

## 4.7 Phase d'affûtage (tapering) automatique

Déclenchée à la création d'une course **A** (ou **B** en version courte). Principe (consensus littérature) : **baisser le volume de 40-60 % de façon progressive, maintenir l'intensité, réduire peu la fréquence (≤ 20 %)**.

| Distance | Durée d'affûtage | Volume course (% du pic) | Dernière muscu jambes lourde |
|---|---|---|---|
| 5 km | 7 j | S-1 : 60 % | J-5 |
| 10 km | 7-10 j | S-1 : 55-60 % | J-6/7 |
| Semi | 10-14 j | S-2 : 75 % · S-1 : 55 % | J-8 |
| Marathon | 14-21 j | S-3 : 80 % · S-2 : 65 % · S-1 : 45 % | J-10 |
| Course **B** | 3-4 j | −30 % | J-4 |

Formule de décroissance utilisée pour répartir jour par jour : `V(d) = V_pic × (1 − r × (1 − e^{−d/τ}))` avec `r` = réduction cible, `τ` = durée/3.

**Musculation pendant l'affûtage** : volume −50 %, intensité maintenue (2-3 × 3 à ≥ 80 % 1RM), jamais à l'échec, **aucun nouvel exercice** (courbatures), plus d'excentrique lourd ni de pliométrie intense ; semaine de course : haut du corps léger + mobilité, activation J-2 optionnelle.

**Nutrition associée** : recharge glucidique 36-48 h avant marathon (8-12 g/kg/j), 24 h avant semi (7-8 g/kg, optionnel), aliments pauvres en fibres J-1 ; plan d'allures et de ravitaillement (30-60 g glucides/h, jusqu'à 90 g/h si intestin entraîné, sur marathon).

**Après course** : récupération inversée : 10 km → 3-5 j faciles ; semi → 7-10 j ; marathon → 14 j (aucune intensité), reprise muscu légère dès J+3/J+5.

---

## 4.8 Génération du plan hybride

Entrées : objectif principal, objectif muscu, course(s) A/B, niveau, disponibilités, matériel, sports fixes (foot), historique (CTL, e1RM, VDOT).

1. **Macro-cycle** : à rebours depuis la course A : Base → Développement → Spécifique → Affûtage → Course → Récupération. Sans course : blocs de 4-6 semaines alternés (accent force / accent endurance).
2. **Méso-cycles 3:1** : 3 semaines de progression + 1 semaine de décharge (−30-40 % volume).
3. **Répartition des séances** (exemples) :

| Séances/sem | Course | Muscu | Exemple (priorité semi-marathon) |
|---|---|---|---|
| 4 | 2 | 2 | Mar seuil + muscu bas (soir) · Jeu muscu haut · Sam sortie longue · Dim EF |
| 5 | 3 | 2 | Lun muscu haut · Mar VMA/seuil + muscu bas (soir) · Jeu EF · Sam sortie longue · Dim muscu haut léger |
| 6 | 3 | 3 | + Ven muscu full body légère / force-vitesse |

4. **Musculation par objectif**

| Objectif | Reps | Intensité | Séries dures/muscle/sem | Repos | Tempo type | Progression |
|---|---|---|---|---|---|---|
| **Hypertrophie** | 6-12 (jusqu'à 15-20 isolation) | RPE 7-9 | 10-20 haut du corps ; **6-10 jambes** si course prioritaire | 1,5-3 min | 3-0-1-0 | Double progression (reps puis charge) |
| **Force** | 1-6 | 75-92 % 1RM, RPE 7-9 | 6-12 polyarticulaires | 3-5 min | contrôlé, concentrique explosif | Ondulante quotidienne (DUP) + top set RPE |
| **Maintien** | 3-8 | ≥ 75 % 1RM | ~⅓ du volume habituel | 2-3 min | — | Charge conservée, volume minimal (2 séances/sem) |

   Choix d'exercices filtré par matériel et blessures ; en période spécifique course, priorité aux exercices **à faible coût excentrique** pour les jambes et ajout de travail de **pliométrie/raideur** (sauts, pogo) en base, retiré en affûtage.

5. **Course structurée** : allures depuis le VDOT ; répartition polarisée (~80 % Z1-Z2) ; séances type : EF, sortie longue (avec blocs allure spécifique en phase spécifique), seuil (2×15', 3×10', 20' continu), VMA (10×400, 6×800, 5×1000), côtes, allure spécifique (5k/10k/semi/marathon). Progression du volume et de la sortie longue bornée (§4.3).

6. **Contraintes** de §4.3 vérifiées par un **solveur de placement** (backtracking simple sur 7 jours × 2 créneaux, fonction de coût : écarts aux règles + préférences). Le même validateur sert à vérifier les **propositions du coach IA** (doc 05).

---

## 4.9 Score Hybride, Statut d'Athlète & Achievement Engine

### Indices (0-100)
- **Force S** : score **DOTS** sur la somme des e1RM squat + développé couché + soulevé de terre (équivalences si variantes : front squat ÷ 0,85, trap bar ≈ soulevé de terre, etc.) :
  `DOTS = total × 500 / (a + b·m + c·m² + d·m³ + e·m⁴)` (m = poids de corps, coefficients DOTS officiels H/F).
  Mapping : `DOTS 150 → 10 · 250 → 35 · 300 → 50 · 375 → 72 · 450 → 92` (interpolé, plafonné 100).
- **Endurance E** : VDOT **ajusté âge/sexe** (coefficients d'age-grading WMA) ; mapping `VDOT 30 → 15 · 40 → 40 · 50 → 65 · 60 → 88 · 65 → 96`.
- **Constance C** : `0.7 × taux de séances réalisées (8 sem.) + 0.3 × min(1, série_semaines / 12)`.

### Score Hybride
```
H = S^0.4 × E^0.4 × C^0.2
```
La **moyenne géométrique** récompense l'équilibre : 80/40 donne moins qu'un 60/60. C'est l'esprit hybride.

| Statut | Condition |
|---|---|
| 🥉 Bronze | H < 40 |
| 🥈 Argent | 40 ≤ H < 55 |
| 🥇 Or | 55 ≤ H < 70 |
| 💠 Platine | 70 ≤ H < 82 et min(S,E) ≥ 55 |
| 💎 Diamant | H ≥ 82 et min(S,E) ≥ 72 |

**Hystérésis** : rétrogradation seulement si sous le seuil −3 pendant 4 semaines (pas de yo-yo démotivant). Recalcul hebdomadaire + à chaque PR.

### Achievement Engine
- **Événementiel** : abonné à `pr.achieved`, `activity.imported`, `workout.completed`, `daily_metrics.updated`, `race.completed`.
- Règles en **DSL JSON** stocké dans `badges.rule`, évalué par un interpréteur (pas de code par badge) :
  ```json
  {"type":"threshold","metric":"e1rm_bw_ratio","exercise":"back-squat","gte":1.5}
  {"type":"same_day","all":[{"metric":"run_distance_m","gte":10000},{"metric":"lift_tonnage_kg","gte":5000}]}
  {"type":"window_sum","metric":"run_distance_m","days":30,"gte":100000}
  {"type":"streak","metric":"weeks_on_target","gte":12}
  ```
- **Idempotent** (PK `user_id, badge_id`), **anti-triche** : activités manuelles exclues des records course, contrôles de plausibilité (allure < records du monde, FC absente sur un PR, e1RM +15 %), activités Strava marquées comme « non course à pied » ignorées.
- Déclenche push + animation de célébration côté app (`seen = false`).

### Catalogue initial (extraits, 4 piliers × 4 niveaux)
| Pilier | Exemples |
|---|---|
| **Force** | *Poids du corps* (squat 1× PDC) → *Bête de somme* (squat 1,5×) → *Titan* (2×) ; *Club 100* (100 kg au développé couché) ; *Mille livres* (total SBD 453 kg) |
| **Endurance** | *Premier 5 km*, *Sub-50 au 10 km*, *Sub-25 au 5 km*, *Semi bouclé*, *Marathonien*, *100 km en un mois*, *1 000 m D+ en une sortie* |
| **Hybride** | *Double journée* (10 km + 5 t soulevées le même jour), *Le Centaure* (squat 1,5× PDC **et** 10 km < 45'), *Hybride complet* (S ≥ 60 et E ≥ 60), *Iron Week* (3 courses + 3 muscu dans la semaine), *HYROX finisher* |
| **Constance** | *4 / 12 / 26 / 52 semaines* de suite à l'objectif, *Lève-tôt* (10 séances avant 7 h), *Check-in 30 jours*, *Zéro séance clé manquée sur un bloc* |

---

## 4.10 Gear Tracker, analyse de course & calibration

### Usure des chaussures
- Distance = `initial_distance_m + Σ activités course liées` (et réconciliation avec `distance` de l'objet gear Strava, en mètres).
- Seuils par défaut (modifiables) : **quotidienne 700 km**, **trail 600 km**, **compétition carbone 400 km**.
- Alertes : **80 %** (« prévoir le remplacement »), **95 %**, **100 %** (« usure atteinte ») ; projection de date = km restants / km hebdo moyens de cette paire (4 sem.).
- Suggestion de **rotation** si une seule paire > 40 km/sem.

### Analyse biomécanique & physiologique (à partir des streams Strava)
| Indicateur | Calcul | Interprétation |
|---|---|---|
| Cadence | `cadence × 2` (Strava donne des cycles/min) ; cadence vs vitesse | Baisse > 5 % en fin de sortie = marqueur de fatigue |
| Dérive cardiaque (Pa:HR) | ratio vitesse/FC 1ʳᵉ moitié vs 2ᵉ moitié | > 5 % : endurance aérobie à développer / chaleur / déshydratation |
| Respect des zones | % temps dans la zone cible de la séance prévue | Score de conformité affiché |
| Régularité d'allure | coefficient de variation des splits au km (GAP) | Gestion d'effort |
| GAP | vitesse ajustée à la pente (`grade_smooth`) | Comparaison équitable des sorties vallonnées |
| Zones FC | `/activities/{id}/zones` ou recalcul (LTHR ou Karvonen) | Polarisation 80/20 |

*(Temps de contact au sol, oscillation verticale : non exposés par l'API Strava → v2 via Garmin/Apple.)*

### Calibration personnelle
- `τ` et `k` de fatigue ajustés par régression sur la relation entre fatigue projetée et **courbatures/fatigue déclarées** (Hooper) après 6 semaines de données.
- FCmax mise à jour si dépassée en activité (filtre anti-artefact : pic < 3 s ignoré).
- Allure/FC seuil ré-estimées toutes les 4 semaines (best effort 20-60 min).
