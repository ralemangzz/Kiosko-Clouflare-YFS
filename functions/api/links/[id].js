// PUT    /api/links/:id  -> edita una aplicación (requiere contraseña de admin)
// DELETE /api/links/:id  -> elimina una aplicación (requiere contraseña de admin)
import { getLinks, saveLinks, checkPassword, json } from '../../_lib/store.js';

export async function onRequestPut({ request, env, params }) {
  const body = await request.json().catch(() => ({}));
  const { password, name, desc, url, icon } = body;

  if (!(await checkPassword(env, password))) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  const links = await getLinks(env);
  const link = links.find((l) => l.id === params.id);
  if (!link) return json({ error: 'No encontrado' }, { status: 404 });

  if (name) link.name = name;
  link.desc = desc || '';
  if (url) link.url = url;
  if (icon) link.icon = icon;

  await saveLinks(env, links);
  return json(link);
}

export async function onRequestDelete({ request, env, params }) {
  const body = await request.json().catch(() => ({}));
  const { password } = body;

  if (!(await checkPassword(env, password))) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  let links = await getLinks(env);
  links = links.filter((l) => l.id !== params.id);
  await saveLinks(env, links);
  return json({ ok: true });
}
