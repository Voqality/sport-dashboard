# Moteur HYBRID : prototype

Ce prototype importe tes activités Strava, lit ton carnet de musculation et produit un **bilan de tes performances** :
- les kilomètres courus par semaine ;
- tes records de course (plus longue sortie, meilleures allures, dénivelé) ;
- tes records de muscu (1RM estimé par exercice) ;
- tes activités récentes.

Le système de fatigue (fatigue par muscle, allègement automatique, ressenti du matin) a été **retiré** à la demande du propriétaire du projet.

- **Aucune installation** : Node.js 22.18 ou plus (tu as la v24) exécute directement le TypeScript.
- **Tes données restent sur ton PC** : le dossier `.data/`, le fichier `.env`, ton `profil.json` et ton `muscu.csv` sont exclus de Git.
- Sous Windows PowerShell, tape **`npm.cmd`** au lieu de `npm`.

---

## Installation (une seule fois)

Dans PowerShell :

```powershell
cd $HOME\Documents
git clone https://github.com/Voqality/sport-dashboard.git
cd sport-dashboard
git checkout claude/hybrid-training-app-design-gacfyp
cd engine
copy .env.exemple .env
notepad .env
```

Dans le Bloc-notes, remplace `colle_ton_client_secret_ici` par ton **Client Secret** Strava, puis enregistre.

Si le dépôt est déjà sur ton PC, il suffit de faire `cd $HOME\Documents\sport-dashboard\engine` puis `git pull`.

## Connecter Strava (une seule fois)

```powershell
npm.cmd run strava:iphone
```

1. Envoie-toi le lien affiché sur ton iPhone et touche-le : l'app Strava s'ouvre, appuie sur **Autoriser**.
2. Safari affiche une page d'erreur, c'est normal. Copie son adresse (appui long sur la barre d'adresse, puis **Copier**).
3. Recolle cette adresse dans PowerShell et appuie sur **Entrée**.

Fais toute la manip en moins de 5 minutes, car le code expire. Si tu es connecté à strava.com sur ton PC, `npm.cmd run strava` fait la même chose directement dans le navigateur.

## Mettre à jour et voir le bilan

```powershell
npm.cmd run strava
npm.cmd run rapport
```

La première commande récupère tes nouvelles activités Strava sans rien demander. La seconde ouvre le bilan dans ton navigateur.

## Ton carnet de muscu (optionnel)

Strava ne connaît pas le détail de tes séries. Pour avoir tes records de musculation :

```powershell
copy data\muscu.exemple.csv data\muscu.csv
notepad data\muscu.csv
```

Écris une ligne par série, en remplaçant les lignes d'exemple :

```
date;heure;exercice;charge_kg;reps;rpe;duree_seance_min
2026-11-18;18:30;Squat;100;5;8;60
2026-11-18;18:30;Squat;100;5;8.5;
```

- Les dates s'écrivent `2026-11-18` ou `18/11/2026`. Les décimales acceptent la virgule ou le point.
- `rpe` (effort de la série, de 6 à 10) : 8 signifie qu'il restait 2 reps. Laisse vide si tu ne sais pas.
- `duree_seance_min` se met une fois par séance, sur n'importe quelle ligne.
- Exercices reconnus : squat, front squat, presse, soulevé de terre (roumain, trap bar), fentes, squat bulgare, hip thrust, leg curl, leg extension, mollets, développé couché et militaire, pompes, dips, tractions, tirage, rowing, curl, triceps, gainage… Les variantes d'un même exercice sont regroupées : « back squat » et « squat » comptent ensemble.

## Tests

```powershell
npm.cmd test
```

## Organisation du code

| Fichier | Rôle |
|---|---|
| `src/strength.ts` | 1RM estimé, charge suggérée |
| `src/summary.ts` | Volume par semaine, records course et muscu |
| `src/exercises.ts` | Catalogue d'exercices (noms, variantes, muscles) |
| `src/csv.ts`, `src/strava.ts` | Lecture du carnet CSV et des activités Strava |
| `scripts/strava-import.ts` | Connexion Strava (navigateur ou iPhone) et import |
| `scripts/rapport.ts` | Génération du bilan HTML |
