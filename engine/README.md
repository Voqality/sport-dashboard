# Moteur HYBRID : prototype (étape B)

Ce prototype calcule ta **fatigue des jambes jour par jour** à partir de tes activités Strava et de ton carnet de musculation. Il la compare ensuite à ton ressenti, pour vérifier que le modèle du cahier des charges (`docs/specs/04-algorithmes.md` §4.1 à 4.3) colle à la réalité.

- **Aucune installation** : Node.js 22.18 ou plus (tu as la v24) exécute directement le TypeScript.
- **Tes données restent sur ton PC** : le dossier `.data/`, le fichier `.env`, ton `profil.json` et tes CSV sont exclus de Git.

---

## 1. Récupérer le code (une seule fois)

Ouvre **PowerShell** dans le dossier où tu veux ranger le projet (par exemple `Documents`) :

```powershell
git clone https://github.com/Voqality/sport-dashboard.git
cd sport-dashboard
git checkout claude/hybrid-training-app-design-gacfyp
cd engine
```

Si le dépôt est déjà sur ton PC : `cd sport-dashboard`, puis `git pull`, puis `cd engine`.

## 2. Mettre ton secret Strava (une seule fois)

```powershell
copy .env.exemple .env
notepad .env
```

Dans le Bloc-notes, remplace `colle_ton_client_secret_ici` par ton **Client Secret** Strava, enregistre et ferme. Le Client ID `298644` est déjà rempli.

> Le fichier `.env` ne part jamais sur GitHub. Ne le partage pas et ne le prends pas en photo.

## 3. Ton profil (une seule fois)

```powershell
copy profil.exemple.json profil.json
notepad profil.json
```

| Champ | Quoi mettre |
|---|---|
| `sexe` | `"H"` ou `"F"` |
| `poidsKg` | ton poids |
| `fcMax` | ta FC max (la plus haute vue sur Strava ou ta montre) |
| `fcRepos` | ta FC au repos le matin |
| `fcSeuil` | ta FC au seuil si tu la connais (FC moyenne sur un effort à fond de 30 à 60 min) ; sinon laisse `null` (90 % de la FC max) |
| `jours` | nombre de jours analysés (90 par défaut) |

## 4. Importer tes activités Strava

```powershell
npm run strava
```

Une page Strava s'ouvre : clique sur **Autoriser** en laissant les cases cochées. Le terminal affiche ensuite le nombre d'activités importées. Les fois suivantes, la commande ne redemande plus d'autorisation : elle rafraîchit simplement les données.

## 5. Ton carnet de muscu et ton ressenti

Strava ne connaît pas le détail de tes séries. Note tes séances des **4 dernières semaines** (et les suivantes) :

```powershell
copy data\muscu.exemple.csv data\muscu.csv
copy data\ressenti.exemple.csv data\ressenti.csv
```

Ouvre-les avec **Excel** (ou le Bloc-notes) et remplace les lignes d'exemple.

**`data/muscu.csv`** : une ligne par série.

| date | heure | exercice | charge_kg | reps | rpe | duree_seance_min | rpe_seance |
|---|---|---|---|---|---|---|---|
| 2026-11-10 | 18:30 | Squat | 100 | 5 | 8 | 60 | 7 |

- Dates au format `2026-11-10` ou `10/11/2026` ; décimales avec une virgule ou un point.
- `rpe` (effort de la série, de 6 à 10) : 8 = il restait 2 reps. Laisse vide si tu ne sais pas.
- `duree_seance_min` et `rpe_seance` : à remplir **une fois par séance**, sur n'importe quelle ligne.
- Exercices reconnus : squat, front squat, presse, soulevé de terre (roumain, trap bar), fentes, squat bulgare, hip thrust, leg curl, leg extension, mollets, sauts, swing, sled, wall ball, développé couché et militaire, pompes, dips, tractions, tirage, rowing, curl, triceps, élévations latérales, gainage… Les noms inconnus sont signalés dans le rapport.

**`data/ressenti.csv`** : une ligne par matin, **le plus important pour valider le moteur**.

| date | jambes | commentaire |
|---|---|---|
| 2026-11-11 | 7 | courbatures quadriceps |

`jambes` : de **1** (jambes fraîches) à **10** (impossible de courir). Note-le chaque matin au réveil, avant de regarder le rapport, pour ne pas être influencé.

## 6. Le rapport

```powershell
npm run rapport
```

La page `.data/rapport.html` s'ouvre dans ton navigateur. Elle contient :
- la fatigue des jambes et la fatigue générale ce matin, ainsi que la forme et le ratio aigu / chronique ;
- le **graphique** jour par jour, avec tes ressentis en points violets ;
- la **corrélation** entre la courbe et ton ressenti (objectif : 0,5 ou plus) ;
- un tableau des 5 dernières semaines : fatigue par muscle, et ce que le moteur aurait fait d'une séance jambes ce jour-là.

## 7. Tests

```powershell
npm test
```

---

## Critère de réussite de l'étape B

Après **3 à 4 semaines** de ressentis notés, les pics de la courbe orange tombent sur les jours où tes jambes étaient vraiment chargées, avec une corrélation d'au moins 0,5. Si ce n'est pas le cas, on ajuste ensemble les constantes de `src/fatigue.ts` (durées de récupération `tauH`, sensibilités `k`, poids de la course et des séries).

## Organisation du code

| Fichier | Rôle |
|---|---|
| `src/load.ts` | Charge unifiée (UA), zones FC, 1RM estimé, charge suggérée |
| `src/fatigue.ts` | Impulsions de fatigue par muscle, décroissance, fatigue jambes |
| `src/model.ts` | Chronologie jour par jour : ATL, CTL, TSB, ACWR, fatigue à 8 h |
| `src/regulation.ts` | Règle d'allègement d'une séance jambes |
| `src/exercises.ts` | Catalogue d'exercices → muscles sollicités |
| `src/csv.ts`, `src/strava.ts` | Lecture du carnet CSV et des activités Strava |
| `scripts/strava-import.ts` | Connexion Strava (OAuth sur `localhost:8787`) et import |
| `scripts/rapport.ts` | Génération du rapport HTML |
