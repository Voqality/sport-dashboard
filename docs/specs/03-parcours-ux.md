# 3. Parcours utilisateur & écrans (UX/UI)

## 3.1 Principes UI

- **Thème sombre par défaut** (continuité avec le prototype : fond `#07090f`, accent orange `#ff6b35` = muscu, cyan `#00d4ff` = course, violet `#a78bfa` = hybride/IA), typographies *Barlow Condensed* (titres, chiffres) + *DM Sans* (texte). Thème clair disponible.
- **Code couleur constant** : orange = force, cyan = endurance, violet = hybride/coach, vert/ambre/rouge = état de forme.
- **Utilisable d'une main, en sueur** : cibles tactiles ≥ 48 px, actions principales dans le tiers bas de l'écran, aucun clavier pour logguer une série standard.
- **Chaque chiffre a un « pourquoi »** : appui long ou icône ⓘ → explication (et bouton « Demander au coach »).
- Accessibilité : contrastes AA, Dynamic Type, VoiceOver/TalkBack sur les graphes (résumé textuel), retours haptiques.

## 3.2 Navigation

```
┌──────────────────────────────────────────────────────────┐
│  Aujourd'hui │ Entraînement │  (◎ Coach)  │ Nutrition │ Profil │
└──────────────────────────────────────────────────────────┘
```
- **Aujourd'hui** : dashboard du jour (Readiness, séance régulée, macros, alertes).
- **Entraînement** : calendrier du plan, historique, bibliothèque d'exercices, Courses (échéances).
- **Coach** (bouton central) : chat IA, propositions en attente, briefs.
- **Nutrition** : macros, suppléments, recettes, liste de courses, scanner.
- **Profil** : stats & graphes, PR, badges & statut, matériel, connexions (Strava, Santé), réglages, confidentialité.

## 3.3 Onboarding (≈ 3 min)

1. Bienvenue → objectif principal (*Hybride équilibré / Priorité course / Priorité force / HYROX*).
2. Profil : âge, sexe, taille, poids, expérience course & muscu.
3. Références de perf (optionnel, pré-rempli si Strava) : meilleur 5k/10k, ou test ; charges de travail récentes squat/bench/deadlift (« 5 reps à 100 kg ») → e1RM.
4. Disponibilités : jours × créneaux, durée max par séance, matériel disponible, autres sports (ex. **foot le dimanche** → séance « fixe » intégrée à la charge).
5. Course objectif (optionnel) : nom, date, distance, objectif chrono.
6. **Connexions** : Strava (OAuth), Apple Santé / Health Connect.
7. Consentements (santé, IA) explicites et séparés.
8. Génération du plan (animation) → **premier message du coach** qui présente le plan et pose 1-2 questions (blessures passées ? préférence matin/soir ?).

## 3.4 Écran « Aujourd'hui » (Dashboard)

```
┌─────────────────────────────────────────┐
│ Mer. 18 nov.                 🔥 6 sem.   │
│                                         │
│   ╭──────────╮   FORME DU JOUR          │
│   │    74    │   Bonne — prêt pour      │
│   │ READINESS│   une séance qualité     │
│   ╰──────────╯   Jambes ▓▓▓▓▓░░░ 58     │
│                  Systémique ▓▓▓░░░ 41   │
│  [Check-in matinal ✓]                   │
├─────────────────────────────────────────┤
│ SÉANCE DU JOUR            ⚙ ajustée     │
│ 🏋 Force — Bas du corps    ~55 min      │
│ Back squat 4×5 @ RPE 7 (était RPE 8)    │
│ RDL 3×8 · Fentes 3×10 · Gainage         │
│ ⓘ Allégée de 20 % : sortie longue 16 km │
│   hier (D+ 240 m), fatigue quadriceps 64│
│ [ DÉMARRER ▶ ]     [Déplacer] [Échanger]│
├─────────────────────────────────────────┤
│ DEMAIN : 🏃 Seuil 3×10 min @ 4:15/km    │
├─────────────────────────────────────────┤
│ NUTRITION       2 650 kcal · jour MODÉRÉ│
│ P 150/165g ▓▓▓▓▓▓▓░ G 210/320g ▓▓▓▓░░░  │
│ 💊 Créatine 5 g ✓   Whey 30 g ○ post    │
├─────────────────────────────────────────┤
│ 🏁 Semi de Paris — J-38  Prédit 1:34:20 │
│    (objectif 1:35:00 ✓)                 │
├─────────────────────────────────────────┤
│ ⚠ Pegasus 41 : 612/700 km — à remplacer │
│ 🧠 Coach : « Belle régularité cette     │
│    semaine. On parle de ton allure      │
│    seuil ? »                     [Ouvrir]│
└─────────────────────────────────────────┘
```

