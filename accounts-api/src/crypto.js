// PIN hashing shared by the Worker (and any one-off admin script).
// PIN -> HMAC with a secret server-side "pepper" -> PBKDF2 with a per-account
// salt. Even someone who copied the whole database could not test PIN guesses
// without also having the pepper.
export const ITERATIONS = 25000;

const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => Uint8Array.from(hex.match(/../g) || [], (h) => parseInt(h, 16));

export function randomHex(bytes) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function pepperedPin(pin, pepper) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(pin)));
}

export async function hashPin(pin, saltHex, iterations, pepper) {
  const material = await crypto.subtle.importKey('raw', enc.encode(await pepperedPin(pin, pepper)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    material,
    256
  );
  return toHex(bits);
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
