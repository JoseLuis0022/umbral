"""Datos de demostración para las capturas de la landing.

Crea, dentro de la carpeta temporal que recibe como argumento:

- `agente/`: una carpeta de agente FALSA (apuntes HTML de ejemplo de esta
  carpeta, sus PDF y unas transcripciones inventadas). Nunca el material real.
- la base SQLite (`DB_RUTA`) con cuentas `@ejemplo.com`, ~30 días de consultas
  con costos y modelos variados, y el historial del chat de la cuenta admin.

Las variables (`DB_RUTA`, `AGENTE_CWD`, `JWT_SECRETO`, `MOTOR`…) las pone
`capturar.sh` ANTES de importar la app: la configuración se lee al importar.
Todo es inventado y reproducible (semilla fija); solo las fechas se calculan
desde "ahora", para que el Tablero y el historial siempre se vean recientes.
"""

import random
import shutil
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent.parent / "backend"))

from app import db  # noqa: E402
from app.seguridad import hashear  # noqa: E402

CONTRASENA = "demostracion-umbral-2026"
CORREO_ADMIN = "ana.torres@ejemplo.com"
# La hora local de las cuentas inventadas (UTC−6). Las consultas caen de día.
DESFASE_LOCAL = timedelta(hours=-6)

azar = random.Random(20261113)
AHORA = datetime.now(timezone.utc).replace(microsecond=0)


# ── Carpeta de agente falsa ─────────────────────────────────────────────────


def pdf_minimo(titulo: str, paginas: int = 3) -> bytes:
    """Un PDF válido de texto plano (Helvetica, WinAnsi) sin dependencias."""
    objetos: list[bytes] = []
    hijos = " ".join(f"{3 + 2 * i} 0 R" for i in range(paginas))
    objetos.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objetos.append(f"<< /Type /Pages /Kids [{hijos}] /Count {paginas} >>".encode())
    fuente = 3 + 2 * paginas
    for i in range(paginas):
        texto = f"{titulo} - pagina {i + 1}".encode("cp1252").replace(b"(", b"\\(").replace(b")", b"\\)")
        flujo = b"BT /F1 20 Tf 72 720 Td (" + texto + b") Tj ET"
        objetos.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {4 + 2 * i} 0 R "
            f"/Resources << /Font << /F1 {fuente} 0 R >> >> >>".encode()
        )
        objetos.append(b"<< /Length " + str(len(flujo)).encode() + b" >>\nstream\n" + flujo + b"\nendstream")
    objetos.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")

    salida = bytearray(b"%PDF-1.4\n")
    posiciones = []
    for n, cuerpo in enumerate(objetos, start=1):
        posiciones.append(len(salida))
        salida += f"{n} 0 obj\n".encode() + cuerpo + b"\nendobj\n"
    inicio_xref = len(salida)
    salida += f"xref\n0 {len(objetos) + 1}\n0000000000 65535 f \n".encode()
    for p in posiciones:
        salida += f"{p:010d} 00000 n \n".encode()
    salida += f"trailer\n<< /Size {len(objetos) + 1} /Root 1 0 R >>\nstartxref\n{inicio_xref}\n%%EOF\n".encode()
    return bytes(salida)


TRANSCRIPCIONES = {
    "Clase 3 - 19 ago.txt": "Hoy vemos el histograma. Cuenta cuántos pixeles hay de cada nivel de gris...",
    "Clase 4 - 26 ago.txt": "La convolución recorre la imagen con una máscara de 3 por 3...",
    "Clase 5 - 2 sep.txt": (
        "Con el ruido sal y pimienta el promedio no sirve: el 255 se reparte entre los vecinos.\n"
        "La mediana ordena la vecindad y se queda con el del centro; el ruido queda en los extremos de la lista.\n"
    ),
    "Clase 6 - 9 sep.txt": "La transformada de Fourier separa la imagen en frecuencias...",
}


def crear_agente(raiz: Path) -> Path:
    agente = raiz / "agente"
    shutil.copytree(AQUI / "corpus", agente)
    for html in sorted((agente / "Apuntes").glob("*.html")):
        (html.with_suffix(".pdf")).write_bytes(pdf_minimo(html.stem))
    transcripciones = agente / "Clases" / "Transcripciones"
    transcripciones.mkdir(parents=True)
    for nombre, texto in TRANSCRIPCIONES.items():
        (transcripciones / nombre).write_text(texto, encoding="utf-8")
    return agente


