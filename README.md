# Abul_Cell

## Variables de entorno requeridas

Backend requiere estas variables antes de iniciar:

* `SECRET_KEY`
* `JWT_SECRET_KEY`
* `DATABASE_URL`
* `FRONTEND_URL`

## Backend

### Base de datos (Postgres)

Configurar `DATABASE_URL` con Postgres (o compatible), por ejemplo:

```
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/abul_cells
```

### Migraciones

El backend usa Flask-Migrate/Alembic para versionar `models.py`.

```
export FLASK_APP=app.py
flask db upgrade
```

Para generar nuevas migraciones:

```
flask db migrate -m "describe change"
```

### Storage de uploads

Los adjuntos del formulario de contacto se guardan temporalmente y se limpian al finalizar.
Para persistencia, usar almacenamiento externo (ej. S3):

```
UPLOAD_STORAGE_BACKEND=s3
UPLOAD_BUCKET=mi-bucket
UPLOAD_PREFIX=contact-uploads/
UPLOAD_PUBLIC_BASE_URL=https://mi-cdn.example.com

```

### Imágenes de productos con Cloudinary

Si querés que las imágenes de productos se suban a Cloudinary, configurá:

```
PRODUCT_IMAGE_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
CLOUDINARY_SECURE=true
CLOUDINARY_PRODUCT_FOLDER=products
```

Estas variables pueden ir en tu `.env` local (no lo subas al repo) o en el panel de variables
de entorno del hosting (Render, Heroku, etc.).
