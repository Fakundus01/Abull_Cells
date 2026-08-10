# Deploy: Railway (backend) + Vercel (frontend) + Supabase (base)

Reemplaza el deploy anterior de Render. Son **3 piezas**:

| Pieza | Dónde | Costo |
|---|---|---|
| Base de datos Postgres | Supabase | Free tier (500 MB) |
| Backend Flask | Railway, root `back` | Hobby: $5/mes de crédito por uso |
| Frontend Vite | Vercel, root `front` | Free (estáticos ilimitados) |

El front va en Vercel y no en Railway porque en Railway pagarías por un contenedor
corriendo 24/7 sólo para servir archivos estáticos. En Vercel eso es gratis, y así el
crédito de Railway queda entero para el backend.

---

## 0. Antes de empezar: rotar secretos

El archivo `back/.env` estuvo commiteado en el repo. Todo lo que hay adentro se considera
comprometido. Antes del deploy hay que regenerar:

- **App Password de Gmail** → https://myaccount.google.com/apppasswords (revocar la vieja)
- **API Secret de Cloudinary** → Settings → Access Keys → Rotate
- **`SECRET_KEY` y `JWT_SECRET_KEY`** → nuevos, aleatorios (ver abajo)
- **`MP_ACCESS_TOKEN`** → el que estaba era de TEST; para producción va el `APP_USR-...`

Generar secretos nuevos:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## 1. Base de datos en Supabase

1. https://supabase.com → **New project**. (Ya creado: proyecto `wtivtshzvsnfwnhanrsj`, región `ca-central-1`.)
2. Guardá la **Database Password** que te muestra (no se puede volver a ver).
3. **Connect** (botón arriba) → pestaña **Session pooler** → copiá la URI.

   Queda de la forma:
   ```
   postgresql://postgres.wtivtshzvsnfwnhanrsj:TU_PASSWORD@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
   ```

### Por qué el pooler y no la conexión directa

- La conexión directa (`db.xxx.supabase.co`) es **solo IPv6** en el free tier. Railway sale
  por IPv4 → no conecta. El pooler tiene IPv4.
- Usá el **Session pooler (puerto 5432)**, no el Transaction pooler (6543): Alembic necesita
  prepared statements y el modo transaction los rompe.

Agregale `?sslmode=require` al final de la URI.

### ⚠️ El usuario lleva el project-ref pegado

El usuario del pooler es **`postgres.wtivtshzvsnfwnhanrsj`**, no `postgres` a secas. El pooler
usa esa parte para saber a qué proyecto rutear la conexión.

Si copiás el usuario de la pestaña *Direct connection* (que sí es `postgres`) y lo pegás con
el host del pooler, obtenés:

```
FATAL:  password authentication failed for user "postgres"
```

que despista, porque el problema es el usuario y no la contraseña.

Si la contraseña tiene caracteres especiales (`@ : / ? # % &`), hay que percent-encodearla
dentro de la URL o el parseo se rompe.

### Datos de la base vieja

La base de Render (`dpg-d5ngi8n5r7bs73do9u5g-a`) **ya no responde** — la verifiqué y rechaza
la conexión, así que la instancia está suspendida o eliminada. Si te importan los productos /
usuarios / pedidos que había, fijate en el dashboard de Render si todavía figura la base o
algún backup antes de que Render la purgue definitivamente. Si no, arrancás de cero: el
`flask db upgrade` del pre-deploy crea todas las tablas vacías.

**Estado actual:** las 19 migraciones ya se corrieron contra el Supabase nuevo. El esquema
está creado y vacío (`users`, `products`, `product_images`, `orders`, `order_items`,
`addresses`), en el head `d4f1a8b7c9e2`. No hace falta correr nada a mano.

Para recuperar un dump, si llegás a tenerlo:

```bash
pg_restore --no-owner --no-privileges -d "postgresql://postgres.wtivtshzvsnfwnhanrsj:TU_PASSWORD@aws-0-ca-central-1.pooler.supabase.com:5432/postgres" dump.sql
```

---

## 2. Servicio backend en Railway

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → `Fakundus01/Abull_Cells`.
2. En el servicio creado → **Settings**:
   - **Root Directory**: `back`
   - **Branch**: `main` (o `dev` si querés deployar esa)
3. **Region**: elegí `us-east4` (Virginia). Es la más cercana a `ca-central-1`, donde está
   tu Supabase — cada query de más lejos suma latencia a todas las respuestas.
