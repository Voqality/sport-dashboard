// HYBRID · application (PWA). Tout est stocké sur le téléphone ; Strava passe par le relais /api/strava.
import { db, persistStorage, exportData, importData } from './db.js';
import * as strava from './strava.js';
import {
  RACE, PLAN_START, PLAN_WEEKS, PHASES, todayKey, addDaysKey, daysBetween, mondayOf, planWeek, phaseOf,
  sessionsOfWeek, sessionsOn, sessionsWithMoves, nextSession, formatDay, dowShort, dayNum,
} from './plan.js';
import {
  fmtPace, fmtDuration, fmtKm, fmtKg, paceOf, isRun, activityDay, matchRun, matchWorkout, isDone,
  suggestLoad, nextSetLoad, liftRecords, newRecords, weeklyKm, runRecords, predictRace, streak,
} from './stats.js';
import { RECIPES, TAGS, AISLES, MEAL_TYPES, DEFAULT_NEEDS, recipeById, buildShoppingList, shoppingListText, fmtQty, generateMenu, swapRecipe } from './recipes.js';

const VERSION = '1.2.0';
const appEl = document.getElementById('app');
const navEl = document.getElementById('nav');
const toastEl = document.getElementById('toast');

// ───────── État ─────────
const S = {
  activities: [],
  workouts: [],
  moves: {},
  creatine: [],
  whey: [],
  settings: {},
  strava: null,
  syncing: false,
  perfTab: 'course',
  seance: null, // séance muscu en cours d'affichage
  mealPlan: {}, // { recetteId: portions }
  shopChecked: [],
  shopExtra: [],
  recipeTag: 'all',
  menuWeek: null, // lundi de la semaine du menu en cours
  menuSeed: 0,
  menuHistory: {}, // { lundi: [recetteIds] }
};

async function load() {
  [S.activities, S.workouts, S.moves, S.creatine, S.whey, S.settings, S.strava, S.lastSync] = await Promise.all([
    db.all('activities'), db.all('workouts'), db.get('moves'), db.get('creatine'), db.get('whey'), db.get('settings'), strava.status(), db.get('lastSync'),
  ]);
  S.moves ??= {}; S.creatine ??= []; S.whey ??= []; S.settings ??= {};
  [S.mealPlan, S.shopChecked, S.shopExtra] = await Promise.all([db.get('mealPlan'), db.get('shopChecked'), db.get('shopExtra')]);
  S.mealPlan ??= {}; S.shopChecked ??= []; S.shopExtra ??= [];
  [S.menuWeek, S.menuSeed, S.menuHistory] = await Promise.all([db.get('menuWeek'), db.get('menuSeed'), db.get('menuHistory')]);
  S.menuSeed ??= 0; S.menuHistory ??= {};
  S.activities.sort((a, b) => String(b.start_date_local).localeCompare(String(a.start_date_local)));
}

// ───────── Outils ─────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svg = (body, size = 22, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;
const I = {
  sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  cal: svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  coach: svg('<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 20 12z"/>', 24, 'stroke-width="2"'),
  bars: svg('<path d="M5 20V12M12 20V5M19 20v-6"/>'),
  leaf: svg('<path d="M12 8c-3-2-8-1-8 5 0 4.5 3 8 5 8 1.2 0 1.8-.6 3-.6s1.8.6 3 .6c2 0 5-3.5 5-8 0-6-5-7-8-5z"/><path d="M12 8c0-2 1-4 3-5"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', 20),
  back: svg('<path d="M15 5l-7 7 7 7"/>', 22, 'stroke-width="1.9"'),
  next: svg('<path d="M9 5l7 7-7 7"/>', 18, 'stroke-width="2"'),
  check: svg('<path d="M5 12l5 5 9-10"/>', 14, 'stroke-width="3"'),
  play: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 20, 'stroke-width="1.9"'),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', 16, 'stroke-width="2"'),
};

function toast(msg, ms = 2600) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { toastEl.hidden = true; }, ms);
}

const today = () => todayKey();
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const stravaConnected = () => Boolean(S.strava);

function topBar(eyebrow, title, right = `<a class="icon-btn" href="#/profil" aria-label="Profil">${I.user}</a>`) {
  return `<header class="top"><div class="stack"><span class="eyebrow">${eyebrow}</span><h1 class="title">${title}</h1></div>${right}</header>`;
}

// ───────── Séances : affichage ─────────

function stepsBar(session) {
  const total = session.steps.reduce((s, x) => s + x.min, 0);
  const parts = [];
  for (const st of session.steps) {
    if (st.reps && st.kind === 'work') {
      for (let i = 0; i < st.reps; i++) {
        parts.push(`<span class="work" style="flex-grow:${st.min / st.reps}"></span>`);
        if (i < st.reps - 1) parts.push(`<span style="flex-grow:${Math.max(0.6, total * 0.025)}"></span>`);
      }
    } else {
      parts.push(`<span class="${st.kind}" style="flex-grow:${st.min}"></span>`);
    }
  }
  const label = session.steps.map(s => s.label).join(', ');
  return `<div class="steps" role="img" aria-label="Structure : ${esc(label)}">${parts.join('')}</div>`;
}

function stepsList(session) {
  return `<div class="list">${session.steps.map(st => `
    <div class="item"><span>${esc(st.label)}${st.recovery ? `<span class="muted small"> · récup ${esc(st.recovery)}</span>` : ''}</span>
    <span class="num ${st.kind === 'work' || st.kind === 'race' ? 'run-c' : 'muted'}" style="font-size:18px">${esc(st.pace)}</span></div>`).join('')}</div>`;
}

function runDoneBlock(act) {
  return `
    <div class="stats3" style="padding-top:14px;border-top:1px solid var(--line)">
      <div><span class="lbl">Distance</span><span class="val">${fmtKm(act.distance)}<span class="unit"> km</span></span></div>
      <div><span class="lbl">Allure</span><span class="val">${fmtPace(paceOf(act))}<span class="unit">/km</span></span></div>
      <div><span class="lbl">${act.average_heartrate ? 'FC moy.' : 'Durée'}</span><span class="val">${act.average_heartrate ? Math.round(act.average_heartrate) : fmtDuration(act.moving_time)}</span></div>
    </div>
    <span class="tiny muted" style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:#fc5200;border-radius:50%"></span>Synchronisé depuis Strava · ${esc(act.name ?? '')}</span>`;
}

function sessionCard(session) {
  const act = matchRun(session, S.activities);
  const wk = matchWorkout(session, S.workouts);
  const done = Boolean(act || wk);
  const kind = session.race ? 'race' : session.sport;
  const tagTxt = session.race ? 'Jour de course' : session.sport === 'run' ? (session.optional ? 'Course · en option' : 'Course') : 'Muscu';
  let body = '';

  if (session.sport === 'run') {
    body += stepsBar(session);
    body += done ? runDoneBlock(act) : stepsList(session);
    if (!done) {
      body += stravaConnected()
        ? `<span class="tiny muted">Lance ta montre ou Strava : la séance se cochera toute seule après ta sortie.</span>`
        : `<a class="btn small" href="#/profil">Connecter Strava pour cocher tes sorties</a>`;
    }
  } else {
    if (done) {
      const sets = wk.sets.length;
      body += `<div class="row-between"><span class="muted small">${sets} séries · ${fmtDuration((wk.endedAt - wk.startedAt) / 1000)}</span><a class="link-btn" href="#/fin/${esc(wk.id)}">Voir le bilan</a></div>`;
    } else {
      body += `<div class="list">${session.exercises.map(ex => {
        const sug = ex.loaded ? suggestLoad(ex.id, S.workouts) : null;
        return `<div class="item"><span>${esc(ex.name)}</span><span style="display:flex;align-items:baseline;gap:10px"><span class="muted small">${ex.sets} × ${ex.reps}${ex.unit === 's' ? ' s' : ''}</span>${sug ? `<b class="num" style="font-size:20px;min-width:58px;text-align:right">${fmtKg(sug.kg)} kg</b>` : ''}</span></div>`;
      }).join('')}</div>`;
      const inProgress = S.workouts.find(w => w.plannedId === session.id && !w.endedAt);
      body += `<a class="btn primary block" href="#/seance/${esc(session.id)}">${I.play} ${inProgress ? 'Reprendre la séance' : 'Démarrer la séance'}</a>`;
    }
  }

  return `
    <section class="card">
      <div class="row-between" style="align-items:flex-start">
        <div style="display:flex;flex-direction:column;gap:6px">
          <span class="tag ${kind}">${tagTxt}</span>
          <h2 class="h2">${esc(session.title)}</h2>
          <span class="small muted">${esc(session.detail)}${session.movedFrom ? ` · déplacée du ${esc(formatDay(session.movedFrom, { short: true }))}` : ''}</span>
        </div>
        ${done ? `<span class="pill ok">${I.check} Fait</span>` : ''}
      </div>
      ${body}
    </section>`;
}

