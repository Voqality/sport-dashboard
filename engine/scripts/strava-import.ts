// Importe tes activités Strava des N derniers jours dans engine/.data/activities-strava.json.
// Usage : npm run strava            (90 jours par défaut, ou "jours" de profil.json)
//         npm run strava -- 180     (nombre de jours)
//
// Le Client Secret est lu dans engine/.env : il reste sur ton PC et n'est jamais affiché.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StravaSummary } from '../src/strava.ts';
import { stravaSport } from '../src/strava.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, '.data');
const TOKENS = join(DATA, 'strava-tokens.json');
const OUT = join(DATA, 'activities-strava.json');
const PORT = 8787;
const REDIRECT = `http://localhost:${PORT}/callback`;

interface Tokens { access_token: string; refresh_token: string; expires_at: number; athlete?: { firstname?: string } }

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function loadEnv(): { clientId: string; clientSecret: string } {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) fail('Fichier engine/.env introuvable. Copie .env.exemple en .env et colle ton Client Secret dedans.');
  process.loadEnvFile(envPath);
  const clientId = process.env.STRAVA_CLIENT_ID ?? '';
  const clientSecret = process.env.STRAVA_CLIENT_SECRET ?? '';
  if (!clientId) fail('STRAVA_CLIENT_ID manquant dans engine/.env');
  if (!clientSecret || clientSecret.includes('colle_ton')) fail('STRAVA_CLIENT_SECRET non rempli dans engine/.env');
  return { clientId, clientSecret };
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    spawn(cmd, [url], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref();
  } catch { /* l'URL est aussi affichée dans le terminal */ }
}

async function tokenRequest(body: Record<string, string>): Promise<Tokens> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) fail(`Strava a refusé la demande de jeton (${res.status}). Vérifie le Client ID et le Client Secret dans engine/.env.`);
  return (await res.json()) as Tokens;
}

/** Ouvre la page d'autorisation Strava et attend le retour sur http://localhost:8787/callback. */
function authorize(clientId: string, clientSecret: string): Promise<Tokens> {
  const state = randomBytes(16).toString('hex');
  const url = 'https://www.strava.com/oauth/authorize?' + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state,
  });

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const u = new URL(req.url ?? '/', `http://localhost:${PORT}`);
      if (u.pathname !== '/callback') { res.writeHead(404).end(); return; }
      const page = (title: string, msg: string) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<meta charset="utf-8"><body style="font-family:system-ui;background:#07090f;color:#e8edf5;padding:40px"><h1>${title}</h1><p>${msg}</p></body>`);
      };
      try {
        if (u.searchParams.get('state') !== state) { page('Erreur', 'Réponse inattendue. Relance « npm run strava ».'); return; }
        if (u.searchParams.get('error')) { page('Accès refusé', 'Tu as refusé l’accès. Relance « npm run strava » pour réessayer.'); reject(new Error('refus')); return; }
        const scope = u.searchParams.get('scope') ?? '';
        const code = u.searchParams.get('code') ?? '';
        if (!scope.includes('activity:read')) {
          page('Case décochée', 'Il faut laisser cochée la case d’accès aux activités. Relance « npm run strava ».');
          reject(new Error('scope')); return;
        }
        const tokens = await tokenRequest({ client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code' });
        page('✅ Strava connecté', 'Tu peux fermer cet onglet et revenir au terminal.');
        resolve(tokens);
      } catch (e) {
        page('Erreur', 'Voir le terminal.');
        reject(e);
      } finally {
        setTimeout(() => server.close(), 500);
      }
    });
    server.on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') fail(`Le port ${PORT} est déjà utilisé. Ferme l'autre terminal qui lance « npm run strava ».`);
      reject(e);
    });
    server.listen(PORT, 'localhost', () => {
      console.log('\n🔐 Autorise l’accès dans la page Strava qui s’ouvre.');
      console.log('   Si rien ne s’ouvre, copie ce lien dans ton navigateur :\n');
      console.log('   ' + url + '\n');
      openBrowser(url);
    });
  });
}

async function getTokens(clientId: string, clientSecret: string): Promise<Tokens> {
  if (existsSync(TOKENS)) {
    const saved = JSON.parse(readFileSync(TOKENS, 'utf8')) as Tokens;
    if (saved.expires_at * 1000 > Date.now() + 5 * 60_000) return saved;
    console.log('🔄 Rafraîchissement du jeton Strava…');
    const fresh = await tokenRequest({ client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: saved.refresh_token });
    return { ...saved, ...fresh };
  }
  return authorize(clientId, clientSecret);
}

async function fetchActivities(accessToken: string, afterEpoch: number): Promise<StravaSummary[]> {
  const all: StravaSummary[] = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=200&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.status === 429) fail('Limite de requêtes Strava atteinte. Réessaie dans 15 minutes.');
    if (res.status === 401) fail('Jeton refusé. Supprime engine/.data/strava-tokens.json puis relance « npm run strava ».');
    if (!res.ok) fail(`Erreur Strava ${res.status} lors de la lecture des activités.`);
    const batch = (await res.json()) as StravaSummary[];
    all.push(...batch);
    if (batch.length < 200) break;
  }
  return all;
}

function readDays(): number {
  const arg = Number(process.argv[2]);
  if (Number.isFinite(arg) && arg > 0) return Math.min(arg, 730);
  const profil = join(ROOT, 'profil.json');
  if (existsSync(profil)) {
    const j = Number(JSON.parse(readFileSync(profil, 'utf8')).jours);
    if (Number.isFinite(j) && j > 0) return j;
  }
  return 90;
}

async function main(): Promise<void> {
  const { clientId, clientSecret } = loadEnv();
  mkdirSync(DATA, { recursive: true });
  const tokens = await getTokens(clientId, clientSecret);
  writeFileSync(TOKENS, JSON.stringify(tokens, null, 2));

  // On prend 42 jours de plus pour amorcer la forme chronique (CTL) du rapport.
  const days = readDays();
  const after = Math.floor(Date.now() / 1000) - (days + 42) * 86_400;
  console.log(`📥 Import des activités Strava (${days} jours + 42 jours d'amorçage)…`);
  const acts = await fetchActivities(tokens.access_token, after);
  writeFileSync(OUT, JSON.stringify(acts, null, 2));

  const counts = new Map<string, number>();
  for (const a of acts) counts.set(stravaSport(a), (counts.get(stravaSport(a)) ?? 0) + 1);
  console.log(`\n✅ ${acts.length} activités enregistrées dans engine/.data/activities-strava.json`);
  for (const [sport, n] of counts) console.log(`   • ${sport} : ${n}`);
  console.log('\nÉtape suivante : npm run rapport\n');
}

main().catch(e => fail(e instanceof Error ? e.message : String(e)));