4. El resto ya está en el repo:
   - `back/Dockerfile` → imagen Python 3.11 + gunicorn. Railway lo detecta solo.
   - `back/railway.toml` → pre-deploy `flask db upgrade`, healthcheck `/api/health`.

### Por qué Dockerfile y no Railpack

El builder por defecto de Railway hoy es **Railpack**, y con este repo autodetectaba un
runtime de **Node** para un backend de Python: el build moría en ~7 segundos con
"Failed to build an image".

Con el `Dockerfile` presente en el root directory, Railway lo usa y no hay autodetección
que pueda equivocarse. Si en Settings → Build ves "Railpack" seleccionado a mano,
cambialo a **Dockerfile** (o dejalo en automático, que al encontrar el archivo lo prioriza).
5. **Settings → Networking → Generate Domain**. Anotá el dominio (`xxx.up.railway.app`).
6. Pegá las variables (sección 4) y redeployá.

## 3. Frontend en Vercel

1. https://vercel.com → **Add New** → **Project** → importá `Fakundus01/Abull_Cells`.
2. **Root Directory**: `front` (importante, si no busca el `package.json` en la raíz).
3. Framework preset: Vite. El resto ya está en `front/vercel.json`:
   - `rewrites` → fallback de SPA, para que `/tienda` entre directo sin dar 404
   - cache eterno para `/assets/*` (llevan hash) y `no-store` para `index.html`
4. **Environment Variables** → cargá las de la sección 4.
5. Deploy. Anotá el dominio (`xxx.vercel.app`).

> Cada push a la rama conectada redeploya solo.

---

## 4. Variables de entorno

Railway tiene **Raw Editor** en la pestaña Variables: podés pegar los bloques enteros.

### Servicio `backend`

```env
FLASK_APP=app.py

SECRET_KEY=<generar nuevo>
JWT_SECRET_KEY=<generar nuevo, distinto>

DATABASE_URL=postgresql://postgres.wtivtshzvsnfwnhanrsj:TU_PASSWORD@aws-0-ca-central-1.pooler.supabase.com:5432/postgres?sslmode=require

FRONTEND_URL=https://TU-FRONT.vercel.app
BACKEND_URL=https://TU-BACK.up.railway.app

JWT_COOKIE_SECURE=true
JWT_COOKIE_SAMESITE=None

EMAIL_SENDER=abulcell185@gmail.com
EMAIL_PASSWORD=<app password NUEVA>
EMAIL_ADMIN=abulcell185@gmail.com

LOCAL_PICKUP_ADDRESS=Azcuenaga 185, CABA
LOCAL_PICKUP_HOURS=Lun a Sáb 9:00 a 18:00
LOCAL_PICKUP_WHATSAPP=+54 11 5098-3612

MP_ACCESS_TOKEN=<token productivo APP_USR-...>
MP_SUCCESS_URL=https://TU-FRONT.vercel.app/checkout/success
MP_FAILURE_URL=https://TU-FRONT.vercel.app/checkout/failure
MP_PENDING_URL=https://TU-FRONT.vercel.app/checkout/pending
MP_WEBHOOK_URL=https://TU-BACK.up.railway.app/api/payments/mp/webhook

PRODUCT_IMAGE_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=duarmaoyp
CLOUDINARY_API_KEY=<rotada>
CLOUDINARY_API_SECRET=<rotada>
CLOUDINARY_SECURE=true
CLOUDINARY_PRODUCT_FOLDER=products
CLOUDINARY_ASSET_FOLDER=products_clientes/Productos_abul

# Sugerencias de titulo y descripcion desde la foto, en el panel de admin.
# Opcional: sin la key el panel anda igual, solo sin ese boton.
# Costo medido: ~USD 0.0005 por imagen.
OPENAI_API_KEY=<tu key de platform.openai.com>
OPENAI_VISION_MODEL=gpt-4o-mini

MAX_UPLOAD_MB=8
UPLOAD_TEMP_DIR=/tmp/abul_cells_uploads
ORDER_RESERVATION_MINUTES=30
```

Opcional, para que cree el usuario admin en el primer arranque (después conviene borrarlas):

```env
ADMIN_EMAIL=abulcell185@gmail.com
ADMIN_PASSWORD=<clave fuerte>
ADMIN_NAME=Administrador
```

### Proyecto de Vercel (`frontend`)

```env
VITE_API_URL=https://TU-BACK.up.railway.app/api
VITE_CHECKOUT_WHATSAPP_NUMBER=1150983612
```

> Vite compila estas variables **dentro del bundle**. Si las cambiás en Vercel hay que
> **redeployar** (Deployments -> ... -> Redeploy), no alcanza con guardarlas.