# ── Personas ────────────────────────────────────────────────────────────────

# (nombre, rol, peso de uso)
PERSONAS = [
    ("Ana Torres", "admin", 3),
    ("Luis Ortega", "usuario", 5),
    ("Diego Herrera", "usuario", 7),
    ("Sofía Ramos", "usuario", 6),
    ("Valeria Cruz", "usuario", 6),
    ("Mateo Salinas", "usuario", 4),
    ("Camila Rojas", "usuario", 3),
    ("Andrés Molina", "especialista", 2),
]


def correo_de(nombre: str) -> str:
    sin_acentos = nombre.lower().translate(str.maketrans("áéíóúñ", "aeioun"))
    return sin_acentos.replace(" ", ".") + "@ejemplo.com"


def crear_personas() -> dict[str, db.Usuario]:
    hash_ = hashear(CONTRASENA)
    return {nombre: db.crear_usuario(correo_de(nombre), nombre, rol, hash_) for nombre, rol, _ in PERSONAS}


# ── Consultas (Tablero y Auditoría) ─────────────────────────────────────────

PREGUNTA_MEDIANA = "¿Por qué el filtro de mediana quita mejor el ruido sal y pimienta que el promedio?"

RESPUESTA_MEDIANA = """El ruido **sal y pimienta** son pixeles aislados que valen 0 o 255. El filtro de **promedio** los mezcla con sus vecinos y los reparte; la **mediana** los descarta.

### Por qué funciona

1. Toma la vecindad de 3×3 alrededor de cada pixel.
2. Ordena los 9 valores.
3. Se queda con el del centro (el 5.º).

Un pixel de ruido queda en un extremo de la lista, así que casi nunca es el valor central [Clase 5](<fuente:Clases/Transcripciones/Clase 5 - 2 sep.txt> "el ruido queda en los extremos de la lista").

| | Promedio 3×3 | Mediana 3×3 |
|---|---|---|
| Ruido sal y pimienta | Lo difumina | Lo elimina |
| Bordes | Se suavizan | Se conservan |
| Costo | Bajo | Mayor (ordenar) |

Ejemplo con la vecindad `[14, 15, 16, 255, 15, 0, 16, 14, 15]`: el promedio da **40**, la mediana **15**, que es el valor real de la zona [Filtros de orden, p. 3](<fuente:Apuntes/Tema 05 - Filtros de orden y mediana.pdf#page=3>).

### Cuándo no basta

- Si más de la mitad de la ventana es ruido, la mediana también falla.
- Para ruido gaussiano el promedio (o un filtro gaussiano) suele ir mejor.
- Con ruido muy denso conviene una ventana más grande o una mediana adaptativa [Tema 5](<fuente:Apuntes/Tema 05 - Filtros de orden y mediana.html> "mediana adaptativo")."""

