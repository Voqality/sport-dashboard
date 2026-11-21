/* =========================================================
   PRONO 49 — Moteur de points
   Utilisable dans le navigateur (window.Scoring) et sous Node (tests).
   ========================================================= */
(function (root) {
  'use strict';

  const RULES = {
    EXACT: 5,            // Score exact
    GOOD_DIFF: 3,        // Bon résultat (V/N/D) + bon écart de buts
    GOOD: 2,             // Bon résultat (V/N/D) seulement
    WRONG: 0,            // Mauvais pronostic
    FAN_BONUS: 1,        // Bonus supporter : bon prono sur un match de son équipe favorite
    AUDACE_BONUS: 2,     // Bonus audace : bon résultat que moins de 25 % des joueurs ont vu venir
    AUDACE_THRESHOLD: 0.25,
    AUDACE_MIN_BETS: 5,  // il faut au moins 5 pronos sur le match pour activer l'audace
    JOKER_MULT: 2        // Joker : points x2, 1 seul par journée
  };

  /** 'H' = victoire domicile, 'D' = nul, 'A' = victoire extérieur */
  function outcome(home, away) {
    return home > away ? 'H' : home < away ? 'A' : 'D';
  }

  function basePoints(bet, match) {
    if (bet.home === match.homeScore && bet.away === match.awayScore) {
      return { pts: RULES.EXACT, kind: 'exact', label: 'Score exact' };
    }
    if (outcome(bet.home, bet.away) !== outcome(match.homeScore, match.awayScore)) {
      return { pts: RULES.WRONG, kind: 'wrong', label: 'Mauvais pronostic' };
    }
    if (bet.home - bet.away === match.homeScore - match.awayScore) {
      return { pts: RULES.GOOD_DIFF, kind: 'diff', label: 'Bon résultat + bon écart' };
    }
    return { pts: RULES.GOOD, kind: 'good', label: 'Bon résultat' };
  }

  /** Part des pronos sur chaque issue pour un match : { H, D, A, count } */
  function outcomeShares(bets) {
    const c = { H: 0, D: 0, A: 0 };
    bets.forEach(b => { c[outcome(b.home, b.away)]++; });
    const n = bets.length || 1;
    return { H: c.H / n, D: c.D / n, A: c.A / n, count: bets.length };
  }

  /**
   * Calcule les points d'un prono.
   * @param bet   { home, away, joker }
   * @param match { homeScore, awayScore }
   * @param ctx   { isFanMatch: bool, shares: résultat de outcomeShares() }
   */
  function scoreBet(bet, match, ctx) {
    ctx = ctx || {};
    const base = basePoints(bet, match);
    const details = [{ label: base.label, pts: base.pts }];
    let total = base.pts;
    let audace = false;

    if (base.pts > 0) {
      if (ctx.isFanMatch) {
        total += RULES.FAN_BONUS;
        details.push({ label: 'Bonus supporter', pts: RULES.FAN_BONUS });
      }
      const s = ctx.shares;
      if (s && s.count >= RULES.AUDACE_MIN_BETS && s[outcome(bet.home, bet.away)] < RULES.AUDACE_THRESHOLD) {
        audace = true;
        total += RULES.AUDACE_BONUS;
        details.push({ label: 'Bonus audace', pts: RULES.AUDACE_BONUS });
      }
      if (bet.joker) {
        details.push({ label: 'Joker x' + RULES.JOKER_MULT, pts: total * (RULES.JOKER_MULT - 1) });
        total *= RULES.JOKER_MULT;
      }
    }
    return { total, kind: base.kind, audace, details };
  }

  const api = { RULES, outcome, basePoints, outcomeShares, scoreBet };
  root.Scoring = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
