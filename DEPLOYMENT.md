# Deploy (Fase 5) — histórico

> ⚠️ **Desactualizado.** Describe el deploy en Render, que ya no se usa.
> La guía vigente es [RAILWAY.md](RAILWAY.md): Railway (backend) + Vercel (frontend) + Supabase (base).
> Este archivo queda como referencia de las opciones de configuración.

Este documento resume el plan de despliegue para el backend y frontend.

## Backend (Flask)

1. **Variables de entorno**
   - `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`.
   - Subidas de productos (recomendado en producción con disco persistente):
     - `PRODUCT_UPLOAD_DIR=/var/data/uploads/products`
     - `PRODUCT_IMAGE_BASE_URL=/uploads/products`
     Subidas con Cloudinary (opción 2 si no usás disco persistente):
     - `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
     - `CLOUDINARY_FOLDER=abul_cells/products` (opcional)
   - Recomendado en producción:
     - `JWT_COOKIE_SECURE=true`
     - `JWT_COOKIE_SAMESITE=Lax` (o `None` si usás dominios cruzados + HTTPS)
     - `JWT_COOKIE_DOMAIN=tu-dominio` (opcional)
   - Mercado Pago:
     - `MP_ACCESS_TOKEN`, `MP_WEBHOOK_URL`, `MP_SUCCESS_URL`, `MP_FAILURE_URL`, `MP_PENDING_URL`
   - Reservas:
     - `ORDER_RESERVATION_MINUTES=30` (ajustable)

2. **Servidor WSGI**
   - Ejecutar con Gunicorn (o similar) detrás de Nginx.
   - Ejemplo:
     ```
     gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
     ```

3. **Migraciones**
   - Aplicar con:
     ```
     export FLASK_APP=app.py
     flask db upgrade
     ```

4. **CORS**
   - `FRONTEND_URL` debe coincidir con el dominio real del frontend.
5. **Disco persistente (Render)**
   - Crear un **Persistent Disk** y montarlo en `/var/data`.
   - Asegurar que el backend tenga:
     - `PRODUCT_UPLOAD_DIR=/var/data/uploads/products`
     - `PRODUCT_IMAGE_BASE_URL=/uploads/products`
   - Esto evita que las imágenes se pierdan entre deploys o al escalar instancias.

## Frontend (Vite)

1. **Variables de entorno**
   - `VITE_API_BASE_URL=https://api.tu-dominio.com/api`

2. **Build**
   ```
   npm install
   npm run build
   ```

3. **Hosting**
   - Deploy estático (Vercel/Netlify/S3 + CloudFront).

## Observabilidad recomendada

- Logging estructurado.
- Sentry u otra herramienta de trazas/errores.
- Backups de Postgres.