function lane(mondayKey) {
  const sessions = sessionsOfWeek(mondayKey, S.moves).filter(s => !s.optional || isDone(s, S.activities, S.workouts));
  if (!sessions.length) return '';
  const t = today();
  const done = sessions.filter(s => isDone(s, S.activities, S.workouts)).length;
  const week = planWeek(mondayKey);
  return `
    <section aria-label="Ta semaine" style="display:flex;flex-direction:column;gap:8px">
      <div class="row-between small"><span class="muted">Semaine ${week} sur ${PLAN_WEEKS} · <b style="color:var(--fg)">${esc(phaseOf(week))}</b></span><span class="muted"><b style="color:var(--fg)">${done}</b> / ${sessions.length} séances</span></div>
      <div class="lane" style="grid-template-columns:repeat(${sessions.length},minmax(0,1fr))">
        ${sessions.map(s => {
          const k = s.race ? 'race' : s.sport;
          const d = isDone(s, S.activities, S.workouts);
          const isToday = s.date === t;
          return `<div class="seg"><span class="bar ${k} ${d ? 'done' : ''} ${isToday ? 'today' : ''}"></span><span class="d ${isToday ? 'today' : ''}">${dowShort(s.date)}</span></div>`;
        }).join('')}
      </div>
    </section>`;
}

// ───────── Écran : Aujourd'hui ─────────

function viewToday() {
  const t = today();
  const week = planWeek(t);
  const todays = sessionsOn(t, S.moves);
  const main = todays.find(s => !s.optional) ?? todays[0];
  let hero;

  if (week === 0) {
    const first = sessionsWithMoves(S.moves)[0];
    hero = `
      <section class="card">
        <span class="tag rest">Avant le plan</span>
        <h2 class="h2">Ton plan commence ${esc(formatDay(PLAN_START))}</h2>
        <span class="small muted">D'ici là : un footing facile de 30 min ou une petite séance de muscu, sans forcer.</span>
        <div class="list"><div class="item"><span><span class="muted">1ʳᵉ séance</span> · ${esc(first.title)}</span><span class="num run-c" style="font-size:18px;white-space:nowrap">${esc(formatDay(first.date, { short: true }))}</span></div></div>
      </section>`;
  } else if (main) {
    hero = sessionCard(main);
  } else if (t > RACE.date) {
    hero = `<section class="card"><span class="tag race">Plan terminé</span><h2 class="h2">Bravo pour le ${esc(RACE.name)} !</h2><span class="small muted">Ton résultat apparaît dans Perfs dès que Strava l'a reçu. On prépare la suite avec le coach.</span></section>`;
  } else {
    hero = `<section class="card"><span class="tag rest">Repos</span><h2 class="h2">Jour de récupération</h2><span class="small muted">Marche, étirements, bon sommeil. Rien d'autre au programme.</span></section>`;
  }

  // La suite
  const rows = [];
  for (const s of todays.filter(s => s !== main)) rows.push(rowSession(s, 'Aujourd’hui'));
  const nxt = nextSession(t, S.moves);
  if (nxt) rows.push(rowSession(nxt, capital(daysBetween(t, nxt.date) === 1 ? 'demain' : formatDay(nxt.date, { short: true }))));
  const jRace = daysBetween(t, RACE.date);
  if (jRace >= 0) {
    const pred = predictRace(S.activities, t);
    rows.push(`<a class="item" href="#/perfs"><span class="dot race" style="border-radius:50%"></span><span class="grow"><span>${esc(RACE.name)} · ${jRace === 0 ? 'aujourd’hui' : `J-${jRace}`}</span><span class="tiny muted">Objectif ${fmtDuration(RACE.targetTimeS)}${pred ? ` · prédit ${fmtDuration(pred.time)}` : ''}</span></span>${I.next}</a>`);
  }
  const creaToday = S.creatine.includes(t);
  rows.push(`<button type="button" class="item" data-action="creatine" style="background:none;border:none;border-top:1px solid var(--line);width:100%;text-align:left;color:var(--fg);padding:8px 0">
      <span class="dot ${creaToday ? 'ok' : 'other'}" style="border-radius:50%"></span>
      <span class="grow"><span>Créatine · 5 g</span><span class="tiny muted">${creaToday ? `Prise · ${streak(S.creatine, t)} jour(s) de suite` : 'Touche pour cocher la prise du jour'}</span></span>
      ${creaToday ? `<span class="check">${I.check}</span>` : '<span class="pill" style="border:1px solid var(--border-strong)">Prise</span>'}
    </button>`);

  return `
    <div class="screen">
      ${topBar(esc(formatDay(t)), 'Aujourd’hui')}
      ${week >= 1 && week <= PLAN_WEEKS ? lane(mondayOf(t)) : ''}
      ${hero}
      <section aria-label="La suite" class="list bordered">${rows.join('')}</section>
      ${syncLine()}
    </div>`;
}

function rowSession(s, when) {
  const k = s.race ? 'race' : s.sport;
  // Allure qui compte : la partie intense si elle dure 8 min ou plus, sinon la partie la plus longue (le footing).
  const main = s.sport === 'run'
    ? s.steps.find(x => (x.kind === 'work' || x.kind === 'race') && x.min >= 8) ?? s.steps.reduce((m, x) => (x.min > m.min ? x : m))
    : null;
  const pace = main ? main.pace : '';
  const href = s.sport === 'muscu' ? `#/seance/${s.id}` : `#/detail/${s.id}`;
  return `<a class="item" href="${href}"><span class="dot ${k}"></span><span class="grow"><span><span class="muted">${esc(when)}</span> · ${esc(s.title)}</span>${s.optional ? '<span class="tiny muted">En option</span>' : ''}</span>${pace ? `<span class="num ${k === 'run' ? 'run-c' : ''}" style="font-size:18px">${esc(pace)}</span>` : I.next}</a>`;
}

function syncLine() {
  if (!stravaConnected()) return `<a class="small muted" href="#/profil" style="text-decoration:none">Strava non connecté · <span class="run-c">connecter</span></a>`;
  const last = S.lastSync ? new Date(S.lastSync) : null;
  return `<span class="small muted" style="display:flex;align-items:center;gap:8px"><span class="dot" style="background:#fc5200;border-radius:50%"></span>${S.syncing ? 'Synchronisation Strava…' : `Strava synchronisé${last ? ` à ${last.getHours()}:${String(last.getMinutes()).padStart(2, '0')}` : ''}`}</span>`;
}

// ───────── Écran : détail d'une séance (course) + déplacer ─────────

function viewDetail(id) {
  const s = sessionsWithMoves(S.moves).find(x => x.id === id);
  if (!s) return viewNotFound();
  const monday = mondayOf(s.movedFrom ?? s.date);
  const options = Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
  return `
    <div class="screen no-nav">
      <header class="top"><a class="back" href="#/plan/${planWeek(s.date)}" aria-label="Retour">${I.back}</a></header>
      ${sessionCard(s)}
      <section class="field">
        <label class="section-title" for="move">Déplacer cette séance</label>
        <select id="move" data-action="move" data-id="${esc(s.id)}" style="min-height:48px;border-radius:14px;border:1px solid var(--border-strong);background:var(--surface);padding:0 12px">
          ${options.map(d => `<option value="${d}" ${d === s.date ? 'selected' : ''}>${esc(capital(formatDay(d)))}</option>`).join('')}
        </select>
        <span class="tiny muted">Garde au moins un jour entre deux séances intenses, et pas de muscu jambes la veille d'une séance de qualité.</span>
      </section>
    </div>`;
}

// ───────── Écran : Plan ─────────

function viewPlan(weekArg) {
  const t = today();
  const cur = Math.min(PLAN_WEEKS, Math.max(1, planWeek(t) || 1));
  const week = Math.min(PLAN_WEEKS, Math.max(1, Number(weekArg) || cur));
  const monday = addDaysKey(PLAN_START, (week - 1) * 7);
  const sessions = sessionsOfWeek(monday, S.moves);
  const days = Array.from({ length: 7 }, (_, i) => addDaysKey(monday, i));
  const km = sessions.filter(s => s.sport === 'run' && !s.optional).reduce((a, s) => a + s.estKm, 0);
  const nMuscu = sessions.filter(s => s.sport === 'muscu').length;

  const phaseBar = PHASES.map(p => {
    const state = p.weeks.includes(week) ? 'cur' : Math.max(...p.weeks) < week ? 'past' : '';
    return `<span class="${state}" style="flex-grow:${p.weeks.length}"></span>`;
  }).join('');
  const phaseNames = PHASES.map(p => `<span style="flex-grow:${p.weeks.length};${p.weeks.includes(week) ? 'color:var(--fg);font-weight:700' : ''}">${esc(p.name)}</span>`).join('');

  const rows = days.map(d => {
    const list = sessions.filter(s => s.date === d);
    const dn = `<div class="dn"><span class="tiny">${dowShort(d)}</span><b>${dayNum(d)}</b></div>`;
    if (!list.length) return `<div class="day ${d === t ? 'today' : ''}">${dn}<span class="vbar"></span><span class="grow muted small" style="flex:1">Repos</span></div>`;
    return list.map(s => {
      const k = s.race ? 'race' : s.sport;
      const done = isDone(s, S.activities, S.workouts);
      const act = matchRun(s, S.activities);
      const sub = act ? `${fmtKm(act.distance)} km · ${fmtPace(paceOf(act))}/km · Strava` : s.sport === 'run' ? `Course · ~${String(s.estKm).replace('.', ',')} km` : `Muscu · ${s.minutes} min`;
      const href = s.sport === 'muscu' ? `#/seance/${s.id}` : `#/detail/${s.id}`;
      const right = done ? `<span class="check" aria-label="Fait">${I.check}</span>` : d === t ? '<span class="pill lift">Aujourd’hui</span>' : I.next;
      return `<a class="day ${d === t ? 'today' : ''} ${s.optional ? 'optional' : ''}" href="${href}">${dn}<span class="vbar ${k}"></span><span class="grow" style="flex:1;display:flex;flex-direction:column;min-width:0"><span style="font-weight:${d === t ? 700 : 400}">${esc(s.title)}</span><span class="tiny muted">${esc(sub)}${s.optional ? ' · option' : ''}</span></span>${right}</a>`;
    }).join('');
  }).join('');

  return `
    <div class="screen">
      ${topBar(`${esc(RACE.name)} · J-${Math.max(0, daysBetween(t, RACE.date))}`, 'Plan')}
      <section aria-label="Phases du plan" style="display:flex;flex-direction:column;gap:8px">
        <div class="phases">${phaseBar}<span style="flex-grow:0;background:none;color:var(--muted)">${I.flag}</span></div>
        <div class="tiny muted" style="display:flex;gap:4px">${phaseNames}<span style="width:16px"></span></div>
      </section>
      <div class="row-between" style="align-items:center">
        <a class="icon-btn square" href="#/plan/${Math.max(1, week - 1)}" aria-label="Semaine précédente" ${week === 1 ? 'aria-disabled="true" style="opacity:.4;pointer-events:none"' : ''}>${I.back}</a>
        <div style="display:flex;flex-direction:column;align-items:center"><span class="num" style="font-size:22px;line-height:1">Semaine ${week}</span><span class="tiny muted">${esc(formatDay(monday, { withDow: false }))} – ${esc(formatDay(addDaysKey(monday, 6), { withDow: false }))}</span></div>
        <a class="icon-btn square" href="#/plan/${Math.min(PLAN_WEEKS, week + 1)}" aria-label="Semaine suivante" ${week === PLAN_WEEKS ? 'aria-disabled="true" style="opacity:.4;pointer-events:none"' : ''}>${I.next}</a>
      </div>
      <section aria-label="Séances de la semaine">${rows}</section>
      <div class="row-between small muted"><span>Prévu : <b class="run-c">${String(km).replace('.', ',')} km</b> · <b class="lift-c">${nMuscu} muscu</b></span><span>Touche une séance pour la déplacer</span></div>
    </div>`;
}

