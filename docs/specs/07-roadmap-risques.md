# 7. Roadmap, conformité & risques

## 7.1 Phasage

| Phase | Durée | Contenu | Critère de sortie |
|---|---|---|---|
| **0 — Cadrage & preuves** | 3 sem. | Validation juridique Strava × IA, maquettes Figma, prototype du moteur de fatigue sur les données réelles de 10 athlètes, demande de revue Strava (capacité d'athlètes) | Moteur jugé « crédible » par 2 coachs diplômés sur 30 cas |
| **1 — MVP** | 4 mois | Voir README §5 : auth, profil, Strava + webhooks, saisie muscu hors-ligne, plan hybride, régulation, Readiness, dashboard, PR/e1RM, Race Predictor, 1 course + affûtage, 20 badges + statut, macros dynamiques + whey/créatine, **coach IA** | Bêta fermée 200 utilisateurs, crash-free > 99,5 %, rétention J30 > 35 % |
| **1.1** | +6 sem. | Recettes, menu de la semaine, liste de courses par rayon, scanner, alertes de stock, Apple Santé / Health Connect (HRV, sommeil) | — |
| **2** | +3 mois | Garmin/Coros/Polar directs, montre (Apple Watch : saisie de séries, minuteur de repos), HYROX dédié (stations), base d'événements de course, défis entre amis, partage de cartes PR | — |
| **3** | — | Modèles personnalisés appris (prédiction, fatigue) sur données consenties, coach vocal en séance, offre coachs humains (B2B2C) | — |

**Équipe MVP** : 1 PM, 1 product designer, 2 devs React Native, 2 devs backend (dont 1 données/algos), 0,5 QA, coach diplômé + diététicien consultants (contenus, validation des règles), DPO externalisé.

## 7.2 KPI

| Type | Indicateur |
|---|---|
| Activation | % d'utilisateurs ayant connecté Strava **et** loggé une séance muscu en 7 j |
| Engagement | Séances loggées/sem./utilisateur actif ; check-ins matinaux/semaine |
| Valeur IA | % de propositions du coach acceptées ; 👍 / réponses ; conversations/sem. |
| Résultats | Évolution e1RM et VDOT à 12 sem. ; écart prédiction vs chrono réel (objectif MAE < 3 % sur 10 km/semi) |
| Sécurité | Signalements de douleur/blessure pour 1 000 séances (doit baisser avec la régulation) |
| Business | Conversion freemium → Premium, rétention M3, coût IA / utilisateur Premium |

**Modèle économique** : freemium — gratuit (saisie, synchro Strava, dashboard, badges) ; Premium (~9,99 €/mois ou 69 €/an) : plan adaptatif, régulation automatique, Race Predictor complet, coach IA, nutrition avancée, recettes/courses.

## 7.3 Conformité

### Strava (accord API)
- Branding : bouton « Connect with Strava », mention « Powered by Strava », lien vers l'activité d'origine (« View on Strava »).
- Les nouvelles applications sont limitées à **1 athlète connecté** tant qu'elles n'ont pas été examinées par Strava → déposer la demande dès la phase 0.
- Respect des limites de débit (fenêtre de 15 min et quota journalier).
- Données d'un athlète visibles **uniquement par cet athlète** (pas d'affichage à d'autres utilisateurs sans base contractuelle : à vérifier pour les fonctions sociales v2).
- Suppression des données Strava à la désautorisation et à la demande de l'utilisateur.
- **IA** : l'accord interdit d'utiliser les données Strava pour entraîner des modèles d'IA et encadre leur usage dans des applications d'IA → **avis juridique requis** avant d'envoyer des données d'origine Strava au coach IA (voir doc 05 §5.9) ; prévoir l'architecture « double source » (Health / Garmin / saisie) pour que le coach reste utile dans tous les cas, et exclure les données Strava de tout futur entraînement de modèle (phase 3).

### Plateformes mobiles
- Apple : textes d'usage HealthKit, interdiction d'utiliser les données de santé à des fins publicitaires, **Sign in with Apple** si connexion sociale, achats intégrés pour l'abonnement.
- Google : formulaire Health Connect et déclaration des types de données, politique « Health apps », Google Play Billing.

### Données personnelles & santé
- RGPD : base légale = consentement explicite (art. 9) pour les données de santé ; registre ; AIPD (analyse d'impact) obligatoire ; DPA avec les sous-traitants (hébergeur, fournisseur IA, push, analytics) ; hébergement UE ; droits d'accès/export/suppression dans l'app.
- Hébergement **HDS** recommandé en France par prudence (données de santé).
- Positionnement **bien-être / performance**, pas dispositif médical (règlement UE 2017/745) : aucune allégation de diagnostic ou de prévention de blessure ; formulations du type « aide à gérer la charge d'entraînement ».
- Mineurs : âge minimal 16 ans (ou consentement parental), nutrition et supplémentation désactivées pour les moins de 18 ans.

## 7.4 Risques principaux

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Restrictions Strava sur l'IA ou révocation de l'accès API | Moyenne | Élevé | Avis juridique, architecture multi-sources, Strava non indispensable au cœur de valeur |
| Capacité Strava limitée avant revue | Élevée | Moyen | Demande dès la phase 0, bêta avec Health Connect/HealthKit |
| Modèle de fatigue perçu comme faux (« il m'allège tout le temps ») | Moyenne | Élevé | Explicabilité, override utilisateur en 1 tap, calibration personnelle, validation par coachs |
| Conseil IA inadapté ou dangereux | Faible | Très élevé | Propositions validées par règles, drapeaux rouges, jeu d'évaluation, revue humaine, consentement |
| Coût IA par utilisateur | Moyenne | Moyen | Réservé Premium, cache de prompt, Batches, effort ajusté par usage, mesuré par KPI |
| Saisie muscu trop lente → abandon | Moyenne | Élevé | Pré-remplissage, 1 tap/série, tests utilisateurs en salle dès les maquettes |
| Synchro hors-ligne (conflits, pertes) | Moyenne | Moyen | UUID client, protocole delta éprouvé (WatermelonDB), tests de bout en bout |
| Qualité des données Open Food Facts | Moyenne | Faible | Signalement, corrections locales, base CIQUAL pour les aliments génériques |

## 7.5 Stratégie de test

- **Algorithmes** : tests unitaires avec jeux de référence (charge, e1RM, VDOT, Riegel, affûtage), tests de propriétés (fatigue toujours dans [0,100], monotonie de la décroissance), tests de non-régression par `engine_version`.
- **Intégration Strava** : simulateur de webhooks (create/update/delete/deauth, doublons, désordre), tests de refresh de token concurrent, tests de limitation de débit.
- **Mobile** : tests E2E (Maestro/Detox) du parcours séance hors-ligne → synchro ; tests d'accessibilité.
- **Coach IA** : jeu d'évaluation rejoué en CI à chaque modification de prompt/outil/modèle (doc 05 §5.8).
- **Bêta terrain** : 2 salles partenaires + 1 club de course, entretiens hebdomadaires.
