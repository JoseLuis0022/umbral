# Backend de Umbral: FastAPI + Claude Agent SDK.
#
# El SDK trae su propio ejecutable de Claude Code (para la arquitectura en la
# que se construye la imagen): no hace falta Node.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# poppler-utils: el modo Generador convierte PDFs a imágenes (pdftoppm).
RUN apt-get update \
 && apt-get install -y --no-install-recommends poppler-utils ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias primero (capa en caché mientras no cambie pyproject.toml).
COPY pyproject.toml ./
RUN python -c "import tomllib; print('\n'.join(tomllib.load(open('pyproject.toml','rb'))['project']['dependencies']))" > /tmp/requisitos.txt \
 && pip install -r /tmp/requisitos.txt

COPY app ./app

# Sin root: el agente ejecuta herramientas, así que el proceso no debe poder
# tocar el sistema. UID 1000 = el usuario normal de casi cualquier servidor
# Linux, para que pueda escribir en la carpeta del agente montada.
RUN useradd --create-home --uid 1000 umbral \
 && mkdir -p /datos /agente \
 && chown umbral:umbral /datos /agente
USER umbral

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/salud', timeout=4)"

# UN solo proceso (sin --workers): las tareas en curso viven en la memoria de
# este proceso (app/trabajos.py). Varios workers no las compartirían.
# El apagado espera hasta 30 s a que terminen las respuestas en curso.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips", "*", "--timeout-graceful-shutdown", "30"]