// ───────── Écran : séance de musculation ─────────

async function openSeance(plannedId) {
  const planned = sessionsWithMoves(S.moves).find(s => s.id === plannedId && s.sport === 'muscu');
  if (!planned) return null;
  let w = S.workouts.find(x => x.plannedId === plannedId && !x.endedAt);
  if (!w) {
    const finished = S.workouts.find(x => x.plannedId === plannedId && x.endedAt);
    if (finished) { location.hash = `#/fin/${finished.id}`; return null; }
    w = { id: `w-${Date.now()}`, plannedId, title: planned.title, date: today(), startedAt: Date.now(), endedAt: null, sets: [] };
    await db.put('workouts', w);
    S.workouts.push(w);
  }
  if (!S.seance || S.seance.workout.id !== w.id) {
    S.seance = { workout: w, planned, exIndex: firstIncomplete(w, planned), draft: null, restEnd: 0, restTotal: 0, alerted: true };
  }
  return S.seance;
}

function firstIncomplete(w, planned) {
  const i = planned.exercises.findIndex(ex => w.sets.filter(s => s.exerciseId === ex.id).length < ex.sets);
  return i === -1 ? planned.exercises.length - 1 : i;
}

function draftFor(se) {
  const ex = se.planned.exercises[se.exIndex];
  const done = se.workout.sets.filter(s => s.exerciseId === ex.id);
  if (se.draft && se.draft.exerciseId === ex.id && se.draft.n === done.length) return se.draft;
  const last = done[done.length - 1];
  let kg = 0;
  let hint = '';
  if (ex.loaded) {
    if (last) { kg = nextSetLoad(last); if (kg > last.kg) hint = `+2,5 kg : la série ${done.length} était facile`; else if (kg < last.kg) hint = `−2,5 kg : la série ${done.length} était dure`; }
    else { const sug = suggestLoad(ex.id, S.workouts.filter(w => w.id !== se.workout.id)); if (sug) { kg = sug.kg; hint = sug.reason; } else hint = 'Première fois : choisis une charge confortable'; }
  }
  se.draft = { exerciseId: ex.id, n: done.length, kg, reps: last?.reps ?? ex.reps, hint };
  return se.draft;
}

function viewSeance() {
  const se = S.seance;
  const { planned, workout } = se;
  const ex = planned.exercises[se.exIndex];
  const done = workout.sets.filter(s => s.exerciseId === ex.id);
  const d = draftFor(se);
  const last = workout.sets[workout.sets.length - 1];
  const needFeel = last && !last.feel;
  const resting = se.restEnd > Date.now();
  const allDone = planned.exercises.every(e => workout.sets.filter(s => s.exerciseId === e.id).length >= e.sets);

  const progress = planned.exercises.map((e, i) => {
    const n = workout.sets.filter(s => s.exerciseId === e.id).length;
    const cls = n >= e.sets ? 'done' : i === se.exIndex ? 'cur' : '';
    return `<span class="${cls}" style="--p:${Math.round((n / e.sets) * 100)}%"></span>`;
  }).join('');

  const restBlock = resting ? `
    <section aria-label="Repos" style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div class="ring" id="ring" style="--p:0%"><div><span class="eyebrow" style="font-size:11px">Repos</span><span class="t" id="rest-t">–</span><span class="tiny muted">sur ${fmtDuration(se.restTotal)}</span></div></div>
      <div class="chips" style="justify-content:center"><button type="button" class="chip" data-action="rest-add">+30 s</button><button type="button" class="chip" data-action="rest-skip">Passer le repos</button></div>
    </section>` : '';

  const feelBlock = needFeel ? `
    <section style="display:flex;flex-direction:column;gap:10px">
      <span style="font-weight:700">${esc(last.name)}, série ${workout.sets.filter(s => s.exerciseId === last.exerciseId).length} : c'était comment ?</span>
      <div class="feel">
        <button type="button" data-action="feel" data-feel="facile">Facile</button>
        <button type="button" data-action="feel" data-feel="correct">Correct</button>
        <button type="button" data-action="feel" data-feel="dur">Dur</button>
      </div>
    </section>` : '';

  const unit = ex.unit === 's' ? 's' : 'reps';
  const nextSetBlock = done.length < ex.sets ? `
    <section class="card" style="padding:14px 16px;gap:10px;border-radius:20px">
      <div class="row-between"><span class="eyebrow" style="font-size:12px">Série ${done.length + 1}</span><span class="tiny ${d.hint.startsWith('+') ? 'ok-c' : 'muted'}">${esc(d.hint)}</span></div>
      <div style="display:grid;grid-template-columns:${ex.loaded ? 'repeat(2,minmax(0,1fr))' : '1fr'};gap:12px">
        ${ex.loaded ? `<div class="stepper"><button type="button" data-action="kg" data-d="-2.5" aria-label="Moins 2,5 kg">−</button><span class="v"><label class="tiny muted" for="kg-input" style="order:2">kg</label><input id="kg-input" inputmode="decimal" value="${fmtKg(d.kg)}" aria-label="Charge en kg"></span><button type="button" data-action="kg" data-d="2.5" aria-label="Plus 2,5 kg">+</button></div>` : ''}
        <div class="stepper" ${ex.loaded ? 'style="padding-left:12px;border-left:1px solid var(--line)"' : ''}><button type="button" data-action="reps" data-d="${unit === 's' ? -5 : -1}" aria-label="Moins">−</button><span class="v"><b id="reps-v">${d.reps}</b><span class="tiny muted">${unit}</span></span><button type="button" data-action="reps" data-d="${unit === 's' ? 5 : 1}" aria-label="Plus">+</button></div>
      </div>
    </section>` : `
    <section class="card" style="padding:14px 16px;border-radius:20px">
      <span>${esc(ex.name)} terminé ✓</span>
      ${se.exIndex < planned.exercises.length - 1 ? `<button type="button" class="btn run block" data-action="next-ex">Exercice suivant : ${esc(planned.exercises[se.exIndex + 1].name)}</button>` : ''}
    </section>`;

  const doneList = done.map((s, i) => `<span>S${i + 1} · ${ex.loaded ? `${fmtKg(s.kg)} × ` : ''}${s.reps}${unit === 's' ? ' s' : ''}${s.feel ? ` · <span style="color:var(--fg-2)">${s.feel}</span>` : ''}</span>`).join('');

  const cta = allDone || (se.exIndex === planned.exercises.length - 1 && done.length >= ex.sets)
    ? `<button type="button" class="btn primary block" data-action="finish">Terminer la séance</button>`
    : done.length < ex.sets
      ? `<button type="button" class="btn primary block" data-action="validate-set" ${needFeel ? 'disabled' : ''}>${needFeel ? 'Dis-moi comment c’était' : `Valider la série ${done.length + 1}`}</button>`
      : `<button type="button" class="btn primary block" data-action="next-ex">Exercice suivant</button>`;

  return `
    <div class="screen no-nav" style="gap:18px">
      <header class="top" style="align-items:center">
        <a class="back" href="#/" aria-label="Quitter (la séance est gardée)">${I.back}</a>
        <div style="display:flex;flex-direction:column;align-items:center"><span class="small muted">${esc(planned.title)}</span><span class="num" id="elapsed" style="font-size:18px">0:00</span></div>
        <button type="button" class="link-btn" data-action="finish" style="color:var(--lift-txt);text-decoration:none;min-height:44px">Terminer</button>
      </header>
      <div class="progress4" style="grid-template-columns:repeat(${planned.exercises.length},minmax(0,1fr))">${progress}</div>
      <section class="row-between" style="align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
          <h1 class="title" style="font-size:40px">${esc(ex.name)}</h1>
          <span class="small muted">Série ${Math.min(done.length + 1, ex.sets)} sur ${ex.sets} · objectif ${ex.reps} ${esc(ex.unit)}</span>
        </div>
        <div class="sets-done">${doneList}</div>
      </section>
      ${restBlock}
      ${feelBlock}
      ${nextSetBlock}
      <div class="chips">
        ${se.exIndex > 0 ? '<button type="button" class="chip" data-action="prev-ex">Exercice précédent</button>' : ''}
        ${se.exIndex < planned.exercises.length - 1 && done.length < ex.sets ? '<button type="button" class="chip" data-action="next-ex">Passer cet exercice</button>' : ''}
      </div>
      <div class="footer-cta">${cta}</div>
    </div>`;
}

