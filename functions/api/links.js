// GET  /api/links   -> lista de aplicaciones (vista kiosko, pública)
// POST /api/links   -> crea una aplicación (requiere contraseña de admin)
import { getLinks, saveLinks, checkPassword, json } from '../_lib/store.js';

export async function onRequestGet({ env }) {
  const links = await getLinks(env);
  return json(links);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { password, name, desc, url, icon } = body;

  if (!(await checkPassword(env, password))) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!name || !url) {
    return json({ error: 'Nombre y URL son obligatorios' }, { status: 400 });
  }

  const links = await getLinks(env);
  const newLink = { id: 'app_' + Date.now(), name, desc: desc || '', url, icon: icon || '🔗' };
  links.push(newLink);
  await saveLinks(env, links);
  return json(newLink);
}
