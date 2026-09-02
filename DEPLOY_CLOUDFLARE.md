# Despliegue en Cloudflare (Workers + Assets)

Esta es la versión del Portal de Línea reescrita para correr en Cloudflare
sin servidor propio. Usa el modelo actual de Cloudflare **Workers con
assets estáticos** (lo que antes era "Pages" está siendo absorbido por
esto — un proyecto creado con "Continue with GitHub" hoy se crea como
Worker, no como Pages clásico).

## Qué cambió respecto a la versión de servidor propio

- **Guardado de datos:** antes vivía en `data/links.json` y `data/admin.json`
  en el disco del servidor. Ahora vive en un namespace de **Cloudflare KV**
  (dos llaves: `links` y `admin`).
- **Hash de contraseña:** antes usaba `bcryptjs`. Ahora usa **PBKDF2 vía Web
  Crypto** (nativo del runtime de Workers) — sin dependencias npm.
- **Rutas de la API:** antes eran archivos separados bajo `functions/`
  (estilo Pages Functions, con ruteo por nombre de archivo). Cloudflare ya
  no soporta ese ruteo automático para proyectos Workers conectados por
  Git, así que ahora todo vive en un solo archivo, `src/worker.js`, que
  revisa la URL y el método a mano.
- **El frontend (`public/index.html`, `styles.css`, `Images/`) no cambió** —
  Cloudflare lo sirve automáticamente vía el binding `[assets]`; el Worker
  (`src/worker.js`) solo se ejecuta para lo que no es un archivo estático,
  que en este proyecto es únicamente `/api/*`.
- Probado localmente con `wrangler dev --local` antes de entregar: estáticos
  + los 5 endpoints (GET/POST links, PUT/DELETE por id, login, cambio de
  contraseña) verificados con curl, todos funcionando.

## Estructura del proyecto

```
portal-linea-cloudflare/
├── public/              # estático — servido directo por el binding [assets]
│   ├── index.html
│   ├── styles.css
│   └── Images/
├── src/
│   ├── worker.js         # único entry point — maneja /api/*, delega el resto a ASSETS
│   └── store.js           # KV + hashing PBKDF2
└── wrangler.toml          # main = src/worker.js, [assets], binding de KV
```

## Pasos de despliegue

1. **GitHub:** ya hecho — el código está en tu repo, subido desde VS Code.
2. **Cloudflare:** dashboard → **Workers & Pages → Create → Continue with
   GitHub** → seleccionar el repo. Cloudflare detecta `wrangler.toml` y usa
   esa configuración (no hay build command que definir).
3. **KV namespace:**
   - Dashboard → **Storage & Databases → KV → Create a namespace**
     (ej. `portal-linea-kv`).
   - En tu proyecto de Worker → **Settings → Bindings → Add → KV
     Namespace**: variable name **`PORTAL_KV`** (exacto, así está en el
     código) → seleccionar el namespace.
   - Volver a desplegar (o esperar el próximo push) para que tome efecto.
4. **Primer acceso:** contraseña inicial **1234**, cambiarla de inmediato
   desde el panel de admin.
5. **Dominio propio (opcional):** proyecto → **Settings → Domains & Routes
   → Add**.
6. **Cloudflare Access (restringir quién ve el sitio):** Zero Trust →
   Access → Applications → Add an application → Self-hosted → dominio del
   Worker → política "Emails ending in @yanfeng.com" (o lista explícita).

## Actualizaciones futuras

Con la conexión a GitHub ya hecha, cualquier `git push` a `main` dispara un
despliegue automático.