// ───────── Écran : fin de séance ─────────

function viewFin(id) {
  const w = S.workouts.find(x => x.id === id);
  if (!w) return viewNotFound();
  const previous = S.workouts.filter(x => x.id !== id && x.endedAt && x.date <= w.date && x.startedAt < w.startedAt);
  const recs = newRecords(w, previous);
  const tonnage = w.sets.reduce((s, x) => s + (x.kg > 0 ? x.kg * x.reps : 0), 0);
  const byEx = [];
  for (const s of w.sets) {
    let e = byEx.find(x => x.id === s.exerciseId);
    if (!e) { e = { id: s.exerciseId, name: s.name, sets: 0, reps: [], maxKg: 0, unit: s.unit }; byEx.push(e); }
    e.sets++; e.reps.push(s.reps); e.maxKg = Math.max(e.maxKg, s.kg || 0);
  }
  const top = recs[0];
  const hero = top ? `
    <section class="record">
      <span class="pill ok" style="align-self:flex-start;letter-spacing:.12em;text-transform:uppercase;font-size:11px">Nouveau record</span>
      <span class="small" style="color:var(--fg-2);margin-top:6px">${esc(top.name)} · 1RM estimé</span>
      <span class="big">${Math.round(top.e1rm)}<span style="font-size:32px;color:var(--fg)"> kg</span></span>
      <span class="small ok-c" style="font-weight:700">+${Math.round(top.e1rm - top.previous)} kg par rapport à ton meilleur</span>
      <span class="small muted">Meilleure série : ${top.reps} × ${fmtKg(top.kg)} kg${top.feel ? `, ${top.feel}` : ''}</span>
    </section>` : `
    <section class="card"><span class="tag muscu">Séance validée</span><span class="small muted">${previous.length ? 'Pas de nouveau record aujourd’hui : la régularité fait le travail.' : 'Première séance enregistrée : tes prochains records se calculeront à partir d’elle.'}</span></section>`;

  return `
    <div class="screen no-nav">
      <header class="top" style="align-items:center"><span class="eyebrow">Séance terminée</span><a class="back" href="#/" aria-label="Fermer" style="margin:0 -12px 0 0">${I.close}</a></header>
      <div style="display:flex;flex-direction:column;gap:4px"><h1 class="title">${esc(w.title)}</h1><span class="small muted">${esc(capital(formatDay(w.date)))} · ${fmtDuration(((w.endedAt ?? Date.now()) - w.startedAt) / 1000)}</span></div>
      ${hero}
      <section class="stats3">
        <div><span class="lbl">Séries</span><span class="val">${w.sets.length}</span></div>
        <div><span class="lbl">Soulevé</span><span class="val">${(tonnage / 1000).toFixed(1).replace('.', ',')}<span class="unit"> t</span></span></div>
        <div><span class="lbl">Records</span><span class="val ${recs.length ? 'ok-c' : ''}">${recs.length}</span></div>
      </section>
      <section class="list bordered" aria-label="Détail des exercices">
        ${byEx.map(e => `<div class="item"><span>${esc(e.name)}</span><span class="small muted">${e.sets} × ${Math.max(...e.reps)}${e.unit === 's' ? ' s' : ''}${e.maxKg ? ` · jusqu'à <b style="color:var(--fg)">${fmtKg(e.maxKg)} kg</b>` : ''}</span></div>`).join('') || '<div class="item muted">Aucune série enregistrée.</div>'}
      </section>
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">
        <button type="button" class="btn" data-action="share" data-id="${esc(w.id)}">Partager</button>
        <a class="btn primary" href="#/">Terminer</a>
      </div>
    </div>`;
}

// ───────── Écran : Perfs ─────────

function viewPerfs() {
  const t = today();
  const course = S.perfTab === 'course';
  let body;
  if (course) {
    const weeks = weeklyKm(S.activities, t, 8);
    const avg4 = weeks.slice(-4).reduce((s, w) => s + w.km, 0) / 4;
    const max = Math.max(5, ...weeks.map(w => w.km));
    const recs = runRecords(S.activities);
    const pred = predictRace(S.activities, t);
    body = !S.activities.some(isRun) ? emptyState('Aucune course pour l’instant', stravaConnected() ? 'Tes sorties Strava apparaîtront ici.' : 'Connecte Strava dans Profil pour voir tes sorties.') : `
      <section style="display:flex;flex-direction:column;gap:2px">
        <span class="small muted">Moyenne des 4 dernières semaines</span>
        <div style="display:flex;align-items:baseline;gap:10px"><span class="big run-c" style="font-size:72px">${avg4.toFixed(1).replace('.', ',')}</span><span class="num muted" style="font-size:24px">km / semaine</span></div>
      </section>
      <section aria-label="Kilomètres par semaine" style="display:flex;flex-direction:column;gap:8px">
        <div class="bars" style="grid-template-columns:repeat(${weeks.length},minmax(0,1fr))">
          ${weeks.map((w, i) => `<div><span class="v ${i === weeks.length - 1 ? 'run-c' : ''}">${Math.round(w.km)}</span><span class="b ${i === weeks.length - 1 ? 'cur' : ''}" style="height:${Math.round((w.km / max) * 108)}px"></span></div>`).join('')}
        </div>
        <div class="row-between tiny muted"><span>${esc(formatDay(weeks[0].start, { short: true, withDow: false }))}</span><span>Cette semaine</span></div>
      </section>
      <section>
        <h2 class="section-title">Objectif · ${esc(RACE.name)}</h2>
        <div class="stats3">
          <div><span class="lbl">Objectif</span><span class="val">${fmtDuration(RACE.targetTimeS)}</span></div>
          <div><span class="lbl">Prédit</span><span class="val ${pred && pred.time <= RACE.targetTimeS ? 'ok-c' : 'run-c'}">${pred ? fmtDuration(pred.time) : '–'}</span></div>
          <div><span class="lbl">Allure</span><span class="val">${pred ? fmtPace(pred.time / RACE.distanceKm) : '–'}</span></div>
        </div>
        <p class="tiny muted" style="margin:8px 0 0">${pred ? `D'après ta sortie du ${esc(formatDay(activityDay(pred.from), { short: true }))} (${fmtKm(pred.from.distance)} km). La prédiction s'améliore avec tes séances.` : 'Fais une sortie de 3 km ou plus pour obtenir une prédiction.'}</p>
      </section>
      <section class="list bordered" aria-label="Records">
        <h2 class="section-title">Records</h2>
        ${recs.map(r => `<div class="item"><span class="grow"><span>${esc(r.label)}</span><span class="tiny muted">${esc(capital(formatDay(activityDay(r.activity), { short: true })))}</span></span><b class="num" style="font-size:24px">${esc(r.value)}</b></div>`).join('')}
      </section>`;
  } else {
    const recs = liftRecords(S.workouts.filter(w => w.endedAt));
    body = !recs.length ? emptyState('Pas encore de records de muscu', 'Ils apparaîtront après ta première séance enregistrée.') : `
      <section class="list bordered" aria-label="Records de musculation">
        <h2 class="section-title">1RM estimé par exercice</h2>
        ${recs.map(r => `<div class="item"><span class="grow"><span>${esc(r.name)}</span><span class="tiny muted">${r.reps} × ${fmtKg(r.kg)} kg · ${esc(formatDay(r.date, { short: true }))}</span></span><b class="num" style="font-size:24px">${Math.round(r.e1rm)} kg</b></div>`).join('')}
      </section>`;
  }
  return `
    <div class="screen">
      <header class="top" style="align-items:flex-end"><h1 class="title">Perfs</h1>
        <div class="seg-ctrl" role="group" aria-label="Sport">
          <button type="button" data-action="perf-tab" data-tab="course" aria-pressed="${course}">Course</button>
          <button type="button" data-action="perf-tab" data-tab="muscu" aria-pressed="${!course}" ${!course ? 'style="background:var(--lift);color:#1a0802"' : ''}>Muscu</button>
        </div>
      </header>
      ${body}
    </div>`;
}

const emptyState = (title, text) => `<section class="card" style="align-items:flex-start"><h2 class="h2" style="font-size:24px">${esc(title)}</h2><span class="small muted">${esc(text)}</span></section>`;

// ───────── Écran : Coach (prochaine étape) ─────────

