# Despliegue en Cloudflare Pages (sin servidor propio)

Esta es la versión del Portal de Línea reescrita para correr enteramente en
Cloudflare, sin depender del servidor Linux de Yanfeng. Probada localmente
con `wrangler pages dev` antes de entregarla — los endpoints (crear/editar/
borrar links, login de admin, cambio de contraseña) funcionan igual que en
la versión original.

## Qué cambió respecto a la versión de servidor propio

- **Guardado de datos:** antes vivía en `data/links.json` y `data/admin.json`
  en el disco del servidor. Aquí vive en un namespace de **Cloudflare KV**
  (dos llaves: `links` y `admin`), porque las Cloudflare Pages Functions no
  tienen disco persistente.
- **Hash de contraseña:** antes usaba `bcryptjs`. Aquí usa **PBKDF2 vía Web
  Crypto** (nativo del runtime de Cloudflare Workers) — misma idea (salt +
  muchas iteraciones, no reversible), pero sin depender de un paquete npm
  que haya que empaquetar. El proyecto ya no tiene ninguna dependencia npm.
- **El frontend (`public/index.html`, `styles.css`, `Images/`) no cambió en
  nada** — sigue llamando a los mismos endpoints (`/api/links`,
  `/api/admin/login`, etc.), así que la experiencia del kiosko es idéntica.

## 1. Subir el código a GitHub

```bash
cd portal-linea-cloudflare
git init
git add .
git commit -m "Portal de línea - versión Cloudflare Pages"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/portal-linea-cloudflare.git
git push -u origin main
```

(Crea antes el repo vacío en GitHub si no existe.)

## 2. Crear el proyecto en Cloudflare Pages

1. En el dashboard de Cloudflare: **Workers & Pages → Create → Pages →
   Connect to Git**.
2. Selecciona el repo que acabas de subir.
3. Configuración de build:
   - **Framework preset:** None
   - **Build command:** (vacío — no hay paso de build, son archivos estáticos + Functions)
   - **Build output directory:** `public`
4. Guarda y despliega. Te va a dar una URL tipo
   `https://portal-linea-cloudflare.pages.dev`.

## 3. Crear el KV namespace y enlazarlo

El sitio va a fallar (o correr con datos vacíos que no persisten bien) hasta
que hagas esto:

1. **Workers & Pages → KV → Create a namespace** — nómbralo por ejemplo
   `portal-linea-kv`.
2. Ve a tu proyecto de Pages → **Settings → Functions → KV namespace
   bindings → Add binding**:
   - **Variable name:** `PORTAL_KV` (tiene que ser exactamente ese nombre,
     así está escrito en el código)
   - **KV namespace:** `portal-linea-kv`
3. Repite el binding para el ambiente de **Preview** también (Cloudflare
   Pages maneja Production y Preview por separado).
4. Vuelve a desplegar (Deployments → ⋯ → Retry deployment) para que el
   binding tome efecto.

## 4. Primer acceso

1. Abre la URL de tu proyecto (`https://portal-linea-cloudflare.pages.dev`
   o tu dominio propio, ver siguiente sección).
2. Entra al panel de administrador con la contraseña inicial **1234**.
3. Cámbiala de inmediato desde "Cambiar contraseña de administrador".

## 5. (Opcional) Dominio propio

Si el dominio de Yanfeng ya está en Cloudflare DNS: proyecto de Pages →
**Custom domains → Set up a custom domain** (por ejemplo
`portal-linea.yanfeng.com`).

## 6. Restringir quién puede ver el sitio (Cloudflare Access)

Como decidiste que el sitio quede detrás de un login corporativo en vez de
totalmente público:

1. Ve a **Zero Trust → Access → Applications → Add an application →
   Self-hosted**.
2. **Application domain:** el dominio de tu proyecto de Pages (el
   `*.pages.dev` o el dominio propio del paso 5).
3. Configura una **política** — lo más simple para esto es "Emails ending
   in" con el dominio de correo de Yanfeng (por ejemplo `@yanfeng.com`), o
   una lista explícita de correos si prefieres control más fino.
4. Guarda. A partir de ahí, cualquiera que entre a la URL primero ve una
   pantalla de login de Cloudflare Access (código por correo, o el proveedor
   de identidad que tengan configurado) antes de llegar al kiosko.

Esto protege *quién ve el sitio*; el panel de administrador sigue además
protegido por su propia contraseña para *quién puede editar*.

## Actualizaciones futuras

Con la conexión a GitHub ya hecha, cualquier `git push` a la rama `main`
dispara un despliegue automático — no hay que repetir el paso 2.

## El servidor de Yanfeng ya no es necesario

Con esta ruta, el servidor Linux por el que entramos por SSH ya no hace
falta para correr el portal — puede quedar libre para otra cosa, o usarse
más adelante si en algún momento quieren volver a la versión con servidor
propio (esa versión sigue intacta y documentada en `DEPLOY_LINUX.md`, por
si acaso).
