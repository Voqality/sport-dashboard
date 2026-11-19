// Connexion Strava et synchronisation des activités, via le relais /api/strava/* (qui garde le secret).
import { db } from './db.js';

export const STRAVA_CLIENT_ID = '298644';
const KEEP = ['id', 'name', 'sport_type', 'type', 'start_date_local', 'distance', 'moving_time', 'elapsed_time', 'total_elevation_gain', 'average_heartrate'];

const redirectUri = () => `${location.origin}/`;

function randomState() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

/** Ouvre l'autorisation Strava (l'app Strava sur téléphone, sinon le site). */
export async function connect() {
  const state = randomState();
  await db.set('oauthState', state);
  const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const base = mobile ? 'https://www.strava.com/oauth/mobile/authorize' : 'https://www.strava.com/oauth/authorize';
  location.href = `${base}?${new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  })}`;
}

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error === 'strava_refus' ? 'Strava a refusé la connexion. Réessaie depuis le début.' : 'Le relais Strava ne répond pas.');
  return data;
}

async function saveTokens(t) {
  await db.set('strava', { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, athlete: t.athlete });
}

/**
 * Retour de Strava (?code=…&state=…). Échange le code contre des jetons.
 * Renvoie { saved: true } si cette page est bien l'app qui a lancé la connexion,
 * sinon { handoff: refresh_token } : sur iPhone, le retour s'ouvre souvent dans Safari et non dans
 * l'app installée ; l'utilisateur copie alors ce code dans l'app (Profil → Coller le code).
 */
export async function handleCallback(params) {
  if (params.get('error')) throw new Error('Tu as refusé l’accès à Strava.');
  if (!(params.get('scope') ?? '').includes('activity:read')) throw new Error('Il faut laisser cochée la case d’accès aux activités.');
  const tokens = await post('/api/strava/token', { code: params.get('code') });
  const expected = await db.get('oauthState');
  if (expected && expected === params.get('state')) {
    await saveTokens(tokens);
    await db.del('oauthState');
    return { saved: true };
  }
  return { handoff: tokens.refresh_token };
}

/** Code collé dans l'app (le « refresh token » affiché dans Safari). */
export async function connectWithCode(code) {
  const clean = String(code).trim();
  if (!/^[A-Za-z0-9]{20,100}$/.test(clean)) throw new Error('Ce code ne ressemble pas à un code de connexion.');
  const tokens = await post('/api/strava/refresh', { refresh_token: clean });
  await saveTokens(tokens);
}

export async function status() {
  return (await db.get('strava')) ?? null;
}

export async function disconnect() {
  await db.del('strava');
}

async function accessToken() {
  const t = await db.get('strava');
  if (!t) return null;
  if (t.expires_at * 1000 > Date.now() + 5 * 60_000) return t.access_token;
  const fresh = await post('/api/strava/refresh', { refresh_token: t.refresh_token });
  await saveTokens({ ...fresh, athlete: t.athlete });
  return fresh.access_token;
}

/** Récupère les nouvelles activités. `force` ignore le délai minimal entre deux synchros. */
export async function sync({ force = false } = {}) {
  const t = await db.get('strava');
  if (!t) return { connected: false };
  const last = (await db.get('lastSync')) ?? 0;
  if (!force && Date.now() - last < 5 * 60_000) return { connected: true, skipped: true };

  const token = await accessToken();
  const known = await db.all('activities');
  const newest = known.reduce((m, a) => Math.max(m, Date.parse(a.start_date_local)), 0);
  // Depuis la dernière activité connue (−2 jours de marge), sinon les 120 derniers jours.
  const after = Math.floor((newest ? newest - 2 * 86_400_000 : Date.now() - 120 * 86_400_000) / 1000);

  let added = 0;
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`/api/strava/activities?after=${after}&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { await disconnect(); throw new Error('Strava a déconnecté l’app. Reconnecte-la dans Profil.'); }
    if (res.status === 429) throw new Error('Strava limite les requêtes. Réessaie dans 15 minutes.');
    if (!res.ok) throw new Error('Synchronisation Strava impossible pour le moment.');
    const batch = await res.json();
    const slim = batch.map(a => Object.fromEntries(KEEP.map(k => [k, a[k]])));
    await db.putMany('activities', slim);
    added += slim.length;
    if (batch.length < 100) break;
  }
  await db.set('lastSync', Date.now());
  return { connected: true, added };
}
