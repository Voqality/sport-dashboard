/* =========================================================
   PRONO 49 — Données & persistance (démo : localStorage)
   En production : remplacer par une API (Supabase / Firebase / Node).
   ========================================================= */
(function (root) {
  'use strict';

  const KEY = 'prono49_v1';
  const DAY = 86400000;

  // ⚠️ Noms d'EXEMPLE construits sur des communes du 49.
  // À remplacer par la vraie liste des clubs/poules du District de Maine-et-Loire.
  const CLUBS = [
    // Départemental 1
    { id: 'avr', name: 'ES Avrillé',            short: 'AVR', div: 'D1', colors: ['#d62828', '#ffffff'] },
    { id: 'trl', name: 'US Trélazé',            short: 'TRL', div: 'D1', colors: ['#1d4ed8', '#ffffff'] },
    { id: 'pdc', name: 'AS Les Ponts-de-Cé',    short: 'PDC', div: 'D1', colors: ['#16a34a', '#000000'] },
    { id: 'bcz', name: 'FC Beaucouzé',          short: 'BCZ', div: 'D1', colors: ['#f59e0b', '#000000'] },
    { id: 'chm', name: 'SC Chemillé',           short: 'CHM', div: 'D1', colors: ['#7c3aed', '#ffffff'] },
    { id: 'sgr', name: 'Olympique Segré',       short: 'SGR', div: 'D1', colors: ['#0ea5e9', '#ffffff'] },
    { id: 'dou', name: 'AS Doué-la-Fontaine',   short: 'DOU', div: 'D1', colors: ['#e11d48', '#000000'] },
    { id: 'bau', name: 'Étoile Baugé',          short: 'BAU', div: 'D1', colors: ['#facc15', '#1d4ed8'] },
    // Départemental 2
    { id: 'brs', name: 'FC Brissac',            short: 'BRS', div: 'D2', colors: ['#059669', '#ffffff'] },
    { id: 'bch', name: 'AS Bouchemaine',        short: 'BCH', div: 'D2', colors: ['#2563eb', '#facc15'] },
    { id: 'mer', name: 'ES Mûrs-Érigné',        short: 'MER', div: 'D2', colors: ['#dc2626', '#000000'] },
    { id: 'dur', name: 'US Durtal',             short: 'DUR', div: 'D2', colors: ['#9333ea', '#facc15'] },
    { id: 'lng', name: 'Longué Sports',         short: 'LNG', div: 'D2', colors: ['#f97316', '#ffffff'] },
    { id: 'mtj', name: 'AS Montreuil-Juigné',   short: 'MTJ', div: 'D2', colors: ['#0891b2', '#000000'] },
    { id: 'ssa', name: 'FC Saint-Sylvain',      short: 'SSA', div: 'D2', colors: ['#65a30d', '#ffffff'] },
    { id: 'sau', name: 'Stade Saumurois B',     short: 'SAU', div: 'D2', colors: ['#be123c', '#ffffff'] }
  ];

  const DIVISIONS = { D1: 'Départemental 1', D2: 'Départemental 2' };

  // Partenaires fictifs (emplacements pub locaux)
  const PARTNERS = [
    { name: 'Boulangerie du Stade',  tagline: '-10 % sur les sandwichs les jours de match', icon: '🥖' },
    { name: 'Garage de la Mairie',   tagline: 'Vidange offerte pour les bénévoles du club', icon: '🔧' },
    { name: 'Le Bar des Sports',     tagline: 'Retransmission + happy hour après le match', icon: '🍺' },
    { name: 'Sport 2000 Angers',     tagline: 'Crampons -20 % avec le code PRONO49',        icon: '👟' }
  ];

  // ---------- RNG déterministe pour la démo
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function goals(r) { // distribution réaliste des buts en foot amateur
    const x = r();
    return x < .22 ? 0 : x < .50 ? 1 : x < .73 ? 2 : x < .87 ? 3 : x < .95 ? 4 : 5;
  }
  const uid = () => Math.random().toString(36).slice(2, 10);

  /** Calendrier "aller" en round-robin (méthode du cercle) */
  function roundRobin(ids) {
    const t = ids.slice(), rounds = [];
    for (let r = 0; r < t.length - 1; r++) {
      const games = [];
      for (let i = 0; i < t.length / 2; i++) {
        const a = t[i], b = t[t.length - 1 - i];
        games.push(r % 2 ? [b, a] : [a, b]);
      }
      rounds.push(games);
      t.splice(1, 0, t.pop());
    }
    return rounds;
  }

  function nextSunday15h() {
    const d = new Date();
    d.setHours(15, 0, 0, 0);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    return d.getTime();
  }

  function seed() {
    const r = rng(49);
    const sunday = nextSunday15h();
    const PLAYED = 5; // journées 1..5 jouées, 6..7 à venir
    const matches = [];

    Object.keys(DIVISIONS).forEach(div => {
      const ids = CLUBS.filter(c => c.div === div).map(c => c.id);
      roundRobin(ids).forEach((games, i) => {
        const j = i + 1;
        const kickoff = sunday + (j - PLAYED - 1) * 7 * DAY;
        games.forEach(([h, a]) => {
          const played = j <= PLAYED;
          matches.push({
            id: uid(), div, journee: j, kickoff, homeId: h, awayId: a,
            status: played ? 'finished' : 'scheduled',
            homeScore: played ? goals(r) : null,
            awayScore: played ? goals(r) : null
          });
        });
      });
    });

    // Joueurs fictifs pour animer le classement
    const botNames = ['Kéké49', 'LeTontonDuStade', 'Bichette', 'PapyFoot', 'ZizouDuBocage', 'MamieUltras',
      'Le_Libéro', 'CoachJojo', 'TataBuvette', 'Ronaldinho2Brissac', 'GrosseFrappe', 'LaPinceDuVestiaire'];
    const users = botNames.map((p, i) => ({
      id: 'bot' + i, pseudo: p, email: null, bot: true,
      clubId: CLUBS[Math.floor(r() * CLUBS.length)].id,
      premium: r() < .25, equippedTitle: null, frame: 'none', createdAt: Date.now()
    }));

    const bets = [];
    users.forEach(u => {
      matches.forEach(m => {
        if (r() < .7) {
          // les bots sont un peu "influencés" par le vrai score pour avoir des stats variées
          const cheat = m.status === 'finished' && r() < .25;
          bets.push({
            id: uid(), userId: u.id, matchId: m.id,
            home: cheat ? m.homeScore : goals(r), away: cheat ? m.awayScore : goals(r),
            joker: false, createdAt: m.kickoff - (1 + r() * 72) * 3600000
          });
        }
      });
    });

    return { version: 1, users, matches, bets, session: null };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* stockage indisponible : on repart d'une démo */ }
    const s = seed();
    save(s);
    return s;
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    return load();
  }

  // ---------- Statistiques & classement
  function computeAll(state) {
    const S = root.Scoring;
    const matchById = Object.fromEntries(state.matches.map(m => [m.id, m]));
    const betsByMatch = {};
    state.bets.forEach(b => { (betsByMatch[b.matchId] = betsByMatch[b.matchId] || []).push(b); });
    const shares = {};
    Object.keys(betsByMatch).forEach(id => { shares[id] = S.outcomeShares(betsByMatch[id]); });

    const stats = {};
    state.users.forEach(u => {
      stats[u.id] = {
        userId: u.id, premium: !!u.premium, totalBets: 0, finished: 0, points: 0, exact: 0,
        good: 0, goodNotExact: 0, drawsFound: 0, nilNilExact: 0, fanBets: 0, fanWins: 0,
        audace: 0, jokerWins: 0, lastMinuteBets: 0, bigScoreBets: 0, lowScoreBets: 0,
        maxGoodStreak: 0, maxBadStreak: 0, curGood: 0, curBad: 0, rank: 0, isLast: false, results: {}
      };
    });
    const userById = Object.fromEntries(state.users.map(u => [u.id, u]));

    const sorted = state.bets.slice().sort((a, b) =>
      (matchById[a.matchId]?.kickoff || 0) - (matchById[b.matchId]?.kickoff || 0));

    sorted.forEach(b => {
      const s = stats[b.userId], m = matchById[b.matchId], u = userById[b.userId];
      if (!s || !m) return;
      s.totalBets++;
      const fan = u.clubId === m.homeId || u.clubId === m.awayId;
      if (fan) s.fanBets++;
      if (m.kickoff - b.createdAt < 3600000) s.lastMinuteBets++;
      if (b.home + b.away >= 6) s.bigScoreBets++;
      if (b.home + b.away <= 1) s.lowScoreBets++;
      if (m.status !== 'finished') return;

      const res = S.scoreBet(b, m, { isFanMatch: fan, shares: shares[m.id] });
      s.results[b.id] = res;
      s.finished++;
      s.points += res.total;
      if (res.total > 0) {
        s.good++; s.curGood++; s.curBad = 0;
        if (res.kind !== 'exact') s.goodNotExact++;
        if (m.homeScore === m.awayScore) s.drawsFound++;
        if (fan) s.fanWins++;
        if (res.audace) s.audace++;
        if (b.joker) s.jokerWins++;
      } else {
        s.curBad++; s.curGood = 0;
      }
      if (res.kind === 'exact') {
        s.exact++;
        if (m.homeScore === 0 && m.awayScore === 0) s.nilNilExact++;
      }
      s.maxGoodStreak = Math.max(s.maxGoodStreak, s.curGood);
      s.maxBadStreak = Math.max(s.maxBadStreak, s.curBad);
    });

    const ranking = Object.values(stats).sort((a, b) =>
      b.points - a.points || b.exact - a.exact || b.good - a.good);
    ranking.forEach((s, i) => { s.rank = i + 1; });
    if (ranking.length) ranking[ranking.length - 1].isLast = true;

    return { stats, ranking, shares };
  }

  root.Store = { CLUBS, DIVISIONS, PARTNERS, load, save, reset, computeAll, uid };
})(window);
