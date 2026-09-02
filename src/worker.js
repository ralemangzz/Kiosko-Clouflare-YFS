// Worker único que maneja la API del Portal de Línea.
// Los archivos estáticos (public/index.html, styles.css, Images/) los sirve
// Cloudflare automáticamente vía el binding [assets] configurado en
// wrangler.toml — este script solo se ejecuta para lo que NO es un archivo
// estático, que en este proyecto es únicamente /api/*.
import { getLinks, saveLinks, checkPassword, setPassword, json } from './store.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // GET /api/links — lista de aplicaciones (pública)
    if (pathname === '/api/links' && method === 'GET') {
      const links = await getLinks(env);
      return json(links);
    }

    // POST /api/links — crea una aplicación (requiere contraseña)
    if (pathname === '/api/links' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const { password, name, desc, url: linkUrl, icon } = body;

      if (!(await checkPassword(env, password))) {
        return json({ error: 'No autorizado' }, { status: 401 });
      }
      if (!name || !linkUrl) {
        return json({ error: 'Nombre y URL son obligatorios' }, { status: 400 });
      }
      const links = await getLinks(env);
      const newLink = { id: 'app_' + Date.now(), name, desc: desc || '', url: linkUrl, icon: icon || '🔗' };
      links.push(newLink);
      await saveLinks(env, links);
      return json(newLink);
    }

    // PUT/DELETE /api/links/:id
    const linkIdMatch = pathname.match(/^\/api\/links\/([^/]+)$/);
    if (linkIdMatch && (method === 'PUT' || method === 'DELETE')) {
      const id = decodeURIComponent(linkIdMatch[1]);
      const body = await request.json().catch(() => ({}));

      if (!(await checkPassword(env, body.password))) {
        return json({ error: 'No autorizado' }, { status: 401 });
      }

      if (method === 'PUT') {
        const links = await getLinks(env);
        const link = links.find((l) => l.id === id);
        if (!link) return json({ error: 'No encontrado' }, { status: 404 });

        if (body.name) link.name = body.name;
        link.desc = body.desc || '';
        if (body.url) link.url = body.url;
        if (body.icon) link.icon = body.icon;

        await saveLinks(env, links);
        return json(link);
      }

      // DELETE
      let links = await getLinks(env);
      links = links.filter((l) => l.id !== id);
      await saveLinks(env, links);
      return json({ ok: true });
    }

    // POST /api/admin/login
    if (pathname === '/api/admin/login' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (await checkPassword(env, body.password)) return json({ ok: true });
      return json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
    }

    // POST /api/admin/password
    if (pathname === '/api/admin/password' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (!(await checkPassword(env, body.oldPassword))) {
        return json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
      }
      if (!body.newPassword || body.newPassword.length < 4) {
        return json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' }, { status: 400 });
      }
      await setPassword(env, body.newPassword);
      return json({ ok: true });
    }

    // Cualquier otra cosa: que la sirvan los assets estáticos (dará 404 si
    // no existe el archivo — el binding ASSETS ya maneja eso).
    return env.ASSETS.fetch(request);
  },
};
