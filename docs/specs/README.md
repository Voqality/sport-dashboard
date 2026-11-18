# HYBRID — Cahier des charges fonctionnel & technique

> Application mobile (iOS / Android) d'entraînement hybride **Running + Musculation**, pilotée par la donnée (Strava, saisies muscu, ressentis) et accompagnée d'un **Coach IA conversationnel** qui conseille et fait évoluer le programme.

Version : 1.0 — 18/11/2026
Statut : Spécification initiale (base de travail pour le MVP)
Point de départ : le prototype web actuel (`index.html`, PWA statique avec phases, 10 km, HYROX, foot) sert de référence fonctionnelle pour les programmes ; il sera remplacé par l'app native décrite ici.

---

## Sommaire

| # | Document | Contenu |
|---|----------|---------|
| 0 | **Ce fichier** | Vision, personas, périmètre, principes produit, MVP |
| 1 | [Architecture technique & flux de données](01-architecture.md) | Stack, modules, OAuth2 Strava, webhooks, files d'attente, sécurité, RGPD |
| 2 | [Modèle de données](02-modele-donnees.md) | Schéma relationnel PostgreSQL complet (DDL), index, rétention |
| 3 | [Parcours utilisateur UX/UI](03-parcours-ux.md) | Navigation, wireframes Dashboard, Saisie Perfs, Synchro Strava, Courses, Coach, Nutrition |
| 4 | [Algorithmes clés](04-algorithmes.md) | Charge hybride, fatigue jambes, Readiness, 1RM, Race Predictor, tapering, Score/Statut hybride, badges, usure chaussures |
| 5 | [Coach IA conversationnel](05-coach-ia.md) | Architecture agent, outils, garde-fous, propositions de changement de programme, coûts |
| 6 | [Nutrition, supplémentation & supermarché](06-nutrition.md) | Calculateur dynamique, whey/créatine, recettes, liste de courses, scanner, stocks |
| 7 | [Roadmap, conformité & risques](07-roadmap-risques.md) | Phasage MVP→V3, KPI, conformité Strava/RGPD/santé, risques |

---

## 1. Vision produit

**Problème.** Les athlètes hybrides (course + musculation, HYROX, sports co.) jonglent entre 3 à 5 applis (Strava, carnet muscu, appli nutrition, tableur) qui ne se parlent pas. Résultat : surcharge des jambes (squat lourd la veille d'un fractionné), progression erratique, nutrition déconnectée du volume réel.

**Proposition de valeur.** *Une seule app qui connaît toute ta charge — et qui s'adapte chaque jour.*
1. **Un modèle de fatigue unifié** : chaque km couru et chaque série de squat alimentent le même modèle (fatigue systémique + fatigue locale par groupe musculaire).
2. **Un plan vivant** : la séance du jour est recalculée selon la fatigue, le Readiness Score et l'échéance de course.
3. **Un coach IA** avec qui on discute : il explique, conseille, et **propose** des modifications de programme que l'athlète valide en un tap.
4. **La nutrition suit l'entraînement** : macros du jour, whey/créatine, recettes et liste de courses générées automatiquement.
5. **La motivation** : PR détectés automatiquement, badges, Statut d'Athlète Hybride (Bronze → Diamant).

## 2. Personas

| Persona | Profil | Besoin principal |
|---|---|---|
| **Léa, 29 ans — « Hybrid curious »** | Salle 3×/sem, court 2×/sem, prépare son 1er semi | Un plan qui combine les deux sans se blesser |
| **Karim, 34 ans — « HYROX / compétiteur »** | 6-8 séances/sem, Strava + Garmin, vise un sub-40 au 10 km et un squat à 2× PDC | Optimiser, données précises, prédictions |
| **Tom, 24 ans — « Footeux qui se muscle »** | Match le week-end, muscu + footing | Gérer la fatigue autour des matchs, nutrition simple |

## 3. Principes produit (non négociables)

1. **Le moteur déterministe décide, l'IA explique et propose.** Les calculs de charge/fatigue/prédiction sont des algorithmes testés et versionnés ; le coach IA s'appuie dessus et ne peut modifier un plan que via une *proposition* validée par l'utilisateur (et par un validateur de règles).
2. **Saisie en < 3 secondes par série** en salle (pré-remplissage, gros boutons, hors-ligne).
3. **Zéro double saisie** : tout ce qui vient de Strava / Apple Santé / Health Connect est importé automatiquement.
4. **Transparence** : chaque ajustement affiche son « pourquoi » (« Volume jambes −30 % : 14 km hier, fatigue jambes 68/100 »).
5. **Sécurité santé** : l'app n'est pas un dispositif médical ; drapeaux rouges (douleur thoracique, blessure, malaise) → orientation vers un professionnel.
6. **Vie privée par défaut** : données de santé chiffrées, hébergement UE, consentement explicite, export/suppression en un clic.

## 4. Périmètre fonctionnel (modules)

| Module | Fonctions | Doc |
|---|---|---|
| **M1 Programmes** | Plans hybrides générés, muscu par objectif (hypertrophie/force/maintien), course structurée (EF, seuil, VMA, 5k→marathon), bibliothèque d'exercices + tutos vidéo | 03, 04 |
| **M2 Strava & analyse** | OAuth2, webhooks, import auto, zones FC, cadence, D+, analyse biomécanique simple, Gear Tracker | 01, 04 |
| **M3 Performances** | Saisie rapide muscu, dashboard, PR, 1RM estimé, Race Predictor | 03, 04 |
| **M4 Échéances & récupération** | Courses objectifs, compte à rebours, tapering auto, Readiness Score quotidien | 04 |
| **M5 Gamification** | Achievement Engine, badges 4 piliers, Statut Hybride, animations PR | 04 |
| **M6 Nutrition** | Calories/macros dynamiques, whey/créatine, recettes hybrides, liste de courses par rayon, alertes stock, scanner code-barres | 06 |
| **M7 Coach IA** | Chat contextuel, brief du matin, débrief post-séance, propositions de changement de programme, mémoire | 05 |

## 5. Définition du MVP (v1.0, ~4 mois)

**Inclus** : onboarding + profil, connexion Strava (webhooks), saisie muscu hors-ligne, plan hybride généré (1 objectif course + 1 objectif muscu), modèle de charge/fatigue + régulation auto, Readiness Score, dashboard + PR + e1RM, Race Predictor (Riegel personnalisé), 1 course objectif avec tapering, 20 badges + statut, calculateur macros dynamique + suivi whey/créatine, **Coach IA chat (lecture + propositions)**.

**Reporté** : recettes & liste de courses (v1.1), scanner code-barres (v1.1), Apple Santé/Health Connect HRV (v1.1), Garmin direct (v2), social/défis (v2), montres (v2).

Le détail du phasage est dans [07-roadmap-risques.md](07-roadmap-risques.md).
