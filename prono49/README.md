# ⚽ Prono 49

Application **gratuite** de pronostics sur le foot amateur du **District de Maine-et-Loire**.
On s’inscrit, on choisit son club de cœur, on pronostique les scores, on gagne des points et des titres pour chambrer les copains.

> **État actuel : prototype jouable.** Toutes les données sont dans le navigateur (localStorage).
> Les clubs sont des **noms d’exemple** construits sur des communes du 49. Il faudra les remplacer par les vraies poules du District.

## Lancer

Ouvrir `prono49/index.html` dans un navigateur. Aucun serveur ni installation n’est nécessaire.
Tests du moteur de points : `node --test prono49/test/*.test.js`

## Fonctionnalités du prototype

- Inscription et connexion (pseudo, e-mail, mot de passe, club favori, case d’âge et de règlement)
- Matchs par division et par journée, pronos fermés au coup d’envoi, répartition des pronos 1/N/2 des autres joueurs
- Joker ×2 : un seul par journée
- Saisie des scores (bouton « correspondant club »)
- Classements : général, mon club, **Coupe des Supporters** (moyenne par club)
- 30 titres humoristiques, dont 6 réservés aux abonnés, avec notification quand on en débloque un
- Abonnement **Prono 49+** (démo) : titres exclusifs, cadres d’avatar animés, badge. **Aucun avantage sur les points.**
- Emplacements pub et partenaires locaux

## Barème des points

| Cas | Points |
|---|---|
| 🎯 Score exact | **5** |
| ✅ Bon résultat + bon écart (prono 2-0, réel 3-1) | **3** |
| 👍 Bon résultat seulement (prono 2-0, réel 1-0) | **2** |
| ❌ Mauvais résultat | **0** |
| ❤️ Bonus supporter : bon prono sur un match de son équipe | +1 |
| 🎲 Bonus audace : bon résultat trouvé par moins de 25 % des joueurs (à partir de 5 pronos) | +2 |
| 🃏 Joker (1 par journée) | ×2 |

Les bonus ne s’ajoutent que si le prono rapporte déjà des points. Tout se règle dans `js/scoring.js` (objet `RULES`).

## Structure

```
prono49/
  index.html
  css/style.css
  js/scoring.js   moteur de points (testé)
  js/titles.js    titres et cadres
  js/store.js     données, démo, calcul des stats et du classement
  js/app.js       interface
  test/           tests Node
```

## Pour passer en production

1. **Backend** : Supabase ou Firebase (authentification, base de données, règles de sécurité). Les points doivent être calculés **côté serveur**.
2. **Résultats** : saisis par un correspondant de chaque club, avec une double validation (par exemple 2 saisies concordantes, ou une validation par l’autre club). Vérifier les conditions d’utilisation avant de réutiliser des données de la FFF ou du District.
3. **Appli mobile** : d’abord une PWA (installable, notifications), puis Capacitor pour les stores.
4. **Paiement** : Stripe pour le web. Sur iOS et Android, les abonnements passent par les achats intégrés (commission de 15 à 30 %).

## ⚖️ Points juridiques à vérifier (avec un professionnel)

- **Ne jamais faire miser d’argent.** Sinon c’est un jeu d’argent soumis à l’agrément de l’ANJ. L’abonnement doit rester purement esthétique, ce qui est le cas ici.
- Si des **lots** sont offerts, il faut un règlement de jeu-concours. La participation doit rester gratuite et sans obligation d’achat.
- **RGPD** : consentement à la pub, politique de confidentialité, suppression du compte. Attention aux mineurs.
- Écusson, nom et logo des clubs : demander l’accord des clubs (c’est aussi l’occasion de les avoir comme partenaires).

## 💡 Idées pour la suite

**Jeu et communauté**
- Ligues privées entre potes ou par équipe (« la ligue des vétérans du FC… »)
- Défis 1 contre 1 : « je te parie une tournée que je finis devant toi »
- Pronos sur les buteurs ou l’homme du match (saisis par le club)
- Mur de chambrage après chaque journée, réactions et GIF
- « Équipe type de la semaine » votée par les joueurs
- Coupe de l’Anjou : éliminatoires entre joueurs, sur le modèle d’une coupe
- Notifications : rappel avant la clôture, résultat, titre débloqué
- Titres saisonniers ou événementiels : derby, dernier match de la saison, match sous la neige…

**Rentabilité**
- **Pub locale ciblée** (boulangeries, garages, bars, magasins de sport) : plus rentable et mieux acceptée que Google AdMob seul
- **Offre clubs partenaires** (environ 10 à 30 €/mois) : page du club, écusson officiel, mise en avant, stats de ses supporters. Une partie des abonnements de ses supporters est reversée au club, ce qui pousse les clubs à faire la promo de l’appli.
- **Naming** d’une compétition : « Coupe des Supporters présentée par… »
- **Abonnement Prono 49+** à 2,99 €/mois ou 24,99 €/an : titres, cadres, thèmes de couleur du club, stats avancées. Option « sans pub » possible.
- Lots offerts par les partenaires pour le top 3 de chaque mois : visibilité pour eux, motivation pour les joueurs
- Billetterie et buvette dans l’appli plus tard (précommande de saucisses-frites 🌭)
- Une fois le modèle validé dans le 49, l’étendre aux autres districts : Sarthe, Mayenne, Loire-Atlantique, Vendée…