**Interactions clés**
- Tap sur le Readiness → détail des composantes (sommeil, HRV, charge, ressentis) + tendance 14 j.
- Badge « ⚙ ajustée » → comparaison *avant/après* de la séance et raison.
- **Échanger** : propose 2-3 alternatives équivalentes en stimulus (ex. squat → presse si dos chargé).
- **Déplacer** : glisser vers un autre jour ; le moteur affiche l'impact (« ⚠ 2 séances jambes en 24 h »).
- Si Readiness < 40 : carte rouge « Jour de récupération conseillé » avec 3 options (repos / mobilité 20 min / séance allégée).

## 3.5 Saisie des performances muscu (mode séance)

Objectif : **logger une série en 1 tap** quand on fait ce qui était prévu.

```
┌─────────────────────────────────────────┐
│ ← Force bas du corps        ⏱ 23:41     │
│ ───────────── 2 / 5 exercices ──────────│
│ BACK SQUAT            🎬 tuto  ⇄ échanger│
│ Cible 4×5 @ RPE 7 · tempo 3-1-1-0       │
│ e1RM 128 kg · charge suggérée 100 kg    │
│                                         │
│  Série  Kg      Reps   RPE              │
│  ✓ 1    100     5      6.5              │
│  ✓ 2    100     5      7                │
│  ▶ 3   [100]   [ 5 ]  [ 7 ]   ← pré-rempli
│    4    100     5      –                │
│                                         │
│      [ −2.5 ]  [ ✓ VALIDER ]  [ +2.5 ]  │
│                                         │
│  Repos  01:47 / 03:00   ▓▓▓▓▓▓░░░        │
│  RPE ? [6][7][8][9][10]                 │
└─────────────────────────────────────────┘
```

- **Pré-remplissage intelligent** : charge suggérée = f(e1RM, reps cibles, RPE cible) — voir doc 04 §4.4 ; si la série précédente était à un RPE plus bas que prévu, la suivante propose +2,5 kg (auto-régulation intra-séance).
- **Valider** = enregistre la série avec les valeurs affichées + lance le minuteur de repos (notification + haptique à la fin, Live Activity iOS / notification persistante Android).
- Le **sélecteur de RPE** apparaît après validation (1 tap) ; RIR affiché en aide (« RPE 8 = 2 reps en réserve »).
- Swipe gauche sur une série : modifier/supprimer ; ajout de série warm-up / drop set.
- **PR en direct** : si `e1RM` ou rep-max battu → confettis + haptique + bannière « 🎉 Nouveau record : 5 × 105 kg (e1RM 122 → 127 kg) ».
- Fin de séance : **sRPE global** (1-10), durée confirmée, note libre → écran récap (tonnage, PR, impact fatigue jambes, badge éventuel) → bouton « Débrief avec le coach ».
- **100 % hors-ligne**, synchro à la reconnexion.

## 3.6 Synchro Strava & détail d'une course

