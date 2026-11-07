import { ITERATIONS, hashPin, randomHex, safeEqual, sha256Hex } from './crypto.js';

// Accounts + sync for the Ayah app. The app itself is a static site, so this
// is the only server: sign up / log in with a username + PIN (no email), then
// one JSON document per account holds what the app syncs between devices
// (memorized ayahs, reading position, settings).
//
// Auth is a random session token the app keeps in localStorage and sends as
// "Authorization: Bearer ...". (Not a cookie: the app lives on github.io, and
// browsers block cookies set by a different site.) Only a hash of the token is
// stored here.

const ALLOWED_ORIGINS = new Set([
  'https://lujaneyaffa.github.io',
  'capacitor://localhost', // the iPhone app
  'http://localhost:8137',
  'http://127.0.0.1:8137',
]);
const SESSION_SECONDS = 180 * 24 * 3600;
const MAX_DATA_BYTES = 200 * 1024;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const PIN_RE = /^\d{6,12}$/;

const nowSec = () => Math.floor(Date.now() / 1000);

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const h = { Vary: 'Origin' };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    h['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(request) },
  });
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

// ---- Throttling (a PIN is easy to guess, so every guess is counted) --------

async function isBlocked(env, key, max, windowSec) {
  const row = await env.DB.prepare('SELECT count, window_start FROM attempts WHERE key = ?').bind(key).first();
  return !!row && nowSec() - row.window_start < windowSec && row.count >= max;
}

async function recordHit(env, key, windowSec) {
  const now = nowSec();
  await env.DB.prepare(
    `INSERT INTO attempts (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ?2 - window_start >= ?3 THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ?2 - window_start >= ?3 THEN ?2 ELSE window_start END`
  )
    .bind(key, now, windowSec)
    .run();
}

async function clearHits(env, key) {
  await env.DB.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run();
}

async function tidyUp(env) {
  if (Math.random() > 0.02) return;
  const now = nowSec();
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now).run();
  await env.DB.prepare('DELETE FROM attempts WHERE window_start < ?').bind(now - 2 * 24 * 3600).run();
}

const LOGIN_WINDOW = 15 * 60;
const TOO_MANY = 'Too many attempts. Try again in about 15 minutes.';

// ---- Sessions ---------------------------------------------------------------

async function startSession(env, accountId) {
  const token = randomHex(32);
  const now = nowSec();
  await env.DB.prepare('INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), accountId, now, now + SESSION_SECONDS)
    .run();
  return token;
}

function bearer(request) {
  const m = /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get('Authorization') || '');
  return m ? m[1] : null;
}