function viewCoach() {
  return `
    <div class="screen">
      ${topBar('Bientôt', 'Coach')}
      <section class="notice">
        <span class="eyebrow coach-c">Prochaine étape du projet</span>
        <h2 class="h2" style="font-size:26px">Ton coach IA arrive</h2>
        <span class="small" style="color:var(--fg-2)">Il connaîtra ton plan, tes sorties Strava et tes séances de muscu. Tu pourras lui parler (« j'ai mal dormi », « je peux décaler mon seuil ? ») et il te proposera des changements que tu valideras d'un tap.</span>
      </section>
      <section class="list bordered">
        <h2 class="section-title">En attendant, les règles d'or</h2>
        <div class="item"><span>Footing : tu dois pouvoir parler en courant (6:00–6:30/km).</span></div>
        <div class="item"><span>Une douleur qui dure plus de 2–3 jours : on allège et on consulte.</span></div>
        <div class="item"><span>Pas de muscu jambes la veille d'une séance de qualité.</span></div>
        <div class="item"><span>Le jour J : 1ᵉʳ km à 5:15–5:20, côtes à l'effort, accélère sur les 2 derniers km.</span></div>
      </section>
    </div>`;
}

// ───────── Écran : Nutrition ─────────

function viewNutrition() {
  const t = today();
  const crea = S.creatine.includes(t);
  const whey = S.whey.includes(t);
  const st = streak(S.creatine, t);
  const last14 = Array.from({ length: 14 }, (_, i) => addDaysKey(t, i - 13));
  const weight = Number(S.settings.weightKg) || 0;
  return `
    <div class="screen">
      ${topBar('Compléments et protéines', 'Nutrition', '')}
      <section class="card" style="gap:14px">
        <div class="row-between" style="align-items:center">
          <div style="display:flex;flex-direction:column;gap:2px"><span style="font-weight:700;font-size:17px">Créatine · 5 g</span><span class="small muted">Tous les jours, à l'heure que tu veux</span></div>
          <button type="button" class="btn small ${crea ? '' : 'primary'}" data-action="creatine" aria-pressed="${crea}">${crea ? `${I.check} Prise` : 'Je l’ai prise'}</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div class="row-between tiny muted"><span>14 derniers jours</span><span><b style="color:var(--fg)">${st}</b> jour(s) de suite</span></div>
          <div style="display:grid;grid-template-columns:repeat(14,minmax(0,1fr));gap:4px">${last14.map(d => `<span title="${d}" style="height:22px;border-radius:5px;background:${S.creatine.includes(d) ? 'var(--ok)' : 'var(--surface-2)'};${d === t ? 'box-shadow:0 0 0 1.5px var(--fg-2)' : ''}"></span>`).join('')}</div>
        </div>
        <span class="tiny muted">Effets en 3 à 4 semaines si tu en prends chaque jour. Possible +1 à 2 kg d'eau sur la balance au début.</span>
      </section>
      <section class="list bordered">
        <div class="item">
          <span class="grow"><span style="font-weight:700">Whey · 30 g</span><span class="tiny muted">Après la muscu, si tu manques de protéines</span></span>
          <button type="button" class="btn small" data-action="whey" aria-pressed="${whey}" style="${whey ? 'border-color:var(--ok);color:var(--ok)' : ''}">${whey ? `${I.check} Prise` : 'Prise'}</button>
        </div>
        <div class="item">
          <span class="grow"><span style="font-weight:700">Protéines du jour</span><span class="tiny muted">${weight ? `Vise environ ${Math.round(weight * 1.6)} à ${Math.round(weight * 2)} g (1,6 à 2 g par kg)` : 'Indique ton poids dans Profil pour calculer ta cible'}</span></span>
          ${weight ? `<b class="num" style="font-size:22px">${Math.round(weight * 1.8)} g</b>` : `<a class="link-btn" href="#/profil">Profil</a>`}
        </div>
        <a class="item" href="#/recettes"><span class="grow"><span style="font-weight:700">Recettes de la semaine</span><span class="tiny muted">${portionsCount() ? `${portionsCount()} portion(s) choisie(s)` : 'Choisis tes repas, la liste de courses se fait toute seule'}</span></span>${I.next}</a>
        <a class="item" href="#/courses"><span class="grow"><span style="font-weight:700">Liste de courses</span><span class="tiny muted">${shopCount() ? `${shopCount()} article(s) · triés par rayon` : 'Vide pour l’instant'}</span></span>${I.next}</a>
      </section>
    </div>`;
}


// ───────── Recettes et liste de courses ─────────

const portionsCount = () => Object.values(S.mealPlan).reduce((s, n) => s + (n > 0 ? n : 0), 0);
const currentList = () => buildShoppingList(S.mealPlan, S.shopExtra);
const shopCount = () => { const l = currentList(); return l.aisles.reduce((s, a) => s + a.items.length, 0); };


// ───────── Menu de la semaine ─────────

const thisMonday = () => mondayOf(today());
const needs = () => ({ ...DEFAULT_NEEDS, ...(S.settings.needs ?? {}) });

/** Recettes des 2 semaines précédentes : à éviter pour varier. */
function recentRecipes(monday) {
  return [addDaysKey(monday, -7), addDaysKey(monday, -14)].flatMap(w => S.menuHistory[w] ?? []);
}

/** La semaine de la course, le menu contient forcément un plat « veille de course ». */
const mustTagFor = (monday) => (sessionsOfWeek(monday, S.moves).some(x => x.race) ? 'veille-course' : null);

async function saveMenu() {
  S.menuHistory[S.menuWeek] = Object.keys(S.mealPlan);
  // On ne garde que les 8 dernières semaines d'historique.
  for (const w of Object.keys(S.menuHistory).sort().slice(0, -8)) delete S.menuHistory[w];
  await Promise.all([db.set('mealPlan', S.mealPlan), db.set('menuWeek', S.menuWeek), db.set('menuSeed', S.menuSeed), db.set('menuHistory', S.menuHistory), db.set('shopChecked', S.shopChecked)]);
}

async function generateWeekMenu(newSeed = false) {
  const monday = thisMonday();
  S.menuSeed = newSeed || S.menuWeek === monday ? S.menuSeed + 1 : 0;
  S.menuWeek = monday;
  S.mealPlan = generateMenu({ seed: `${monday}#${S.menuSeed}`, needs: needs(), avoid: recentRecipes(monday), mustTag: mustTagFor(monday) });
  S.shopChecked = [];
  await saveMenu();
}

function menuCard() {
  const monday = thisMonday();
  const current = S.menuWeek === monday && portionsCount() > 0;
  if (!current) {
    return `
      <section class="card" style="gap:12px">
        <span class="tag muscu">${S.menuWeek ? 'Nouvelle semaine' : 'Menu de la semaine'}</span>
        <h2 class="h2" style="font-size:26px">Ton menu de la semaine du ${esc(formatDay(monday, { withDow: false }))}</h2>
        <span class="small muted">Je choisis des recettes différentes des 2 semaines précédentes, avec des protéines variées${mustTagFor(monday) ? ', et un plat de veille de course' : ''}. La liste de courses suit.</span>
        <button type="button" class="btn primary block" data-action="menu-generate">Générer mon menu varié</button>
      </section>`;
  }
  const groups = Object.entries(MEAL_TYPES).map(([type, label]) => {
    const items = Object.entries(S.mealPlan).map(([id, n]) => ({ r: recipeById(id), n })).filter(x => x.r && x.r.meal === type);
    if (!items.length) return '';
    return `<h3 class="section-title" style="margin:10px 0 0">${esc(label)}</h3>` + items.map(({ r, n }) => `
      <div class="item">
        <a href="#/recette/${esc(r.id)}" class="grow" style="color:var(--fg);text-decoration:none"><span>${esc(r.title)}</span><span class="tiny muted">${n} portion${n > 1 ? 's' : ''} · ${r.macros.p} g de protéines chacune</span></a>
        <button type="button" class="chip" data-action="menu-swap" data-id="${esc(r.id)}" style="flex-shrink:0">Changer</button>
      </div>`).join('');
  }).join('');
  return `
    <section class="card" style="gap:6px">
      <div class="row-between" style="align-items:center"><span class="tag muscu">Menu du ${esc(formatDay(monday, { short: true, withDow: false }))}</span><button type="button" class="link-btn" data-action="menu-regenerate" style="white-space:nowrap">Tout changer</button></div>
      <div class="list">${groups}</div>
      <a class="btn primary block" href="#/courses" style="margin-top:10px">Voir la liste de courses</a>
    </section>`;
}

function needsSettings() {
  const n = needs();
  return `
    <details style="border-top:1px solid var(--line);padding-top:12px">
      <summary class="small" style="cursor:pointer;color:var(--fg-2)">Nombre de repas à prévoir chaque semaine</summary>
      <div class="list" style="margin-top:8px">
        ${Object.entries(MEAL_TYPES).map(([type, label]) => `
          <div class="item"><span>${esc(label)}</span>
            <div class="stepper" style="gap:10px">
              <button type="button" data-action="needs" data-type="${type}" data-d="-1" aria-label="Moins">−</button>
              <b class="num" style="font-size:22px;min-width:28px;text-align:center">${n[type]}</b>
              <button type="button" data-action="needs" data-type="${type}" data-d="1" aria-label="Plus">+</button>
            </div>
          </div>`).join('')}
      </div>
      <span class="tiny muted">Pris en compte au prochain menu généré.</span>
    </details>`;
}