### Connexion / état
```
┌─────────────────────────────────────────┐
│ Connexions                               │
│ [Strava logo]  Connecté · @karim_run     │
│ Dernière synchro : il y a 4 min ✓        │
│ 312 activités importées · 4 chaussures   │
│ Scopes : activités publiques + privées ✓ │
│ [Resynchroniser 30 j] [Déconnecter]      │
│                     Powered by Strava    │
└─────────────────────────────────────────┘
```
- États : *non connecté* (CTA « Connect with Strava »), *import en cours* (barre de progression du backfill), *connecté*, *erreur / scope insuffisant* (explication + reconnexion), *révoqué depuis Strava*.

### Notification post-activité (arrivée par webhook)
> « 🏃 Sortie longue importée : 16,2 km · 5:12/km · FC 148. Ta séance jambes de demain a été allégée de 20 %. » → ouvre le détail.

### Détail d'activité course
```
┌─────────────────────────────────────────┐
│ Sortie longue · dim. 16 nov.  [Strava ↗] │
│ 16,2 km   1:24:12   5:12/km   D+ 240 m   │
│ FC moy 148 · max 171 · Cadence 172 pas/m │
├─────────────────────────────────────────┤
│ [Graphe allure / FC / altitude superposés]
├─────────────────────────────────────────┤
│ ZONES FC  Z1 ▓░ 8%  Z2 ▓▓▓▓▓ 61%         │
│           Z3 ▓▓ 22% Z4 ▓ 7%  Z5 2%       │
│ Objectif EF respecté à 69 % ⚠            │
├─────────────────────────────────────────┤
│ ANALYSE                                  │
│ • Dérive cardiaque 6,8 % (> 5 %) : fin   │
│   de sortie trop rapide ou déshydratation│
│ • Cadence stable 170-174 ✓               │
│ • Allure ajustée pente (GAP) 5:04/km     │
├─────────────────────────────────────────┤
│ IMPACT                                   │
│ Charge 142 UA · Fatigue jambes +34       │
│ Chaussure : Pegasus 41 (612 km)          │
│ RPE ressenti ? [1…10]                    │
│ [ Analyser avec le coach ]               │
└─────────────────────────────────────────┘
```
- Saisie du **RPE** proposée en notification après chaque import (améliore le modèle de charge).
- Rapprochement automatique avec la séance prévue (même jour, même sport, durée ±30 %) → statut « réalisée » + score de conformité (allures/zones vs cibles).

## 3.7 Courses (échéances)