async function accountFor(request, env) {
  const token = bearer(request);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT a.id, a.username, a.salt, a.iterations, a.pin_hash
     FROM sessions s JOIN accounts a ON a.id = s.account_id
     WHERE s.token_hash = ? AND s.expires_at > ?`
  )
    .bind(await sha256Hex(token), nowSec())
    .first();
}

// ---- PIN checks -------------------------------------------------------------

function weakPin(pin) {
  if (/^(\d)\1+$/.test(pin)) return true; // 000000, 111111 ...
  const asc = '01234567890123456789';
  const desc = '98765432109876543210';
  return asc.includes(pin) || desc.includes(pin); // 123456, 654321 ...
}

// Always does the same amount of hashing work, so a wrong username takes as
// long as a wrong PIN and can't be told apart by timing.
async function pinMatches(env, account, pin) {
  const salt = account ? account.salt : '00'.repeat(16);
  const iterations = account ? account.iterations : ITERATIONS;
  const hash = await hashPin(pin, salt, iterations, env.PEPPER);
  return !!account && safeEqual(hash, account.pin_hash);
}

// ---- Routes -----------------------------------------------------------------

async function signup(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (await isBlocked(env, `signup:ip:${ip}`, 10, 24 * 3600)) {
    return json(request, { error: 'Too many new accounts from this connection today. Try again tomorrow.' }, 429);
  }
  await recordHit(env, `signup:ip:${ip}`, 24 * 3600);

  const body = await readJson(request);
  const username = String(body.username || '').trim().toLowerCase();
  const pin = String(body.pin || '');
  if (!USERNAME_RE.test(username)) {
    return json(request, { error: 'Username: 3–30 letters, numbers, dots, dashes or underscores.' }, 400);
  }
  if (!PIN_RE.test(pin)) return json(request, { error: 'PIN must be 6–12 digits.' }, 400);
  if (weakPin(pin)) return json(request, { error: 'That PIN is too easy to guess — pick another.' }, 400);

  const salt = randomHex(16);
  const pinHash = await hashPin(pin, salt, ITERATIONS, env.PEPPER);
  let id;
  try {
    const res = await env.DB.prepare(
      'INSERT INTO accounts (username, salt, iterations, pin_hash, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(username, salt, ITERATIONS, pinHash, nowSec())
      .run();
    id = res.meta.last_row_id;
  } catch {
    return json(request, { error: 'That username is taken.' }, 409);
  }
  await tidyUp(env);
  return json(request, { token: await startSession(env, id), username }, 201);
}

async function login(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const body = await readJson(request);
  const username = String(body.username || '').trim().toLowerCase();
  const pin = String(body.pin || '');
  const userKey = `login:u:${username}`;
  const ipKey = `login:ip:${ip}`;
  if ((await isBlocked(env, userKey, 5, LOGIN_WINDOW)) || (await isBlocked(env, ipKey, 25, LOGIN_WINDOW))) {
    return json(request, { error: TOO_MANY }, 429);
  }

  const account = USERNAME_RE.test(username)
    ? await env.DB.prepare('SELECT id, username, salt, iterations, pin_hash FROM accounts WHERE username = ?').bind(username).first()
    : null;
  if (!(await pinMatches(env, account, pin))) {
    await recordHit(env, userKey, LOGIN_WINDOW);
    await recordHit(env, ipKey, LOGIN_WINDOW);
    return json(request, { error: 'Wrong username or PIN.' }, 401);
  }
  await clearHits(env, userKey);
  await tidyUp(env);
  return json(request, { token: await startSession(env, account.id), username: account.username });
}

async function logout(request, env) {
  const token = bearer(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return json(request, { ok: true });
}

async function getData(request, env, account) {
  const row = await env.DB.prepare('SELECT version, data, updated_at FROM sync_data WHERE account_id = ?').bind(account.id).first();
  if (!row) return json(request, { version: 0, data: null });
  return json(request, { version: row.version, data: JSON.parse(row.data), updatedAt: row.updated_at });
}

// Compare-and-swap: the write only lands if nobody else wrote since the
// version the app last saw; otherwise the app gets the current copy back,
// merges, and tries again.
async function putData(request, env, account) {
  const body = await readJson(request);
  const base = Number(body.baseVersion);
  if (!Number.isInteger(base) || base < 0 || !body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
    return json(request, { error: 'bad request' }, 400);
  }
  const text = JSON.stringify(body.data);
  if (text.length > MAX_DATA_BYTES) return json(request, { error: 'too much data' }, 413);

  const now = nowSec();
  const res =
    base === 0
      ? await env.DB.prepare(
          'INSERT INTO sync_data (account_id, version, data, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(account_id) DO NOTHING'
        )
          .bind(account.id, text, now)
          .run()
      : await env.DB.prepare(
          'UPDATE sync_data SET version = version + 1, data = ?, updated_at = ? WHERE account_id = ? AND version = ?'
        )
          .bind(text, now, account.id, base)
          .run();
  if (res.meta.changes === 1) return json(request, { version: base + 1 });
  const cur = await env.DB.prepare('SELECT version, data FROM sync_data WHERE account_id = ?').bind(account.id).first();
  return json(
    request,
    { error: 'conflict', version: cur ? cur.version : 0, data: cur ? JSON.parse(cur.data) : null },
    409
  );
}

async function deleteAccount(request, env, account) {
  const body = await readJson(request);
  const userKey = `login:u:${account.username}`;
  if (await isBlocked(env, userKey, 5, LOGIN_WINDOW)) return json(request, { error: TOO_MANY }, 429);
  if (!(await pinMatches(env, account, String(body.pin || '')))) {
    await recordHit(env, userKey, LOGIN_WINDOW);
    return json(request, { error: 'Wrong PIN.' }, 401);
  }
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sync_data WHERE account_id = ?').bind(account.id),
    env.DB.prepare('DELETE FROM sessions WHERE account_id = ?').bind(account.id),
    env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(account.id),
  ]);
  return json(request, { ok: true });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
    const { pathname } = new URL(request.url);
    try {
      if (request.method === 'POST' && pathname === '/signup') return await signup(request, env);
      if (request.method === 'POST' && pathname === '/login') return await login(request, env);
      if (request.method === 'POST' && pathname === '/logout') return await logout(request, env);

      if (['/me', '/data', '/delete-account'].includes(pathname)) {
        const account = await accountFor(request, env);
        if (!account) return json(request, { error: 'unauthorized' }, 401);
        if (request.method === 'GET' && pathname === '/me') return json(request, { username: account.username });
        if (request.method === 'GET' && pathname === '/data') return await getData(request, env, account);
        if (request.method === 'PUT' && pathname === '/data') return await putData(request, env, account);
        if (request.method === 'POST' && pathname === '/delete-account') return await deleteAccount(request, env, account);
      }
      if (pathname === '/') return json(request, { service: 'ayah-accounts' });
      return json(request, { error: 'not found' }, 404);
    } catch (err) {
      console.error(err && err.stack ? err.stack : err);
      return json(request, { error: 'Something went wrong. Try again.' }, 500);
    }
  },
};