# (pregunta, respuesta corta en markdown)
PREGUNTAS = [
    ("¿Qué hace la transformada de Fourier con una imagen de rayas verticales?",
     "Concentra la energía en dos puntos sobre el **eje horizontal** del espectro: las rayas verticales varían solo en *x*."),
    ("¿Cómo se elige el umbral con el método de Otsu?",
     "Prueba todos los umbrales y se queda con el que **maximiza la varianza entre clases** (objeto y fondo)."),
    ("Compara Sobel, Prewitt y Canny para detectar bordes",
     "| | Sobel | Prewitt | Canny |\n|---|---|---|---|\n| Ruido | Medio | Alto | Bajo |\n| Bordes finos | No | No | Sí |"),
    ("¿Qué entra en el próximo examen?",
     "Del tema 3 al 6: histograma, filtrado espacial, filtros de orden y Fourier."),
    ("¿Cuál es la diferencia entre apertura y cierre?",
     "La **apertura** (erosión → dilatación) quita objetos pequeños; el **cierre** (dilatación → erosión) rellena huecos."),
    ("Explícame la ecualización de histograma paso a paso",
     "1. Calcula el histograma.\n2. Normalízalo.\n3. Acumúlalo.\n4. Multiplica por 255 y redondea."),
    ("¿Para qué sirve la corrección gamma?",
     "Ajusta el brillo de forma no lineal: con γ < 1 aclara los tonos oscuros sin saturar los claros."),
    ("¿Qué es una vecindad N8?",
     "Los 8 pixeles que rodean a uno: arriba, abajo, a los lados y en las diagonales."),
    ("¿Por qué el laplaciano realza los bordes?",
     "Es una segunda derivada: responde fuerte donde la intensidad **cambia de golpe** y vale cero en zonas planas."),
    ("¿HSV o RGB para segmentar por color?",
     "**HSV**: separa el tono (H) del brillo (V), así que la sombra no cambia el color que buscas."),
    ("Dame un ejercicio de convolución con una máscara 3×3",
     "Aplica la máscara de promedio a esta vecindad y calcula el pixel central: `[10, 20, 30; 40, 50, 60; 70, 80, 90]`."),
    ("¿Qué diferencia hay entre filtro pasa bajas y pasa altas?",
     "El **pasa bajas** suaviza (deja pasar lo que cambia lento); el **pasa altas** realza bordes y detalle."),
    ("¿Cómo se calcula cuánto pesa una imagen de 1024×768 a 8 bits?",
     "1024 × 768 × 8 / 8 = **786,432 bytes** (unos 768 KB)."),
    ("Resúmeme la clase de morfología",
     "Erosión, dilatación, apertura y cierre con un **elemento estructurante**; se aplican sobre imágenes binarias."),
    ("¿Qué es el aliasing en una imagen?",
     "Patrones falsos que aparecen al **muestrear por debajo** del doble de la frecuencia más alta."),
    ("¿Por qué el filtro gaussiano deja menos artefactos que el promedio?",
     "Pesa más a los vecinos cercanos y su respuesta en frecuencia no tiene lóbulos: no aparece el efecto de anillos."),
    ("¿Qué significa que un histograma sea bimodal?",
     "Que tiene **dos picos**: normalmente objeto y fondo. Es el caso ideal para umbralizar."),
    ("Explica la detección de bordes de Canny en 4 pasos",
     "1. Suavizado gaussiano.\n2. Gradiente.\n3. Supresión de no máximos.\n4. Histéresis con dos umbrales."),
    ("¿Cómo quito el ruido periódico de una foto escaneada?",
     "En el espectro de Fourier aparece como **picos aislados**: un filtro *notch* los elimina."),
    ("Hazme un repaso del tema 4 para el parcial",
     "Convolución, máscaras de suavizado y de realce, y el manejo de los bordes de la imagen (relleno con ceros o espejo)."),
]

# Modelo, peso en un día normal y rango de costo por consulta (USD).
MODELOS = [
    ("claude-sonnet-5-5", 78, (0.018, 0.095)),
    ("claude-haiku-5-5", 18, (0.003, 0.012)),
    ("claude-opus-5-5", 0, (0.22, 0.75)),
]


def _elegir(opciones, pesos):
    return azar.choices(opciones, weights=pesos, k=1)[0]


def _hora_de_dia(dia_local: datetime) -> datetime:
    """Una hora de estudio verosímil (de 8:00 a 23:30, más por la tarde) en UTC."""
    hora = _elegir(list(range(8, 24)), [1, 2, 3, 3, 2, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 2])
    local = dia_local.replace(hour=hora, minute=azar.randrange(60), second=azar.randrange(60))
    return local - DESFASE_LOCAL


def _consulta(usuario: db.Usuario, cuando: datetime, pregunta: str, respuesta: str, modelo: str, costo: float,
              estado: str = "completa") -> dict:
    entrada = azar.randint(1200, 4200)
    salida = azar.randint(350, 1400)
    return {
        "creado_en": cuando.isoformat(),
        "usuario_id": usuario.id,
        "conversacion_id": f"c-{uuid.uuid4().hex[:10]}",
        "perfil": "consulta",
        "motor": "sdk",
        "pregunta": pregunta,
        "respuesta": respuesta if estado == "completa" else None,
        "costo_usd": round(costo, 4),
        "vueltas": azar.randint(2, 6),
        "duracion_ms": azar.randint(6000, 38000),
        "tokens": {"entrada": entrada, "salida": salida, "cacheLectura": entrada * azar.randint(6, 14), "cacheEscritura": azar.randint(0, 3000)},
        "herramientas": ["Grep", "Read", "Read"] if azar.random() < 0.7 else ["Glob", "Read"],
        "modelo": modelo,
        "estado": estado,
        "error": "El agente dejó de responder." if estado == "error" else None,
    }


