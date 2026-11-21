/* =========================================================
   PRONO 49 — Titres honorifiques (et un peu moqueurs)
   Chaque titre : id, nom, icône, description, premium, check(stats)
   ========================================================= */
(function (root) {
  'use strict';

  const TITLES = [
    // ---- Débuts & fidélité
    { id: 'saucisse',  icon: '🌭', name: 'Saucisse-Frites',             desc: 'Placer son tout premier prono.',                         check: s => s.totalBets >= 1 },
    { id: 'coach',     icon: '🛋️', name: 'Coach du Canapé',             desc: 'Placer 20 pronos.',                                      check: s => s.totalBets >= 20 },
    { id: 'maincour',  icon: '🧍', name: 'Pilier de la Main Courante',  desc: 'Placer 50 pronos.',                                      check: s => s.totalBets >= 50 },
    { id: 'retard',    icon: '⏱️', name: 'Le Remplaçant de la 89e',     desc: 'Valider un prono moins d’une heure avant le coup d’envoi.', check: s => s.lastMinuteBets >= 1 },

    // ---- Séries
    { id: 'pils3',     icon: '🍺', name: '3 Pils au Club-House',        desc: '3 bons pronos d’affilée.',                               check: s => s.maxGoodStreak >= 3 },
    { id: 'tournee',   icon: '🍻', name: 'Tournée Générale',            desc: '5 bons pronos d’affilée. C’est ta tournée.',             check: s => s.maxGoodStreak >= 5 },
    { id: 'pied',      icon: '🦶', name: 'Pied Carré',                  desc: '5 mauvais pronos d’affilée.',                            check: s => s.maxBadStreak >= 5 },
    { id: 'crampons',  icon: '🥾', name: 'Crampons Rouillés',           desc: '0 point après 5 pronos terminés.',                       check: s => s.finished >= 5 && s.points === 0 },

    // ---- Précision
    { id: 'nostra',    icon: '🔮', name: 'Nostradamus du District',     desc: '3 scores exacts.',                                       check: s => s.exact >= 3 },
    { id: 'irma',      icon: '🧿', name: 'Madame Irma du Stade',        desc: '10 scores exacts.',                                      check: s => s.exact >= 10 },
    { id: 'poteau',    icon: '🥅', name: 'Le Poteau Rentrant',          desc: '5 fois le bon résultat… mais jamais le bon score.',      check: s => s.goodNotExact >= 5 },
    { id: 'gardien',   icon: '🧤', name: 'Le Gardien du Temple',        desc: 'Trouver un 0-0 exact.',                                  check: s => s.nilNilExact >= 1 },
    { id: 'nul',       icon: '🤝', name: 'Roi du Match Nul',            desc: 'Trouver 3 matchs nuls.',                                 check: s => s.drawsFound >= 3 },

    // ---- Style de jeu
    { id: 'festival',  icon: '🎆', name: 'Festival Offensif',           desc: 'Pronostiquer un match à 6 buts ou plus.',                check: s => s.bigScoreBets >= 1 },
    { id: 'bus',       icon: '🚌', name: 'Gareur de Bus',               desc: '3 pronos avec 1 but ou moins dans le match.',            check: s => s.lowScoreBets >= 3 },
    { id: 'audace',    icon: '🎯', name: 'Le Contre-Pied',              desc: 'Décrocher un bonus audace.',                             check: s => s.audace >= 1 },
    { id: 'joker',     icon: '🃏', name: 'Coup de Poker',               desc: 'Gagner des points avec un joker.',                       check: s => s.jokerWins >= 1 },

    // ---- Supporter
    { id: 'ultra',     icon: '📣', name: 'Ultra du Bord de Touche',     desc: '5 pronos sur les matchs de son équipe.',                 check: s => s.fanBets >= 5 },
    { id: 'chauvin',   icon: '🧣', name: 'Chauvin Assumé',              desc: '3 bons pronos sur les matchs de son équipe.',            check: s => s.fanWins >= 3 },

    // ---- Classement
    { id: 'ramasseur', icon: '⚽', name: 'Ramasseur de Balles',          desc: 'Atteindre 10 points.',                                   check: s => s.points >= 10 },
    { id: 'taulier',   icon: '🏅', name: 'Taulier du Vestiaire',        desc: 'Atteindre 50 points.',                                   check: s => s.points >= 50 },
    { id: 'chambreur', icon: '😏', name: 'Le Chambreur',                desc: 'Être sur le podium du classement général.',              check: s => s.finished > 0 && s.rank <= 3 },
    { id: 'ballon',    icon: '🏆', name: 'Ballon d’Or du Comptoir',     desc: 'Être 1er du classement général.',                        check: s => s.finished > 0 && s.rank === 1 },
    { id: 'lanterne',  icon: '🏮', name: 'Lanterne Rouge',              desc: 'Être dernier du classement (avec au moins 5 pronos).',  check: s => s.finished >= 5 && s.isLast },

    // ---- PREMIUM (abonnement) : purement esthétiques
    { id: 'president', icon: '🎩', name: 'Président d’Honneur',         desc: 'Être abonné Prono 49+.',                                 premium: true, check: s => s.premium },
    { id: 'mecene',    icon: '💶', name: 'Mécène de la Buvette',        desc: 'Abonné + 10 pronos.',                                    premium: true, check: s => s.premium && s.totalBets >= 10 },
    { id: 'tonton',    icon: '👴', name: 'Le Tonton de la Main Courante', desc: 'Abonné + 30 pronos.',                                  premium: true, check: s => s.premium && s.totalBets >= 30 },
    { id: 'synthe',    icon: '🌟', name: 'Légende du Synthétique',      desc: 'Abonné + 5 scores exacts.',                              premium: true, check: s => s.premium && s.exact >= 5 },
    { id: 'gras',      icon: '🌧️', name: 'Seigneur du Terrain Gras',    desc: 'Abonné + 4 bons pronos d’affilée.',                      premium: true, check: s => s.premium && s.maxGoodStreak >= 4 },
    { id: 'sorcier',   icon: '🧙', name: 'Sorcier du Vestiaire',        desc: 'Abonné + 2 jokers gagnants.',                            premium: true, check: s => s.premium && s.jokerWins >= 2 }
  ];

  /** Cadres d'avatar : les premium sont réservés aux abonnés */
  const FRAMES = [
    { id: 'none',   name: 'Classique',       premium: false },
    { id: 'green',  name: 'Pelouse',         premium: false },
    { id: 'gold',   name: 'Or',              premium: true },
    { id: 'holo',   name: 'Holographique',   premium: true },
    { id: 'fire',   name: 'En feu',          premium: true },
    { id: 'club',   name: 'Couleurs du club', premium: true }
  ];

  function unlockedTitles(stats) {
    return TITLES.filter(t => t.check(stats)).map(t => t.id);
  }

  const api = { TITLES, FRAMES, unlockedTitles };
  root.Titles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
