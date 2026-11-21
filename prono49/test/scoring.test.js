// Lancer : node --test prono49/test/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/scoring.js');
const T = require('../js/titles.js');

const m = (h, a) => ({ homeScore: h, awayScore: a });
const b = (h, a, joker = false) => ({ home: h, away: a, joker });

test('score exact = total des points', () => {
  assert.strictEqual(S.scoreBet(b(2, 0), m(2, 0)).total, 5);
});
test('bon résultat + bon écart', () => {
  assert.strictEqual(S.scoreBet(b(2, 0), m(3, 1)).total, 3);
  assert.strictEqual(S.scoreBet(b(1, 1), m(2, 2)).total, 3); // nul non exact
});
test('bon résultat seulement', () => {
  assert.strictEqual(S.scoreBet(b(2, 0), m(1, 0)).total, 2);
  assert.strictEqual(S.scoreBet(b(0, 1), m(1, 4)).total, 2);
});
test('mauvais pronostic = 0, aucun bonus', () => {
  const r = S.scoreBet(b(2, 0, true), m(1, 1), { isFanMatch: true });
  assert.strictEqual(r.total, 0);
});
test('bonus supporter + joker', () => {
  assert.strictEqual(S.scoreBet(b(2, 0), m(2, 0), { isFanMatch: true }).total, 6);
  assert.strictEqual(S.scoreBet(b(2, 0, true), m(2, 0), { isFanMatch: true }).total, 12);
});
test('bonus audace seulement si peu de joueurs ont vu juste et assez de pronos', () => {
  const bets = [b(2, 0), b(3, 1), b(1, 0), b(2, 1), b(4, 0), b(0, 1)];
  const shares = S.outcomeShares(bets); // 1/6 sur victoire extérieur
  const r = S.scoreBet(b(0, 1), m(0, 2), { shares });
  assert.strictEqual(r.audace, true);
  assert.strictEqual(r.total, 2 + 2);
  const few = S.outcomeShares(bets.slice(0, 3).concat([b(0, 1)]));
  assert.strictEqual(S.scoreBet(b(0, 1), m(0, 2), { shares: few }).audace, false);
});
test('titres premium inaccessibles sans abonnement', () => {
  const stats = { premium: false, totalBets: 40, exact: 10, maxGoodStreak: 6, jokerWins: 3 };
  const got = T.unlockedTitles(stats);
  assert.ok(got.includes('pils3'));
  assert.ok(!T.TITLES.filter(t => t.premium).some(t => got.includes(t.id)));
  assert.ok(T.unlockedTitles({ ...stats, premium: true }).includes('president'));
});