def crear_consultas(personas: dict[str, db.Usuario]) -> int:
    nombres = [p[0] for p in PERSONAS]
    pesos = [p[2] for p in PERSONAS]
    hoy_local = (AHORA + DESFASE_LOCAL).replace(hour=0, minute=0, second=0)
    # Días de entrega o repaso: más consultas y alguna con Opus.
    dias_pico = {3, 9, 15, 22, 27}
    filas: list[dict] = []
    for atras in range(29, -1, -1):
        dia = hoy_local - timedelta(days=atras)
        base = 4 if dia.weekday() >= 5 else 8
        cantidad = base + azar.randint(0, 6) + (14 if atras in dias_pico else 0)
        for _ in range(cantidad):
            cuando = _hora_de_dia(dia)
            if cuando > AHORA - timedelta(minutes=20):
                continue
            # Opus solo en los días pico: ahí alguien pidió algo largo.
            pesos_modelo = [72, 18, 10] if atras in dias_pico else [m[1] for m in MODELOS[:2]] + [0]
            modelo, _, (bajo, alto) = _elegir(MODELOS, pesos_modelo)
            estado = _elegir(["completa", "error", "cancelada"], [96, 1.5, 2.5])
            costo = azar.uniform(bajo, alto) * (0.4 if estado != "completa" else 1)
            pregunta, respuesta = azar.choice(PREGUNTAS)
            filas.append(_consulta(personas[_elegir(nombres, pesos)], cuando, pregunta, respuesta, modelo, costo, estado))

    # Las más recientes, a mano: lo primero que se ve en la Auditoría.
    recientes = [
        ("Camila Rojas", 48, PREGUNTAS[11], 0.0391),
        ("Valeria Cruz", 41, PREGUNTAS[0], 0.0602),
        ("Sofía Ramos", 33, PREGUNTAS[0], 0.0654),
        ("Valeria Cruz", 29, PREGUNTAS[2], 0.0380),
        ("Luis Ortega", 18, PREGUNTAS[3], 0.0483),
    ]
    for nombre, minutos, (pregunta, respuesta), costo in recientes:
        estado = "cancelada" if pregunta == PREGUNTAS[2][0] else "completa"
        filas.append(_consulta(personas[nombre], AHORA - timedelta(minutes=minutos), pregunta, respuesta,
                               "claude-sonnet-5-5", costo, estado))
    filas.append(_consulta(personas["Diego Herrera"], AHORA - timedelta(minutes=12), PREGUNTA_MEDIANA,
                           RESPUESTA_MEDIANA, "claude-sonnet-5-5", 0.0469))

    filas.sort(key=lambda f: f["creado_en"])
    with db.conexion() as con:
        for fila in filas:
            campos = db._serializar(fila)
            columnas = ", ".join(campos)
            marcas = ", ".join("?" for _ in campos)
            con.execute(f"INSERT INTO consultas ({columnas}) VALUES ({marcas})", tuple(campos.values()))
    return len(filas)


# ── Historial del chat de la cuenta admin ───────────────────────────────────


def _iso(momento: datetime) -> str:
    return momento.isoformat().replace("+00:00", "Z")


def _mensaje(rol: str, contenido: str, cuando: datetime, **extra) -> dict:
    return {"id": f"m-{uuid.uuid4().hex[:10]}", "rol": rol, "contenido": contenido, "creadoEn": _iso(cuando), **extra}


def _paso(nombre: str, descripcion: str) -> dict:
    return {"tipo": "paso", "id": f"p-{uuid.uuid4().hex[:8]}", "clase": "herramienta", "nombre": nombre,
            "descripcion": descripcion, "detalle": None, "estado": "listo", "dentroDe": None}


