// Relais Strava de HYBRID.
// Les fichiers de l'app (public/) sont servis directement par Cloudflare ; ce code ne reçoit que
// les adresses qui ne correspondent à aucun fichier, c'est-à-dire /api/strava/*.
// Il garde le Client Secret (variable secrète) et ne stocke aucune donnée.

const STRAVA = 'https://www.strava.com';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function tokenRequest(env, params) {
  if (!env.STRAVA_CLIENT_SECRET) return json({ error: 'secret_manquant' }, 500);
  const res = await fetch(`${STRAVA}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env.STRAVA_CLIENT_ID, client_secret: env.STRAVA_CLIENT_SECRET, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: 'strava_refus', status: res.status }, res.status === 400 || res.status === 401 ? 400 : 502);
  // On ne renvoie que ce dont l'app a besoin.
  return json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete: data.athlete ? { id: data.athlete.id, firstname: data.athlete.firstname } : undefined,
  });
}

const isToken = (s) => typeof s === 'string' && /^[A-Za-z0-9]{20,100}$/.test(s);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/strava/token' && request.method === 'POST') {
      const { code } = await request.json().catch(() => ({}));
      if (!isToken(code)) return json({ error: 'code_invalide' }, 400);
      return tokenRequest(env, { code, grant_type: 'authorization_code' });
    }

    if (url.pathname === '/api/strava/refresh' && request.method === 'POST') {
      const { refresh_token } = await request.json().catch(() => ({}));
      if (!isToken(refresh_token)) return json({ error: 'jeton_invalide' }, 400);
      return tokenRequest(env, { refresh_token, grant_type: 'refresh_token' });
    }

    if (url.pathname === '/api/strava/activities' && request.method === 'GET') {
      const auth = request.headers.get('Authorization') ?? '';
      if (!/^Bearer [A-Za-z0-9]{20,100}$/.test(auth)) return json({ error: 'non_connecte' }, 401);
      const after = Number(url.searchParams.get('after') ?? 0);
      const page = Number(url.searchParams.get('page') ?? 1);
      if (!Number.isInteger(after) || after < 0 || !Number.isInteger(page) || page < 1 || page > 50) return json({ error: 'parametres' }, 400);
      const res = await fetch(`${STRAVA}/api/v3/athlete/activities?after=${after}&page=${page}&per_page=100`, {
        headers: { Authorization: auth },
      });
      const body = await res.text();
      return new Response(body, { status: res.status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    return json({ error: 'introuvable' }, 404);
  },
};