function portionStepper(id) {
  const n = S.mealPlan[id] ?? 0;
  return `<div class="stepper" style="gap:10px;justify-content:flex-end">
    <button type="button" data-action="portion" data-id="${esc(id)}" data-d="-1" aria-label="Une portion de moins" ${n ? '' : 'disabled style="opacity:.4"'}>−</button>
    <span class="v" style="min-width:40px"><b style="font-size:26px">${n}</b><span class="tiny muted">portion${n > 1 ? 's' : ''}</span></span>
    <button type="button" data-action="portion" data-id="${esc(id)}" data-d="1" aria-label="Une portion de plus">+</button>
  </div>`;
}

function viewRecettes() {
  const tag = S.recipeTag;
  const list = RECIPES.filter(r => tag === 'all' || r.tags.includes(tag));
  const n = portionsCount();
  const chips = [['all', 'Toutes'], ...Object.entries(TAGS)].map(([k, label]) =>
    `<button type="button" class="chip" data-action="recipe-tag" data-tag="${k}" aria-pressed="${tag === k}" style="${tag === k ? 'background:var(--fg);color:var(--bg);border-color:var(--fg)' : ''}">${esc(label)}</button>`).join('');
  return `
    <div class="screen">
      <header class="top" style="align-items:center;justify-content:flex-start;gap:4px"><a class="back" href="#/nutrition" aria-label="Retour">${I.back}</a><h1 class="title" style="font-size:32px">Recettes</h1></header>
      ${menuCard()}
      ${needsSettings()}
      <h2 class="section-title" style="margin:6px 0 -8px">Toutes les recettes (${RECIPES.length})</h2>
      <p class="small muted" style="margin:0">Tu peux aussi ajuster les portions à la main.</p>
      <div class="chips" style="flex-wrap:nowrap;overflow-x:auto;margin:0 -20px;padding:0 20px 4px">${chips}</div>
      <section style="display:flex;flex-direction:column;gap:12px">
        ${list.map(r => `
          <article class="card" style="padding:16px;gap:10px;border-radius:20px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <a href="#/recette/${esc(r.id)}" style="color:var(--fg);text-decoration:none"><h2 class="h2" style="font-size:24px">${esc(r.title)}</h2></a>
              <span class="tiny muted">${esc(r.when)} · ${r.minutes} min</span>
            </div>
            <div class="row-between" style="align-items:center">
              <span class="small"><b class="num" style="font-size:20px">${r.macros.kcal}</b> <span class="muted">kcal ·</span> <b class="num lift-c" style="font-size:20px">${r.macros.p} g</b> <span class="muted">prot. / portion</span></span>
            </div>
            <div class="row-between" style="align-items:center">
              <a class="link-btn" href="#/recette/${esc(r.id)}">Voir la recette</a>
              ${portionStepper(r.id)}
            </div>
          </article>`).join('')}
      </section>
      <a class="btn block" href="#/courses">Voir la liste de courses</a>
    </div>`;
}

function viewRecette(id) {
  const r = recipeById(id);
  if (!r) return viewNotFound();
  const portions = S.mealPlan[id] || r.servings;
  const f = portions / r.servings;
  return `
    <div class="screen no-nav">
      <header class="top"><a class="back" href="#/recettes" aria-label="Retour">${I.back}</a></header>
      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="eyebrow">${r.tags.map(t => esc(TAGS[t])).join(' · ')}</span>
        <h1 class="title" style="font-size:36px">${esc(r.title)}</h1>
        <span class="small muted">${esc(r.when)} · ${r.minutes} min</span>
      </div>
      <section class="stats3">
        <div><span class="lbl">Énergie</span><span class="val">${r.macros.kcal}<span class="unit"> kcal</span></span></div>
        <div><span class="lbl">Protéines</span><span class="val lift-c">${r.macros.p}<span class="unit"> g</span></span></div>
        <div><span class="lbl">Glucides</span><span class="val run-c">${r.macros.g}<span class="unit"> g</span></span></div>
      </section>
      <span class="tiny muted" style="margin-top:-12px">Par portion, valeurs estimées.</span>
      <section class="card" style="padding:14px 16px;gap:8px;border-radius:20px">
        <div class="row-between" style="align-items:center"><span style="font-weight:700">Cette semaine</span>${portionStepper(r.id)}</div>
      </section>
      <section class="list bordered">
        <h2 class="section-title">Ingrédients · ${portions} portion${portions > 1 ? 's' : ''}</h2>
        ${r.ingredients.map(x => `<div class="item"><span>${esc(x.name)}${x.staple ? '<span class="tiny muted"> · placard</span>' : ''}</span><span class="num muted" style="font-size:18px">${esc(fmtQty(x.unit === 'pièce' ? Math.ceil(x.qty * f - 1e-9) : Math.round(x.qty * f), x.unit))}</span></div>`).join('')}
      </section>
      <section>
        <h2 class="section-title">Préparation</h2>
        <ol style="margin:0;padding-left:22px;display:flex;flex-direction:column;gap:10px">${r.steps.map(st => `<li>${esc(st)}</li>`).join('')}</ol>
      </section>
    </div>`;
}