def _conversacion(cid: str, usuario: db.Usuario, titulo: str, cuando: datetime, pares: list[tuple[str, str]],
                  **extra) -> dict:
    mensajes = []
    momento = cuando
    for pregunta, respuesta in pares:
        mensajes.append(_mensaje("usuario", pregunta, momento))
        momento += timedelta(seconds=azar.randint(8, 25))
        mensajes.append(_mensaje("asistente", respuesta, momento, pensoMs=azar.randint(3000, 9000),
                                 proceso=[_paso("Grep", "Buscando en los apuntes"), _paso("Read", "Leyendo los apuntes del tema")]))
        momento += timedelta(minutes=azar.randint(1, 4))
    return {"id": cid, "usuarioId": usuario.id, "titulo": titulo, "mensajes": mensajes, "perfil": "consulta",
            "creadoEn": _iso(cuando), "ultimoMensajeEn": mensajes[-1]["creadoEn"], **extra}


ID_CONVERSACION_MEDIANA = "c-demo-mediana"


def crear_historial(admin: db.Usuario) -> None:
    hace = lambda **k: AHORA - timedelta(**k)  # noqa: E731
    p = dict(PREGUNTAS)
    conversaciones = [
        _conversacion("c-demo-repaso", admin, "Repaso para el examen parcial", hace(days=3, hours=2),
                      [("Hazme un repaso del tema 4 para el parcial", p["Hazme un repaso del tema 4 para el parcial"]),
                       ("¿Qué entra en el próximo examen?", p["¿Qué entra en el próximo examen?"])], fijada=True),
        _conversacion("c-demo-hsv", admin, "HSV contra RGB", hace(days=6, hours=1),
                      [("¿HSV o RGB para segmentar por color?", p["¿HSV o RGB para segmentar por color?"])]),
        _conversacion("c-demo-fourier", admin, "Fourier con rayas verticales", hace(days=5, hours=3),
                      [(PREGUNTAS[0][0], PREGUNTAS[0][1])]),
        _conversacion("c-demo-otsu", admin, "Método de Otsu", hace(days=4, hours=5),
                      [(PREGUNTAS[1][0], PREGUNTAS[1][1])]),
        _conversacion("c-demo-morfologia", admin, "Apertura y cierre en morfología", hace(days=1, hours=2),
                      [(PREGUNTAS[4][0], PREGUNTAS[4][1])]),
        _conversacion("c-demo-ecualizacion", admin, "Ecualización de histograma paso a paso", hace(days=1, hours=1),
                      [(PREGUNTAS[5][0], PREGUNTAS[5][1])]),
    ]

    # La conversación abierta en las capturas del chat.
    inicio = hace(minutes=9)
    proceso = [
        {"tipo": "pensamiento", "texto": "Es una pregunta conceptual: busco dónde se explicó la mediana en clase y en los apuntes del tema 5."},
        _paso("Grep", "Buscando «mediana» en las clases y los apuntes"),
        _paso("Read", "Leyendo la transcripción de la Clase 5"),
        _paso("Read", "Leyendo los apuntes del Tema 5"),
    ]
    conversaciones.append({
        "id": ID_CONVERSACION_MEDIANA,
        "usuarioId": admin.id,
        "titulo": "Mediana contra ruido sal y pimienta",
        "perfil": "consulta",
        "creadoEn": _iso(inicio),
        "ultimoMensajeEn": _iso(inicio + timedelta(seconds=19)),
        "mensajes": [
            _mensaje("usuario", PREGUNTA_MEDIANA, inicio),
            _mensaje("asistente", RESPUESTA_MEDIANA, inicio + timedelta(seconds=19), pensoMs=6200, proceso=proceso),
        ],
    })
    for conversacion in conversaciones:
        db.guardar_conversacion(admin.id, conversacion["id"], conversacion)


def main() -> None:
    raiz = Path(sys.argv[1])
    crear_agente(raiz)
    db.iniciar()
    personas = crear_personas()
    total = crear_consultas(personas)
    crear_historial(personas["Ana Torres"])
    print(f"Datos de demostración listos: {len(personas)} cuentas, {total} consultas, historial de {CORREO_ADMIN}.")


if __name__ == "__main__":
    main()