---

## 5. Dominio propio (`abulcell.com`) — muy recomendado

⚠️ **Con `TU-FRONT.vercel.app` + `TU-BACK.up.railway.app` la sesión es cross-site.** La cookie
JWT viaja con `SameSite=None`, y eso es exactamente lo que bloquean por defecto Safari (ITP),
Firefox (Total Cookie Protection) y Brave. En esos navegadores **el login no va a funcionar**.
En Chrome hoy anda, pero depende de que el usuario no tenga cookies de terceros bloqueadas.

Poniendo el front en `abulcell.com` y el back en `api.abulcell.com`, ambos comparten dominio
registrable: la cookie pasa a ser same-site, `SameSite=Lax` alcanza y funciona en todos lados.
Como ya tenés el dominio (tu `front/.env` apuntaba a `api.abulcell.com`), conviene hacerlo
desde el arranque y no después.

### DNS en Cloudflare

El dominio está en Cloudflare con nameservers `eloise/zeus.ns.cloudflare.com`.

**Estado al 2026-08-10:** el DNS todavía apunta a Render, que ya no existe — por eso
`abulcell.com` y `api.abulcell.com` devuelven HTTP 403 y Vercel marca "Invalid Configuration".

Hay que **borrar** estos registros heredados de Render:

```
A      @      216.24.57.7
A      @      216.24.57.15
CNAME  api    abull-cells.onrender.com
```

Y **crear** estos:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | `9044e9e44440373c.vercel-dns-017.com` | DNS only |
| CNAME | `www` | `9044e9e44440373c.vercel-dns-017.com` | DNS only |
| CNAME | `api` | el que dé Railway al agregar el custom domain | DNS only |

⚠️ **El proxy (nube naranja) tiene que quedar apagado en los tres.** Con el proxy activo,
Vercel y Railway no pueden emitir el certificado TLS: te da error de handshake o loop de
redirecciones. Si en algún momento lo activás, el modo SSL/TLS de Cloudflare debe ser
**Full (strict)** — con *Flexible* entrás en un loop infinito de redirects.

El CNAME en el apex (`@`) es válido acá porque Cloudflare hace CNAME flattening.

### Pasos

1. Vercel → proyecto del front → Settings → Domains → `abulcell.com`
2. Railway → servicio `backend` → Networking → Custom Domain → `api.abulcell.com`
3. Cargá en Cloudflare los registros de la tabla de arriba.
4. Cambiá estas variables:

```env
# backend
FRONTEND_URL=https://abulcell.com
BACKEND_URL=https://api.abulcell.com
JWT_COOKIE_SAMESITE=Lax
JWT_COOKIE_SECURE=true
JWT_COOKIE_DOMAIN=.abulcell.com
MP_SUCCESS_URL=https://abulcell.com/checkout/success
MP_FAILURE_URL=https://abulcell.com/checkout/failure
MP_PENDING_URL=https://abulcell.com/checkout/pending
MP_WEBHOOK_URL=https://api.abulcell.com/api/payments/mp/webhook

# frontend
VITE_API_URL=https://api.abulcell.com/api
```

---

## 6. Verificación post-deploy

```bash
curl https://TU-BACK.up.railway.app/api/health
```

Después, en el navegador:

- Abrir el front (Vercel) y ver que carga la tienda (si no, mirá la consola: error de CORS = `FRONTEND_URL` mal puesto).
- Login → en DevTools → Application → Cookies debe aparecer `access_token_cookie`.
  Si no aparece, revisá `JWT_COOKIE_SECURE` / `JWT_COOKIE_SAMESITE`.
- Entrar directo a `https://TU-FRONT/tienda` (sin pasar por home) → debe cargar, no dar 404.
  Eso valida el `rewrites` de `vercel.json`.
- Configurar la URL del webhook en el panel de Mercado Pago apuntando a `MP_WEBHOOK_URL`.

## 7. Notas de costo

- Railway Hobby: $5/mes que se consumen por uso. Con un solo servicio (el backend) entra cómodo.
- Vercel Hobby: gratis para proyectos personales, sin límite práctico para este tamaño.
- El backend **no duerme** en Railway (a diferencia del free de Render), así que consume
  siempre. `--workers 2 --threads 4` está dimensionado para no comerse el crédito.
- Supabase free: 500 MB de base. **Pausa el proyecto tras 7 días sin actividad** — como el
  backend consulta la base seguido, no debería pasar, pero tenelo en cuenta.
