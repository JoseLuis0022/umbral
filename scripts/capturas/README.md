# Capturas de la landing

Regenera las capturas de producto de `frontend/public/landing/` con datos inventados:

```bash
PYTHON_IMAGENES=/ruta/a/un/python/con/Pillow scripts/capturas/capturar.sh
```

Un solo comando:

1. crea una carpeta temporal con una base SQLite nueva y una carpeta de agente falsa (`sembrar.py`): cuentas `@ejemplo.com`, unos 30 días de consultas con modelos y costos variados, y el historial del chat de la cuenta admin (Ana Torres);
2. levanta el backend con `MOTOR=prueba` en el puerto 8021 (no llama a Claude) y el front compilado con `vite preview` en el 4221;
3. captura la app con Playwright a `deviceScaleFactor: 2` (Mac 1440×900; iPhone 390×760, la pantalla de 390×830 menos la barra de estado y el indicador de inicio);
4. la enmarca en devices.css 0.2.0 (`marco.html`) con una sombra suave y fondo transparente;
5. escribe los WebP (calidad 86, alfa 90), recortados con margen transparente, y comprueba que las cuatro orillas tengan alfa 0 (`a_webp.py`);
6. apaga los servidores y borra la carpeta temporal, también si algo falla.

Resultados: `mac-chat.webp`, `iphone-chat.webp`, `mac-tablero.webp`, `mac-auditoria.webp`, `mac-corpus.webp`.

| Archivo | Para qué |
|---|---|
| `capturar.sh` | El orquestador. |
| `sembrar.py` | Datos de demostración (semilla fija; las fechas se calculan desde ahora). |
| `corpus/Apuntes/*.html` | Apuntes de ejemplo; `sembrar.py` les agrega su PDF y unas transcripciones. |
| `capturar.mjs` | Inicia sesión, navega y fotografía cada pantalla; luego compone los marcos. |
| `marco.html` | Plantilla del MacBook y del iPhone. |
| `a_webp.py` | PNG → WebP con recorte y verificación de orillas. |

Requisitos: `backend/.venv`, `frontend/node_modules`, Google Chrome, `playwright-core` (por defecto el del CLI global de Playwright; otro con `PLAYWRIGHT=/ruta/a/playwright-core/index.mjs`) y un Python con Pillow en `PYTHON_IMAGENES`. Necesita red para cargar devices.css desde jsDelivr.

Variables útiles: `PUERTO_API`, `PUERTO_WEB`, `DESTINO` (otra carpeta de salida) y `CONSERVAR=1` (no borra la carpeta temporal, para revisar las capturas sin marco en `pantallas/`).

Las variables de entorno ganan sobre `backend/.env`, así que nunca se toca la base real ni la API key.
