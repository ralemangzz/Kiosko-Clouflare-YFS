// POST /api/admin/login -> valida la contraseña de administrador
import { checkPassword, json } from '../../_lib/store.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { password } = body;

  if (await checkPassword(env, password)) return json({ ok: true });
  return json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
}
