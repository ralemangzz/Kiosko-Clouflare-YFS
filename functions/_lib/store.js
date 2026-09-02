// Capa de datos compartida para las Cloudflare Pages Functions.
// Sustituye a los archivos data/links.json y data/admin.json de la versión
// para servidor propio: aquí todo vive en un namespace de Cloudflare KV.
//
// El binding se llama PORTAL_KV — hay que crearlo y enlazarlo en el
// dashboard de Cloudflare Pages (Settings → Functions → KV namespace
// bindings). Ver DEPLOY_CLOUDFLARE.md para el paso a paso.

const LINKS_KEY = 'links';
const ADMIN_KEY = 'admin';
const DEFAULT_PASSWORD = '1234'; // Cámbiala desde el panel de admin en cuanto despliegues.

// ---------- hashing de contraseña (Web Crypto / PBKDF2) ----------
// Nota: la versión original usaba bcryptjs. Aquí usamos PBKDF2 vía la Web
// Crypto API porque es nativa del runtime de Cloudflare Workers (sin
// dependencias npm que empaquetar) y da la misma garantía de seguridad:
// hash con salt aleatorio + muchas iteraciones, no reversible.

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBuf(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr.buffer;
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2$100000$${bufToHex(salt)}$${bufToHex(bits)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = hexToBuf(parts[2]);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password || ''),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return timingSafeEqualHex(bufToHex(bits), parts[3]);
}

// ---------- inicialización perezosa (equivalente a ensureDataFiles) ----------
export async function ensureInitialized(env) {
  const admin = await env.PORTAL_KV.get(ADMIN_KEY);
  if (!admin) {
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    await env.PORTAL_KV.put(ADMIN_KEY, JSON.stringify({ passwordHash }));
  }
  const links = await env.PORTAL_KV.get(LINKS_KEY);
  if (!links) {
    await env.PORTAL_KV.put(LINKS_KEY, '[]');
  }
}

// ---------- links ----------
export async function getLinks(env) {
  await ensureInitialized(env);
  const raw = await env.PORTAL_KV.get(LINKS_KEY);
  return JSON.parse(raw || '[]');
}

export async function saveLinks(env, links) {
  await env.PORTAL_KV.put(LINKS_KEY, JSON.stringify(links));
}

// ---------- admin ----------
export async function checkPassword(env, password) {
  await ensureInitialized(env);
  const raw = await env.PORTAL_KV.get(ADMIN_KEY);
  const admin = JSON.parse(raw);
  return verifyPassword(password, admin.passwordHash);
}

export async function setPassword(env, newPassword) {
  const passwordHash = await hashPassword(newPassword);
  await env.PORTAL_KV.put(ADMIN_KEY, JSON.stringify({ passwordHash }));
}

// ---------- helper de respuesta ----------
export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });
}
