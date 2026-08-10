# Imagen del backend Flask.
# Railway detecta este Dockerfile solo (Root Directory = back) y saltea Railpack,
# que estaba resolviendo un runtime de Node para una app de Python.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Se copia primero requirements.txt para que la capa de dependencias se cachee
# y no se reinstale todo en cada push.
# psycopg2-binary trae wheels manylinux, asi que no hacen falta build tools.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Necesario para el `flask db upgrade` del pre-deploy.
ENV FLASK_APP=app.py

# Railway inyecta PORT en runtime; 8080 es el fallback para correr local.
EXPOSE 8080

CMD ["sh", "-c", "exec gunicorn app:app \
    --bind 0.0.0.0:${PORT:-8080} \
    --workers 2 \
    --threads 4 \
    --worker-class gthread \
    --timeout 120 \
    --forwarded-allow-ips='*' \
    --access-logfile - \
    --error-logfile -"]
