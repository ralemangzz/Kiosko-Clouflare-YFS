// POST /api/admin/password -> cambia la contraseña de administrador
import { checkPassword, setPassword, json } from '../../_lib/store.js';

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { oldPassword, newPassword } = body;

  if (!(await checkPassword(env, oldPassword))) {
    return json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
  }
  if (!newPassword || newPassword.length < 4) {
    return json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' }, { status: 400 });
  }

  await setPassword(env, newPassword);
  return json({ ok: true });
}