function viewCourses() {
  const list = currentList();
  const checked = new Set(S.shopChecked);
  const total = list.aisles.reduce((s, a) => s + a.items.length, 0);
  const done = list.aisles.reduce((s, a) => s + a.items.filter(x => checked.has(x.key)).length, 0);
  const row = (x) => {
    const on = checked.has(x.key);
    return `<div class="item" style="padding:0">
      <button type="button" data-action="shop-check" data-key="${esc(x.key)}" aria-pressed="${on}" style="flex:1;display:flex;align-items:center;gap:12px;min-height:52px;background:none;border:none;padding:0;text-align:left;color:inherit">
        <span style="width:24px;height:24px;border-radius:8px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;${on ? 'background:var(--ok);color:#06120c' : 'border:1.5px solid #3a465e'}">${on ? I.check : ''}</span>
        <span class="grow" style="${on ? 'color:var(--faint);text-decoration:line-through' : ''}"><span>${esc(x.name)}</span>${x.recipes.length ? `<span class="tiny muted" style="text-decoration:none">${esc(x.recipes.join(', '))}</span>` : ''}</span>
        ${x.qty ? `<span class="num" style="font-size:18px;${on ? 'color:var(--faint)' : ''}">${esc(fmtQty(x.qty, x.unit))}</span>` : ''}
      </button>
      ${x.extra ? `<button type="button" class="back" data-action="shop-remove" data-key="${esc(x.key)}" aria-label="Retirer ${esc(x.name)}" style="margin:0;color:var(--faint);background:none;border:none">${I.close}</button>` : ''}
    </div>`;
  };
  const empty = !total && !list.staples.length;
  return `
    <div class="screen">
      <header class="top" style="align-items:center;justify-content:flex-start;gap:4px"><a class="back" href="#/nutrition" aria-label="Retour">${I.back}</a><h1 class="title" style="font-size:32px">Courses</h1></header>
      ${S.menuWeek && S.menuWeek < thisMonday() ? `<section class="notice" style="background:var(--lift-soft);border-color:#4a2412"><span style="font-weight:700">Nouvelle semaine</span><span class="small" style="color:var(--fg-2)">Cette liste correspond au menu de la semaine du ${esc(formatDay(S.menuWeek, { withDow: false }))}.</span><button type="button" class="btn primary small" data-action="menu-generate">Générer le menu de cette semaine</button></section>` : ''}
      ${empty ? emptyState('Ta liste est vide', 'Choisis tes recettes de la semaine, ou ajoute des articles ci-dessous.') + '<a class="btn primary block" href="#/recettes">Choisir mes recettes</a>' : `
      <div class="row-between small"><span class="muted"><b style="color:var(--fg)">${total - done}</b> article(s) à prendre</span><span class="muted">${done} dans le panier</span></div>
      <span style="height:6px;border-radius:3px;background:var(--line);display:flex;margin-top:-12px"><span style="width:${total ? Math.round((done / total) * 100) : 0}%;border-radius:3px;background:var(--ok)"></span></span>`}
      ${list.aisles.map(a => `<section class="list bordered"><h2 class="section-title">${esc(a.name)}</h2>${a.items.map(row).join('')}</section>`).join('')}
      ${list.staples.length ? `<section class="list bordered"><h2 class="section-title">À vérifier dans tes placards</h2>${list.staples.map(x => `<div class="item"><span class="muted">${esc(x.name)}</span></div>`).join('')}</section>` : ''}
      <section style="display:flex;flex-direction:column;gap:10px">
        <h2 class="section-title">Ajouter un article</h2>
        <div class="chips">
          <button type="button" class="chip" data-action="shop-quick" data-name="Créatine monohydrate" data-aisle="nutrition">+ Créatine</button>
          <button type="button" class="chip" data-action="shop-quick" data-name="Whey" data-aisle="nutrition">+ Whey</button>
          <button type="button" class="chip" data-action="shop-quick" data-name="Bananes" data-aisle="fruits-legumes">+ Bananes</button>
          <button type="button" class="chip" data-action="shop-quick" data-name="Œufs" data-aisle="cremerie">+ Œufs</button>
        </div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px">
          <label class="field" style="gap:0"><span class="tiny muted" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Article</span><input id="shop-name" placeholder="Par exemple : riz, café…" autocomplete="off"></label>
          <button type="button" class="btn small run" data-action="shop-add">Ajouter</button>
        </div>
        <label class="field"><span class="tiny muted">Rayon</span><select id="shop-aisle" style="min-height:44px;border-radius:12px;border:1px solid var(--border-strong);background:var(--surface);padding:0 12px">${AISLES.map(a => `<option value="${a.id}" ${a.id === 'divers' ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
      </section>
      ${empty ? '' : `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button type="button" class="btn small" data-action="shop-share">Partager</button>
        <button type="button" class="btn small" data-action="shop-new-week">Nouveau menu</button>
      </div>`}
    </div>`;
}

// ───────── Écran : Profil ─────────

function viewProfil() {
  const st = S.strava;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const lastBackup = S.settings.lastBackup ? new Date(S.settings.lastBackup) : null;
  const backupDays = lastBackup ? Math.floor((Date.now() - lastBackup) / 86_400_000) : null;
  return `
    <div class="screen no-nav">
      <header class="top" style="align-items:center;justify-content:flex-start;gap:4px"><a class="back" href="#/" aria-label="Retour">${I.back}</a><h1 class="title" style="font-size:32px">Profil</h1></header>

      ${!standalone ? `<section class="notice"><span style="font-weight:700">Installe l'app sur ton écran d'accueil</span><span class="small" style="color:var(--fg-2)">iPhone : bouton Partager de Safari → « Sur l'écran d'accueil ». Android : menu de Chrome → « Installer l'application ». Ouvre ensuite toujours HYBRID depuis l'icône.</span></section>` : ''}

      <section style="display:flex;flex-direction:column;gap:12px">
        <h2 class="section-title">Strava</h2>
        ${st ? `
          <div class="list bordered">
            <div class="item"><span class="grow"><span>Connecté${st.athlete?.firstname ? ` · ${esc(st.athlete.firstname)}` : ''}</span><span class="tiny muted">${S.activities.length} activités sur le téléphone</span></span><span class="ok-c small" style="font-weight:700">●</span></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button type="button" class="btn small" data-action="strava-sync">${S.syncing ? 'Synchro…' : 'Synchroniser'}</button>
            <button type="button" class="btn small" data-action="strava-disconnect">Déconnecter</button>
          </div>` : `
          <button type="button" class="btn block" data-action="strava-connect" style="background:#fc5200;border-color:#fc5200;color:#fff">Connecter Strava</button>
          <span class="tiny muted">Sur iPhone, l'app Strava s'ouvre : touche « Autoriser ». Si Safari affiche ensuite un code de connexion, copie-le et colle-le ci-dessous.</span>
          <div class="field">
            <label class="small" for="code">Coller un code de connexion</label>
            <div style="display:flex;gap:8px"><input id="code" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex:1;min-width:0" placeholder="Code affiché par Safari"><button type="button" class="btn small run" data-action="strava-code">Valider</button></div>
          </div>`}
      </section>

      <section style="display:flex;flex-direction:column;gap:12px">
        <h2 class="section-title">Toi</h2>
        <div class="field"><label class="small" for="weight">Poids (kg) · sert au calcul des protéines</label><input id="weight" inputmode="decimal" value="${esc(S.settings.weightKg ?? '')}" data-action="weight" placeholder="Par exemple 72"></div>
        <div class="list bordered">
          <div class="item"><span class="grow"><span>${esc(RACE.name)} · ${RACE.distanceKm} km</span><span class="tiny muted">${esc(capital(formatDay(RACE.date)))}</span></span><b class="num" style="font-size:20px">${fmtDuration(RACE.targetTimeS)}</b></div>
        </div>
      </section>

      <section style="display:flex;flex-direction:column;gap:12px">
        <h2 class="section-title">Sauvegarde</h2>
        <span class="small ${backupDays === null || backupDays > 7 ? 'warn-c' : 'muted'}">${lastBackup ? `Dernière sauvegarde il y a ${backupDays} jour(s).` : 'Aucune sauvegarde : tes séances ne sont que sur ce téléphone.'} Pense à en faire une chaque semaine (iCloud Drive ou Google Drive).</span>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button type="button" class="btn small" data-action="export">Sauvegarder</button>
          <label class="btn small" for="import-file" style="cursor:pointer">Restaurer</label>
          <input type="file" id="import-file" accept="application/json,.json" data-action="import" hidden>
        </div>
      </section>
      <span class="tiny muted">HYBRID ${VERSION} · données stockées uniquement sur ce téléphone</span>
    </div>`;
}

// ───────── Retour de Strava ─────────

async function viewCallback(params) {
  appEl.innerHTML = `<div class="screen no-nav"><h1 class="title">Strava</h1><p class="muted">Connexion en cours…</p></div>`;
  navEl.hidden = true;
  try {
    const res = await strava.handleCallback(params);
    history.replaceState(null, '', '/#/');
    if (res.saved) {
      S.strava = await strava.status();
      toast('Strava connecté ✓');
      runSync(true);
      render();
      return;
    }
    appEl.innerHTML = `
      <div class="screen no-nav">
        <span class="eyebrow ok-c">Strava a accepté</span>
        <h1 class="title">Dernière étape</h1>
        <p style="margin:0">Cette page s'est ouverte dans le navigateur, pas dans l'app. Copie ce code de connexion :</p>
        <div class="code-box" id="handoff">${esc(res.handoff)}</div>
        <button type="button" class="btn run block" data-action="copy-code">Copier le code</button>
        <ol class="small" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;color:var(--fg-2)">
          <li>Ouvre HYBRID depuis l'icône de ton écran d'accueil.</li>
          <li>Va dans Profil (icône en haut à droite).</li>
          <li>Colle le code dans « Coller un code de connexion », puis Valider.</li>
        </ol>
        <span class="tiny muted">Ce code donne accès à tes activités Strava : ne le partage avec personne.</span>
      </div>`;
  } catch (e) {
    history.replaceState(null, '', '/#/profil');
    toast(e.message, 5000);
    render();
  }
}

const viewNotFound = () => `<div class="screen"><h1 class="title">Introuvable</h1><a class="btn" href="#/">Retour à aujourd'hui</a></div>`;

// ───────── Navigation ─────────

function navHtml(active) {
  const tab = (href, key, label, icon) => `<a href="${href}" ${active === key ? 'aria-current="page"' : ''}>${icon}${label}</a>`;
  return tab('#/', 'today', 'Aujourd’hui', I.sun) + tab('#/plan', 'plan', 'Plan', I.cal)
    + `<a href="#/coach" class="coach-btn" aria-label="Coach" ${active === 'coach' ? 'aria-current="page"' : ''}>${I.coach}</a>`
    + tab('#/perfs', 'perfs', 'Perfs', I.bars) + tab('#/nutrition', 'nutrition', 'Nutrition', I.leaf);
}

async function render() {
  const [route, arg] = location.hash.replace(/^#\/?/, '').split('/');
  let html;
  let nav = null;
  switch (route) {
    case '': case undefined: html = viewToday(); nav = 'today'; break;
    case 'plan': html = viewPlan(arg); nav = 'plan'; break;
    case 'detail': html = viewDetail(arg); break;
    case 'seance': {
      const se = await openSeance(arg);
      if (!se) return;
      html = viewSeance();
      break;
    }
    case 'fin': html = viewFin(arg); break;
    case 'perfs': html = viewPerfs(); nav = 'perfs'; break;
    case 'coach': html = viewCoach(); nav = 'coach'; break;
    case 'nutrition': html = viewNutrition(); nav = 'nutrition'; break;
    case 'recettes': html = viewRecettes(); nav = 'nutrition'; break;
    case 'recette': html = viewRecette(arg); break;
    case 'courses': html = viewCourses(); nav = 'nutrition'; break;
    case 'profil': html = viewProfil(); break;
    default: html = viewNotFound();
  }
  appEl.innerHTML = html;
  // L'animation d'arrivée ne joue qu'au changement d'écran, pas à chaque mise à jour du même écran.
  if (location.hash === render.lastHash && appEl.firstElementChild) appEl.firstElementChild.style.animation = 'none';
  render.lastHash = location.hash;
  navEl.hidden = !nav;
  if (nav) navEl.innerHTML = navHtml(nav);
  tick();
}

// ───────── Minuteurs (séance) ─────────

let audioCtx;
function beep() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.4);
  } catch { /* son facultatif */ }
  navigator.vibrate?.([200, 100, 200]);
}

function tick() {
  const se = S.seance;
  if (!se || !location.hash.startsWith('#/seance/')) return;
  const el = document.getElementById('elapsed');
  if (el) el.textContent = fmtDuration((Date.now() - se.workout.startedAt) / 1000);
  const ring = document.getElementById('ring');
  if (se.restEnd) {
    const left = Math.max(0, (se.restEnd - Date.now()) / 1000);
    if (ring) {
      ring.style.setProperty('--p', `${Math.round((1 - left / se.restTotal) * 100)}%`);
      document.getElementById('rest-t').textContent = fmtDuration(Math.ceil(left));
    }
    if (left <= 0 && !se.alerted) { se.alerted = true; se.restEnd = 0; beep(); render(); }
  }
}
setInterval(tick, 500);

// ───────── Actions ─────────

async function saveWorkout() {
  await db.put('workouts', S.seance.workout);
}

async function toggleDay(key, list) {
  const t = today();
  const arr = S[list];
  S[list] = arr.includes(t) ? arr.filter(d => d !== t) : [...arr, t];
  await db.set(key, S[list]);
}