```
┌─────────────────────────────────────────┐
│ MES COURSES                     [+ Ajouter]
│ ┌─────────────────────────────────────┐ │
│ │ 🅰 Semi-marathon de Paris            │ │
│ │ 8 mars 2027 · 21,1 km               │ │
│ │      J-110   │ Phase : DÉVELOPPEMENT │ │
│ │ Objectif 1:35:00 · Prédit 1:36:40   │ │
│ │ ▓▓▓▓▓▓▓░░░ probabilité ~45 %         │ │
│ └─────────────────────────────────────┘ │
│ 🅱 10 km de Boulogne · 25 janv. · J-68  │
├─────────────────────────────────────────┤
│ TIMELINE DU PLAN                         │
│ Base ── Développement ── Spécifique ──   │
│ Affûtage (dès 22 fév.) ── 🏁             │
├─────────────────────────────────────────┤
│ PRÉDICTIONS (toutes distances)           │
│ 5 km 20:58 · 10 km 43:40 · Semi 1:36:40  │
│ Marathon 3:24 (± 9 min, volume insuffisant)
│ [Graphe d'évolution de la prédiction]    │
└─────────────────────────────────────────┘
```
- Ajout de course : recherche (base d'événements v2) ou saisie libre ; priorité A/B/C ; distance, D+, objectif.
- Une course **A** ajoute/régénère les phases du plan et programme l'**affûtage** ; une course **B** déclenche un mini-affûtage (3-4 j) ; **C** = séance de la semaine.
- **Mode semaine de course** : checklist (sommeil, recharge glucidique, matériel, plan d'allures par km, échauffement), message du coach J-2.
- **Après la course** : import Strava → résultat, comparaison prédiction vs réel (recalibre le modèle), badge, récupération inversée programmée.

## 3.8 Coach IA (chat)

```
┌─────────────────────────────────────────┐
│ ◎ Coach                     ⋯ mémoire   │
│ ┌─────────────────────────────────────┐ │
│ │ ☀ Brief du jour — Readiness 74.     │ │
│ │ Ta sortie d'hier a bien chargé les  │ │
│ │ quadriceps : j'ai réduit le squat…  │ │
│ └─────────────────────────────────────┘ │
│            J'ai mal au mollet gauche   ▸│
│            depuis hier, je cours ?      │
│ ◂ Douleur ou courbature ? Sur 0-10 ?    │
│   Elle augmente en courant ? …          │
│ ┌──── PROPOSITION ────────────────────┐ │
│ │ Remplacer le seuil de jeudi par     │ │
│ │ 40 min vélo Z2 + renfo mollets      │ │
│ │ excentrique léger.                  │ │
│ │ Impact : charge semaine −8 %        │ │
│ │ [✓ Appliquer]  [✗ Refuser] [Modifier]│ │
│ └─────────────────────────────────────┘ │
│ Suggestions : [Pourquoi cette allure ?] │
│ [Je suis fatigué] [Ajoute une séance]   │
│ [ Écris au coach…            🎤 ➤ ]     │
└─────────────────────────────────────────┘
```
- Réponses en **streaming** ; cartes riches (proposition, graphe mini, séance) générées à partir des appels d'outils.
- **Aucune modification silencieuse** : toute modif du plan = carte *Proposition* avec diff avant/après et validation.
- Accès « Mémoire du coach » : liste des faits retenus (éditables/supprimables).
- Entrée vocale (dictée native) pour parler au coach entre deux séries.

## 3.9 Nutrition & supermarché (v1.1 pour recettes/courses/scanner)

- **Jour** : anneau kcal + 3 barres macros, type de jour (« DUR — 2 séances »), répartition par repas avec timing autour des séances (pré-séance 2 h, post-séance), hydratation.
- **Suppléments** : cartes Whey / Créatine avec dose du jour, bouton « Pris ✓ », jauge de stock (« ~12 jours restants ») et bouton **« Ajouter à la liste de courses »**.
- **Recettes** : filtres par contexte (pré-run, post-muscu, recharge glucidique, rapide, veggie), plan de la semaine glisser-déposer.
- **Liste de courses** : regroupée par rayon dans l'ordre du magasin, quantités agrégées, cases à cocher, partage.
- **Scanner** : viseur plein écran → fiche produit avec **score d'adéquation 0-100**, verdict coloré et 3 raisons (« ✓ 25 g protéines / 100 kcal », « ⚠ 9 g de fibres : à éviter 3 h avant le fractionné »).

## 3.10 Profil, performances & gamification

- **Statut d'Athlète Hybride** : grand badge (Bronze/Argent/Or/Platine/Diamant) + radar Force / Endurance / Constance, progression vers le palier suivant (« +4 pts Endurance pour Or »).
- **Graphes** : e1RM par mouvement, volume hebdo (km + tonnage), CTL/ATL/TSB, allure au seuil, VDOT, poids.
- **Records** : tableau muscu (1RM estimés, 1/3/5/10RM réels) et course (1 km → marathon, plus longue sortie, plus gros D+).
- **Badges** : grille par pilier, badges verrouillés avec progression (« 82/100 km ce mois-ci »).
- **Célébration de PR** : animation plein écran (Lottie + confettis + haptique « success »), carte partageable (story Instagram) générée côté app.
- **Matériel** : chaussures avec jauge d'usure, km/semaine, date estimée de remplacement.
