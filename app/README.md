# HYBRID : l'app (version 1)

Application installable sur téléphone (PWA), servie gratuitement par ton Worker Cloudflare
**`https://hybrid.itsvoqaah.workers.dev`**.

- **Aujourd'hui** : la séance du jour de ton plan « Défi de la colline », cochée automatiquement quand Strava reçoit ta sortie.
- **Plan** : les 7 semaines jusqu'au 9 janvier, avec la possibilité de déplacer une séance.
- **Séance muscu** : saisie série par série, ressenti Facile / Correct / Dur, charge ajustée automatiquement, minuteur de repos, records.
- **Perfs** : km par semaine, records, chrono prédit sur 8 km comparé à ton objectif (41:20).
- **Nutrition** : suivi de la créatine (jours de suite), de la whey et de ta cible de protéines.
- **Profil** : connexion Strava, poids, sauvegarde et restauration.
- **Coach IA** : prochaine étape.

Tes données restent **sur ton téléphone**. Le Worker ne fait que relayer Strava (il garde le Client Secret) et ne stocke rien.

---

## Mettre l'app en ligne (une seule fois, sur ton PC)

Dans PowerShell :

```powershell
cd $HOME\Documents\sport-dashboard
git pull
cd app
npm.cmd install
npx.cmd wrangler login
```

`wrangler login` ouvre une page Cloudflare dans ton navigateur : clique sur **Allow**.

```powershell
npx.cmd wrangler secret put STRAVA_CLIENT_SECRET
```

Colle ton **Client Secret** Strava quand c'est demandé (rien ne s'affiche pendant la saisie, c'est normal), puis appuie sur Entrée.

```powershell
npm.cmd run deploy
```

À la fin, l'adresse `https://hybrid.itsvoqaah.workers.dev` s'affiche : l'app est en ligne.

## Autoriser l'adresse chez Strava (une seule fois)

Sur **strava.com/settings/api**, clique sur **Edit** et remplace l'**Authorization Callback Domain** `localhost` par :

```
hybrid.itsvoqaah.workers.dev
```

Strava accepte toujours `localhost` en plus du domaine enregistré : le prototype `engine/` continue donc de fonctionner.

## Installer l'app sur ton iPhone

1. Ouvre **Safari** et va sur `https://hybrid.itsvoqaah.workers.dev`.
2. Touche le bouton **Partager**, puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Ouvre **HYBRID** depuis l'icône, et seulement depuis l'icône : c'est elle qui garde tes données.
4. Va dans **Profil** (icône en haut à droite), puis **Connecter Strava** : l'app Strava s'ouvre, touche **Autoriser**.
5. Si Safari affiche ensuite « Dernière étape » avec un code : touche **Copier le code**, reviens dans HYBRID depuis l'icône, puis **Profil**, et colle le code dans « Coller un code de connexion » avant de toucher **Valider**.

## Mettre à jour l'app

Après chaque nouvelle version :

```powershell
cd $HOME\Documents\sport-dashboard
git pull
cd app
npm.cmd run deploy
```

Sur le téléphone, ferme et rouvre HYBRID : la nouvelle version se charge.

## Sauvegarder tes données

Dans **Profil**, touche **Sauvegarder** chaque semaine, puis enregistre le fichier dans iCloud Drive ou Google Drive. Pour récupérer tes données, par exemple sur un nouveau téléphone, utilise **Restaurer**.

## Pour les développeurs

| Fichier | Rôle |
|---|---|
| `worker/index.js` | Relais Strava : échange du code, rafraîchissement du jeton, lecture des activités |
| `public/js/plan.js` | Le plan « Défi de la colline » (séances, allures, phases) et les dates |
| `public/js/stats.js` | Calculs : 1RM, charge proposée, records, km par semaine, prédiction de chrono |
| `public/js/strava.js` | Connexion et synchronisation Strava |
| `public/js/db.js` | Stockage sur le téléphone (IndexedDB), sauvegarde et restauration |
| `public/js/app.js` | Écrans et navigation |
| `public/sw.js` | Fonctionnement hors-ligne |

```powershell
npm.cmd test          # 9 tests
npx.cmd wrangler dev  # app en local sur http://localhost:8787
```