async function runSync(force = false) {
  if (!stravaConnected() || S.syncing) return;
  S.syncing = true;
  try {
    const res = await strava.sync({ force });
    if (res.added) { S.activities = (await db.all('activities')).sort((a, b) => String(b.start_date_local).localeCompare(String(a.start_date_local))); }
    if (!res.skipped) S.lastSync = Date.now();
    if (force) toast(res.added ? `${res.added} activité(s) récupérée(s)` : 'Strava est à jour');
  } catch (e) {
    toast(e.message, 5000);
    S.strava = await strava.status();
  } finally {
    S.syncing = false;
    if (!location.hash.startsWith('#/seance/')) render();
  }
}

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const a = el.dataset.action;
  const se = S.seance;

  switch (a) {
    case 'creatine': await toggleDay('creatine', 'creatine'); render(); break;
    case 'whey': await toggleDay('whey', 'whey'); render(); break;
    case 'perf-tab': S.perfTab = el.dataset.tab; render(); break;

    case 'strava-connect': await strava.connect(); break;
    case 'strava-sync': runSync(true); render(); break;
    case 'strava-disconnect': await strava.disconnect(); S.strava = null; toast('Strava déconnecté'); render(); break;
    case 'strava-code': {
      try {
        await strava.connectWithCode(document.getElementById('code').value);
        S.strava = await strava.status();
        toast('Strava connecté ✓');
        await runSync(true);
      } catch (err) { toast(err.message, 5000); }
      render();
      break;
    }
    case 'copy-code': {
      const txt = document.getElementById('handoff').textContent;
      try { await navigator.clipboard.writeText(txt); toast('Code copié'); }
      catch { const r = document.createRange(); r.selectNodeContents(document.getElementById('handoff')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Code sélectionné : copie-le'); }
      break;
    }

    // Séance
    case 'kg': { const d = draftFor(se); d.kg = Math.max(0, Math.round((d.kg + Number(el.dataset.d)) * 10) / 10); render(); break; }
    case 'reps': { const d = draftFor(se); d.reps = Math.max(1, d.reps + Number(el.dataset.d)); render(); break; }
    case 'validate-set': {
      const ex = se.planned.exercises[se.exIndex];
      const d = draftFor(se);
      const input = document.getElementById('kg-input');
      if (input) { const v = Number(input.value.replace(',', '.')); if (Number.isFinite(v)) d.kg = v; }
      se.workout.sets.push({ exerciseId: ex.id, name: ex.name, unit: ex.unit, kg: ex.loaded ? d.kg : 0, reps: d.reps, feel: null, at: Date.now() });
      se.draft = null;
      se.restTotal = ex.rest; se.restEnd = Date.now() + ex.rest * 1000; se.alerted = false;
      await saveWorkout();
      try { audioCtx ??= new (window.AudioContext || window.webkitAudioContext)(); } catch { /* son facultatif */ }
      render();
      break;
    }
    case 'feel': {
      const last = se.workout.sets[se.workout.sets.length - 1];
      last.feel = el.dataset.feel;
      se.draft = null;
      await saveWorkout();
      const ex = se.planned.exercises[se.exIndex];
      if (se.workout.sets.filter(s => s.exerciseId === ex.id).length >= ex.sets && se.exIndex < se.planned.exercises.length - 1) se.exIndex++;
      render();
      break;
    }
    case 'rest-add': se.restEnd += 30_000; se.restTotal += 30; tick(); break;
    case 'rest-skip': se.restEnd = 0; se.alerted = true; render(); break;
    case 'next-ex': se.exIndex = Math.min(se.planned.exercises.length - 1, se.exIndex + 1); se.draft = null; render(); break;
    case 'prev-ex': se.exIndex = Math.max(0, se.exIndex - 1); se.draft = null; render(); break;
    case 'finish': {
      if (!se) break;
      if (!se.workout.sets.length) {
        S.workouts = S.workouts.filter(w => w.id !== se.workout.id);
        await db.remove('workouts', se.workout.id);
        S.seance = null;
        location.hash = '#/';
        break;
      }
      se.workout.endedAt = Date.now();
      await saveWorkout();
      const id = se.workout.id;
      S.seance = null;
      location.hash = `#/fin/${id}`;
      break;
    }
    case 'share': {
      const w = S.workouts.find(x => x.id === el.dataset.id);
      const txt = `${w.title} : ${w.sets.length} séries en ${fmtDuration((w.endedAt - w.startedAt) / 1000)} 💪 #HYBRID`;
      try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); toast('Texte copié'); } } catch { /* annulé */ }
      break;
    }

    // Recettes et courses

    case 'menu-generate': await generateWeekMenu(); toast('Menu de la semaine prêt'); if (location.hash !== '#/recettes') location.hash = '#/recettes'; else render(); break;
    case 'menu-regenerate': await generateWeekMenu(true); toast('Nouveau menu'); render(); break;
    case 'menu-swap': {
      const before = Object.keys(S.mealPlan);
      S.mealPlan = swapRecipe(S.mealPlan, el.dataset.id, { seed: `${S.menuWeek}#${S.menuSeed}#${Date.now()}`, avoid: recentRecipes(thisMonday()) });
      await saveMenu();
      const added = Object.keys(S.mealPlan).find(k => !before.includes(k));
      toast(added ? `Remplacé par : ${recipeById(added).title}` : 'Pas d’autre recette disponible');
      render();
      break;
    }
    case 'needs': {
      const n = needs();
      n[el.dataset.type] = Math.max(0, Math.min(14, n[el.dataset.type] + Number(el.dataset.d)));
      S.settings.needs = n;
      await db.set('settings', S.settings);
      render();
      break;
    }
    case 'recipe-tag': S.recipeTag = el.dataset.tag; render(); break;
    case 'portion': {
      const id = el.dataset.id;
      const n = Math.max(0, Math.min(20, (S.mealPlan[id] ?? 0) + Number(el.dataset.d)));
      if (n) S.mealPlan[id] = n; else delete S.mealPlan[id];
      S.menuWeek = thisMonday();
      await saveMenu();
      render();
      break;
    }
    case 'shop-check': {
      const k = el.dataset.key;
      S.shopChecked = S.shopChecked.includes(k) ? S.shopChecked.filter(x => x !== k) : [...S.shopChecked, k];
      await db.set('shopChecked', S.shopChecked);
      render();
      break;
    }
    case 'shop-quick':
    case 'shop-add': {
      const name = a === 'shop-quick' ? el.dataset.name : document.getElementById('shop-name').value.trim();
      const aisle = a === 'shop-quick' ? el.dataset.aisle : document.getElementById('shop-aisle').value;
      if (!name) { toast('Écris le nom de l’article'); break; }
      if (S.shopExtra.some(x => x.name.toLowerCase() === name.toLowerCase())) { toast(`${name} est déjà dans la liste`); break; }
      S.shopExtra.push({ id: `${Date.now()}`, name: name.slice(0, 60), aisle });
      await db.set('shopExtra', S.shopExtra);
      toast(`${name} ajouté`);
      render();
      break;
    }
    case 'shop-remove': {
      const id = el.dataset.key.replace(/^extra\|/, '');
      S.shopExtra = S.shopExtra.filter(x => x.id !== id);
      S.shopChecked = S.shopChecked.filter(k => k !== el.dataset.key);
      await Promise.all([db.set('shopExtra', S.shopExtra), db.set('shopChecked', S.shopChecked)]);
      render();
      break;
    }
    case 'shop-share': {
      const txt = shoppingListText(currentList(), S.shopChecked);
      try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); toast('Liste copiée'); } } catch { /* annulé */ }
      break;
    }
    case 'shop-new-week': {
      if (!confirm('Générer un nouveau menu et une nouvelle liste ? Les articles ajoutés à la main seront retirés.')) break;
      S.shopExtra = [];
      await db.set('shopExtra', []);
      await generateWeekMenu(true);
      toast('Nouveau menu généré');
      location.hash = '#/recettes';
      break;
    }
    case 'export': {
      const data = await exportData();
      const name = `hybrid-sauvegarde-${today()}.json`;
      const file = new File([JSON.stringify(data)], name, { type: 'application/json' });
      try {
        if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Sauvegarde HYBRID' });
        else { const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
        S.settings.lastBackup = Date.now();
        await db.set('settings', S.settings);
        toast('Sauvegarde créée');
        render();
      } catch { /* annulé */ }
      break;
    }
  }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.action === 'move') {
    const s = sessionsWithMoves(S.moves).find(x => x.id === el.dataset.id);
    const original = s.movedFrom ?? s.date;
    if (el.value === original) delete S.moves[s.id]; else S.moves[s.id] = el.value;
    await db.set('moves', S.moves);
    toast(`Séance déplacée au ${formatDay(el.value)}`);
    render();
  }
  if (el.dataset.action === 'weight') {
    const v = Number(el.value.replace(',', '.'));
    S.settings.weightKg = Number.isFinite(v) && v > 30 && v < 200 ? v : undefined;
    await db.set('settings', S.settings);
    toast(S.settings.weightKg ? 'Poids enregistré' : 'Poids invalide');
  }
  if (el.dataset.action === 'import' && el.files?.[0]) {
    try {
      await importData(JSON.parse(await el.files[0].text()));
      await load();
      toast('Sauvegarde restaurée ✓');
      render();
    } catch (err) { toast(err.message || 'Fichier illisible', 5000); }
  }
  if (el.id === 'kg-input' && S.seance) {
    const v = Number(el.value.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) draftFor(S.seance).kg = v;
  }
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') runSync(); });

// ───────── Démarrage ─────────

(async function start() {
  await persistStorage();
  await load();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const params = new URLSearchParams(location.search);
  if (params.has('code') || params.has('error')) { await viewCallback(params); return; }
  await render();
  runSync();
})();
