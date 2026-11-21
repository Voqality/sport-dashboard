/* =========================================================
   PRONO 49 — Interface
   ========================================================= */
(function () {
  'use strict';
  const { CLUBS, DIVISIONS, PARTNERS } = Store;
  const { TITLES, FRAMES, unlockedTitles } = Titles;
  const R = Scoring.RULES;

  let state = Store.load();
  let tab = 'matches';
  let filters = { div: 'D1', journee: null, rank: 'general' };

  const $ = sel => document.querySelector(sel);
  const club = id => CLUBS.find(c => c.id === id) || { name: '?', short: '?', colors: ['#555', '#fff'] };
  const me = () => state.users.find(u => u.id === state.session);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const persist = () => Store.save(state);

  async function hash(str) {
    // DÉMO UNIQUEMENT : en prod, l'authentification se fait côté serveur (bcrypt/argon2).
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('prono49:' + str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function toast(html, ms = 3200) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = html;
    const box = $('#toasts');
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
  }

  function crest(id, size = 34) {
    const c = club(id);
    return `<span class="crest" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,${c.colors[0]} 50%,${c.colors[1]} 50%)"><b>${esc(c.short)}</b></span>`;
  }

  function avatar(u, size = 40) {
    const c = club(u.clubId);
    const frame = u.premium ? u.frame : (FRAMES.find(f => f.id === u.frame)?.premium ? 'none' : u.frame);
    const style = frame === 'club' ? `--c1:${c.colors[0]};--c2:${c.colors[1]}` : '';
    return `<span class="avatar frame-${frame}" style="width:${size}px;height:${size}px;${style}">${esc(u.pseudo[0].toUpperCase())}</span>`;
  }

  function titleBadge(u, stats) {
    if (!u.equippedTitle) return '';
    const t = TITLES.find(x => x.id === u.equippedTitle);
    if (!t || !t.check(stats)) return '';
    return `<span class="title-badge ${t.premium ? 'premium' : ''}">${t.icon} ${esc(t.name)}</span>`;
  }

  function adSlot(i) {
    const p = PARTNERS[i % PARTNERS.length];
    return `<div class="ad"><span class="ad-tag">Partenaire</span><span class="ad-icon">${p.icon}</span>
      <div><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></div></div>`;
  }

  /* ---------------- AUTH ---------------- */
  function renderAuth(mode = 'signup') {
    const opts = Object.entries(DIVISIONS).map(([d, label]) =>
      `<optgroup label="${label}">${CLUBS.filter(c => c.div === d).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
    $('#app').innerHTML = `
      <div class="auth">
        <div class="logo">⚽</div>
        <h1>PRONO <span>49</span></h1>
        <p class="sub">Les pronos du foot amateur en Maine-et-Loire.<br>100 % gratuit, 100 % chambrage.</p>
        <div class="seg">
          <button data-auth="signup" class="${mode === 'signup' ? 'on' : ''}">Inscription</button>
          <button data-auth="login" class="${mode === 'login' ? 'on' : ''}">Connexion</button>
        </div>
        <form id="authForm" class="card form">
          ${mode === 'signup' ? `<label>Pseudo<input name="pseudo" required minlength="3" maxlength="20" placeholder="ex : ZizouDuBocage"></label>` : ''}
          <label>E-mail<input name="email" type="email" required placeholder="toi@exemple.fr"></label>
          <label>Mot de passe<input name="password" type="password" required minlength="6"></label>
          ${mode === 'signup' ? `
            <label>Ton équipe de cœur<select name="clubId" required><option value="">— Choisis ton club —</option>${opts}</select></label>
            <label class="check"><input type="checkbox" name="adult" required> J’ai 15 ans ou plus et j’accepte le règlement (jeu gratuit, sans mise d’argent).</label>` : ''}
          <button class="btn primary" type="submit">${mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}</button>
          <p class="err" id="authErr"></p>
        </form>
      </div>`;
    $('#nav').hidden = true;
  }

  async function onAuth(form) {
    const f = Object.fromEntries(new FormData(form));
    const email = f.email.trim().toLowerCase();
    const err = $('#authErr');
    const pass = await hash(f.password);
    if (f.pseudo !== undefined) {
      const pseudo = f.pseudo.trim();
      if (state.users.some(u => u.email === email)) return (err.textContent = 'Cet e-mail est déjà inscrit.');
      if (state.users.some(u => u.pseudo.toLowerCase() === pseudo.toLowerCase())) return (err.textContent = 'Ce pseudo est déjà pris.');
      const u = { id: Store.uid(), pseudo, email, pass, clubId: f.clubId, premium: false, equippedTitle: null, frame: 'none', createdAt: Date.now() };
      state.users.push(u);
      state.session = u.id;
      filters.div = club(u.clubId).div;
      persist();
      toast(`Bienvenue <b>${esc(pseudo)}</b> ! Place ton premier prono pour débloquer 🌭 <b>Saucisse-Frites</b>.`);
    } else {
      const u = state.users.find(x => x.email === email && x.pass === pass);
      if (!u) return (err.textContent = 'E-mail ou mot de passe incorrect.');
      state.session = u.id;
      filters.div = club(u.clubId).div;
      persist();
    }
    render();
  }

  /* ---------------- MATCHS ---------------- */
  function journees(div) {
    return [...new Set(state.matches.filter(m => m.div === div).map(m => m.journee))].sort((a, b) => a - b);
  }
  function defaultJournee(div) {
    const next = state.matches.filter(m => m.div === div && m.status === 'scheduled').sort((a, b) => a.kickoff - b.kickoff)[0];
    return next ? next.journee : Math.max(...journees(div));
  }

  function renderMatches(calc) {
    const u = me();
    if (filters.journee == null) filters.journee = defaultJournee(filters.div);
    const js = journees(filters.div);
    const list = state.matches.filter(m => m.div === filters.div && m.journee === filters.journee)
      .sort((a, b) => (b.homeId === u.clubId || b.awayId === u.clubId) - (a.homeId === u.clubId || a.awayId === u.clubId));
    const jokerUsed = state.bets.find(b => b.userId === u.id && b.joker &&
      state.matches.find(m => m.id === b.matchId && m.journee === filters.journee && m.div === filters.div));

    const cards = list.map((m, i) => {
      const bet = state.bets.find(b => b.userId === u.id && b.matchId === m.id);
      const open = m.status === 'scheduled' && Date.now() < m.kickoff;
      const fan = m.homeId === u.clubId || m.awayId === u.clubId;
      const sh = calc.shares[m.id];
      let foot = '';
      if (m.status === 'finished') {
        const res = bet && calc.stats[u.id].results[bet.id];
        foot = bet
          ? `<div class="result ${res.kind}"><span>Ton prono : <b>${bet.home}-${bet.away}</b>${bet.joker ? ' 🃏' : ''}</span>
              <span class="pts">+${res.total} pts</span></div>
             <div class="detail">${res.details.map(d => `${esc(d.label)} (${d.pts >= 0 ? '+' : ''}${d.pts})`).join(' · ')}</div>`
          : `<div class="result none">Pas de prono sur ce match</div>`;
      } else if (open) {
        foot = `<form class="bet" data-match="${m.id}">
            <input type="number" name="home" min="0" max="20" required value="${bet ? bet.home : ''}" aria-label="Buts domicile">
            <span>-</span>
            <input type="number" name="away" min="0" max="20" required value="${bet ? bet.away : ''}" aria-label="Buts extérieur">
            <label class="joker ${(jokerUsed && !(bet && bet.joker)) ? 'disabled' : ''}" title="Points x2, un seul par journée">
              <input type="checkbox" name="joker" ${bet && bet.joker ? 'checked' : ''} ${(jokerUsed && !(bet && bet.joker)) ? 'disabled' : ''}> 🃏 x2
            </label>
            <button class="btn small ${bet ? '' : 'primary'}">${bet ? 'Modifier' : 'Valider'}</button>
          </form>
          ${sh && sh.count ? `<div class="shares"><i style="width:${sh.H * 100}%"></i><i style="width:${sh.D * 100}%"></i><i style="width:${sh.A * 100}%"></i></div>
          <div class="shares-l"><span>1 · ${Math.round(sh.H * 100)}%</span><span>N · ${Math.round(sh.D * 100)}%</span><span>2 · ${Math.round(sh.A * 100)}%</span></div>` : ''}`;
      } else {
        foot = `<div class="result none">⏳ Match en cours / en attente du résultat${bet ? ` · ton prono : <b>${bet.home}-${bet.away}</b>` : ''}</div>`;
      }

      return `${i === 2 ? adSlot(filters.journee) : ''}
      <div class="card match ${fan ? 'fan' : ''}">
        ${fan ? '<span class="fan-tag">❤️ Ton équipe · bonus +' + R.FAN_BONUS + '</span>' : ''}
        <div class="when">${fmtDate(m.kickoff)}</div>
        <div class="teams">
          <div class="team">${crest(m.homeId)}<span>${esc(club(m.homeId).name)}</span></div>
          <div class="score">${m.status === 'finished' ? `${m.homeScore}<i>-</i>${m.awayScore}` : 'VS'}</div>
          <div class="team away"><span>${esc(club(m.awayId).name)}</span>${crest(m.awayId)}</div>
        </div>
        ${foot}
        <button class="admin-link" data-admin="${m.id}">✏️ Saisir le score (correspondant club)</button>
      </div>`;
    }).join('');

    return `
      <header class="top"><h2>Matchs</h2>
        <div class="seg small">${Object.keys(DIVISIONS).map(d => `<button data-div="${d}" class="${filters.div === d ? 'on' : ''}">${d}</button>`).join('')}</div>
      </header>
      <div class="chips">${js.map(j => `<button data-j="${j}" class="${filters.journee === j ? 'on' : ''}">J${j}</button>`).join('')}</div>
      <p class="hint">${DIVISIONS[filters.div]} · Journée ${filters.journee}. Les pronos ferment au coup d’envoi.</p>
      ${cards}`;
  }

  function onBet(form) {
    const u = me();
    const m = state.matches.find(x => x.id === form.dataset.match);
    if (!m || Date.now() >= m.kickoff) return toast('⛔ Trop tard, le match a commencé !');
    const home = parseInt(form.home.value, 10), away = parseInt(form.away.value, 10);
    if (!(home >= 0 && away >= 0)) return;
    const joker = form.joker.checked;
    if (joker) { // un seul joker par journée et par division
      state.bets.forEach(b => {
        const bm = state.matches.find(x => x.id === b.matchId);
        if (b.userId === u.id && bm && bm.journee === m.journee && bm.div === m.div) b.joker = false;
      });
    }
    const before = unlockedTitles(Store.computeAll(state).stats[u.id]);
    let bet = state.bets.find(b => b.userId === u.id && b.matchId === m.id);
    if (bet) Object.assign(bet, { home, away, joker, createdAt: Date.now() });
    else state.bets.push({ id: Store.uid(), userId: u.id, matchId: m.id, home, away, joker, createdAt: Date.now() });
    persist();
    toast(`✅ Prono enregistré : <b>${esc(club(m.homeId).short)} ${home}-${away} ${esc(club(m.awayId).short)}</b>`);
    announceNewTitles(before);
    render();
  }

  function onAdminScore(matchId) {
    const m = state.matches.find(x => x.id === matchId);
    const input = prompt(`Score final ${club(m.homeId).name} - ${club(m.awayId).name}\n(format 2-1, vide pour annuler le résultat)`,
      m.status === 'finished' ? `${m.homeScore}-${m.awayScore}` : '');
    if (input === null) return;
    const u = me();
    const before = unlockedTitles(Store.computeAll(state).stats[u.id]);
    const mt = input.trim().match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
    if (input.trim() === '') Object.assign(m, { status: 'scheduled', homeScore: null, awayScore: null });
    else if (mt) Object.assign(m, { status: 'finished', homeScore: +mt[1], awayScore: +mt[2] });
    else return toast('Format invalide. Exemple : 2-1');
    persist();
    announceNewTitles(before);
    render();
  }

  function announceNewTitles(before) {
    const after = unlockedTitles(Store.computeAll(state).stats[me().id]);
    after.filter(id => !before.includes(id)).forEach((id, i) => {
      const t = TITLES.find(x => x.id === id);
      setTimeout(() => toast(`<span class="big">${t.icon}</span> Nouveau titre débloqué !<br><b>${esc(t.name)}</b>`, 4200), 400 + i * 700);
    });
  }

  /* ---------------- CLASSEMENT ---------------- */
  function renderRanking(calc) {
    const u = me();
    const userById = Object.fromEntries(state.users.map(x => [x.id, x]));
    let body = '';

    if (filters.rank === 'clubs') {
      // Coupe des supporters : moyenne de points des supporters de chaque club
      const agg = {};
      calc.ranking.forEach(s => {
        const c = userById[s.userId].clubId;
        (agg[c] = agg[c] || { pts: 0, n: 0 });
        agg[c].pts += s.points; agg[c].n++;
      });
      body = Object.entries(agg).map(([c, a]) => ({ c, avg: a.pts / a.n, n: a.n }))
        .sort((a, b) => b.avg - a.avg)
        .map((r, i) => `<div class="row ${r.c === u.clubId ? 'me' : ''}"><span class="pos">${i + 1}</span>${crest(r.c, 30)}
          <div class="who"><b>${esc(club(r.c).name)}</b><small>${r.n} supporter${r.n > 1 ? 's' : ''}</small></div>
          <span class="score-pill">${r.avg.toFixed(1)}<small> moy.</small></span></div>`).join('');
      body = `<p class="hint">🏟️ La <b>Coupe des Supporters</b> : quel club a les pronostiqueurs les plus affûtés ? (moyenne de points)</p>` + body;
    } else {
      const rows = calc.ranking.filter(s => filters.rank === 'general' || userById[s.userId].clubId === u.clubId);
      body = rows.map((s, i) => {
        const p = userById[s.userId];
        const medal = ['🥇', '🥈', '🥉'][i] || (i + 1);
        return `${i === 5 ? adSlot(i) : ''}<div class="row ${p.id === u.id ? 'me' : ''}"><span class="pos">${medal}</span>${avatar(p, 36)}
          <div class="who"><b>${esc(p.pseudo)} ${p.premium ? '<span class="vip">+</span>' : ''}</b>
          <small>${crest(p.clubId, 14)} ${esc(club(p.clubId).short)} ${titleBadge(p, s)}</small></div>
          <span class="score-pill">${s.points}<small> pts</small></span></div>`;
      }).join('');
    }
    return `<header class="top"><h2>Classement</h2></header>
      <div class="seg wide">
        <button data-rank="general" class="${filters.rank === 'general' ? 'on' : ''}">Général</button>
        <button data-rank="club" class="${filters.rank === 'club' ? 'on' : ''}">Mon club</button>
        <button data-rank="clubs" class="${filters.rank === 'clubs' ? 'on' : ''}">Clubs</button>
      </div>
      <div class="card list">${body || '<p class="hint">Personne pour l’instant.</p>'}</div>`;
  }

  /* ---------------- TITRES ---------------- */
  function renderTitles(calc) {
    const u = me(), s = calc.stats[u.id];
    const got = unlockedTitles(s);
    const grid = list => list.map(t => {
      const ok = got.includes(t.id);
      const lockedPremium = t.premium && !u.premium;
      return `<button class="tile ${ok ? 'ok' : ''} ${t.premium ? 'premium' : ''} ${u.equippedTitle === t.id ? 'equipped' : ''}" data-title="${t.id}" ${ok ? '' : 'disabled'}>
        <span class="ti">${lockedPremium ? '🔒' : t.icon}</span><b>${esc(t.name)}</b><small>${esc(t.desc)}</small>
        ${u.equippedTitle === t.id ? '<em>Équipé</em>' : ''}</button>`;
    }).join('');
    const free = TITLES.filter(t => !t.premium), prem = TITLES.filter(t => t.premium);
    return `<header class="top"><h2>Titres</h2><span class="count">${got.length}/${TITLES.length}</span></header>
      <p class="hint">Touche un titre débloqué pour l’afficher à côté de ton pseudo dans le classement.</p>
      <div class="grid">${grid(free)}</div>
      <h3 class="section">💎 Titres Prono 49+ ${u.premium ? '' : '<button class="btn small gold" data-go="profile">Débloquer</button>'}</h3>
      <div class="grid">${grid(prem)}</div>`;
  }

  /* ---------------- PROFIL ---------------- */
  function renderProfile(calc) {
    const u = me(), s = calc.stats[u.id];
    const pct = s.finished ? Math.round(s.good / s.finished * 100) : 0;
    return `<header class="top"><h2>Profil</h2></header>
      <div class="card profile">
        ${avatar(u, 72)}
        <h3>${esc(u.pseudo)} ${u.premium ? '<span class="vip">+</span>' : ''}</h3>
        <div>${titleBadge(u, s) || '<small class="muted">Aucun titre équipé</small>'}</div>
        <p class="muted">${crest(u.clubId, 18)} Supporter de <b>${esc(club(u.clubId).name)}</b></p>
        <div class="kpis">
          <div><b>${s.points}</b><small>points</small></div>
          <div><b>${s.rank}<sup>e</sup></b><small>classement</small></div>
          <div><b>${pct}%</b><small>réussite</small></div>
          <div><b>${s.exact}</b><small>scores exacts</small></div>
        </div>
      </div>

      <div class="card">
        <h3>🎨 Cadre d’avatar</h3>
        <div class="frames">${FRAMES.map(f => {
          const locked = f.premium && !u.premium;
          return `<button data-frame="${f.id}" class="${u.frame === f.id ? 'on' : ''}" ${locked ? 'disabled' : ''}>
            ${avatar({ ...u, frame: f.id, premium: true }, 40)}<small>${locked ? '🔒 ' : ''}${f.name}</small></button>`;
        }).join('')}</div>
      </div>

      <div class="card premium-card ${u.premium ? 'active' : ''}">
        <h3>💎 Prono 49+</h3>
        ${u.premium
          ? `<p>Merci de soutenir l’appli et le foot amateur du 49 ! Tes avantages : titres exclusifs, cadres animés, badge <span class="vip">+</span>.</p>
             <button class="btn" data-premium="off">Résilier (démo)</button>`
          : `<ul><li>6 titres inédits réservés aux abonnés</li><li>Cadres d’avatar animés (or, holo, en feu, couleurs du club)</li><li>Badge <span class="vip">+</span> dans le classement</li><li>Une partie reversée à ton club ❤️</li></ul>
             <p class="price"><b>2,99 €</b> / mois · sans engagement</p>
             <button class="btn gold" data-premium="on">S’abonner (démo)</button>
             <small class="muted">Avantages uniquement esthétiques : aucun avantage sur les points.</small>`}
      </div>

      <div class="card">
        <h3>📏 Règles des points</h3>
        <table class="rules">
          <tr><td>🎯 Score exact</td><td>${R.EXACT} pts</td></tr>
          <tr><td>✅ Bon résultat + bon écart</td><td>${R.GOOD_DIFF} pts</td></tr>
          <tr><td>👍 Bon résultat (V/N/D)</td><td>${R.GOOD} pts</td></tr>
          <tr><td>❌ Mauvais résultat</td><td>0 pt</td></tr>
          <tr><td>❤️ Bonus supporter (match de ton équipe)</td><td>+${R.FAN_BONUS}</td></tr>
          <tr><td>🎲 Bonus audace (&lt; ${R.AUDACE_THRESHOLD * 100}% des joueurs)</td><td>+${R.AUDACE_BONUS}</td></tr>
          <tr><td>🃏 Joker (1 par journée)</td><td>x${R.JOKER_MULT}</td></tr>
        </table>
        <p class="muted small">Ex. : tu mises 2-0, ça finit 3-1 → bon résultat + bon écart = 3 pts. Ça finit 1-0 → bon résultat = 2 pts. Ça finit 1-1 → 0 pt.</p>
      </div>

      <div class="card actions">
        <button class="btn" data-action="logout">Se déconnecter</button>
        <button class="btn danger" data-action="reset">Réinitialiser la démo</button>
      </div>`;
  }

  /* ---------------- RENDU ---------------- */
  function render() {
    if (!me()) return renderAuth();
    const calc = Store.computeAll(state);
    const views = { matches: renderMatches, ranking: renderRanking, titles: renderTitles, profile: renderProfile };
    $('#app').innerHTML = `<div class="view fade">${views[tab](calc)}</div>`;
    $('#nav').hidden = false;
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  }

  /* ---------------- ÉVÉNEMENTS ---------------- */
  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'authForm') onAuth(e.target);
    else if (e.target.classList.contains('bet')) onBet(e.target);
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset, u = me();
    if (d.auth) return renderAuth(d.auth);
    if (d.tab || d.go) { tab = d.tab || d.go; window.scrollTo(0, 0); return render(); }
    if (d.div) { filters.div = d.div; filters.journee = null; return render(); }
    if (d.j) { filters.journee = +d.j; return render(); }
    if (d.rank) { filters.rank = d.rank; return render(); }
    if (d.admin) return onAdminScore(d.admin);
    if (d.title) { u.equippedTitle = u.equippedTitle === d.title ? null : d.title; persist(); return render(); }
    if (d.frame) { u.frame = d.frame; persist(); return render(); }
    if (d.premium) {
      const before = unlockedTitles(Store.computeAll(state).stats[u.id]);
      u.premium = d.premium === 'on';
      if (!u.premium) {
        if (FRAMES.find(f => f.id === u.frame)?.premium) u.frame = 'none';
        if (TITLES.find(t => t.id === u.equippedTitle)?.premium) u.equippedTitle = null;
      }
      persist();
      if (u.premium) { toast('💎 Bienvenue dans <b>Prono 49+</b> !'); announceNewTitles(before); }
      return render();
    }
    if (d.action === 'logout') { state.session = null; persist(); tab = 'matches'; return render(); }
    if (d.action === 'reset' && confirm('Effacer toutes les données de la démo ?')) { state = Store.reset(); tab = 'matches'; return render(); }
  });

  render();
})();
