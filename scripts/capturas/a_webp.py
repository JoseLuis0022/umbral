"""Marcos PNG → WebP con fondo transparente, recortados y verificados.

    python a_webp.py <carpeta de marcos PNG> <carpeta destino>

Por cada PNG: limpia el alfa casi nulo de la cola de la sombra (< 2/255, que
no se ve pero agranda la imagen), recorta a lo visible más un margen
transparente y guarda WebP (calidad 86, alfa 90). Después vuelve a abrir el
WebP y comprueba que las cuatro orillas tengan alfa 0: si la sombra quedara
cortada, falla. Solo necesita Pillow.
"""

import sys
from pathlib import Path

from PIL import Image

NOMBRES = (
    "mac-chat", "mac-tablero", "mac-auditoria", "mac-corpus",
    "iphone-chat", "iphone-tablero", "ipad-chat", "ipad-tablero",
)
MARGEN = 12  # px transparentes alrededor de lo visible
CALIDAD = 86
CALIDAD_ALFA = 90


def orillas_transparentes(imagen: Image.Image) -> bool:
    alfa = imagen.getchannel("A")
    ancho, alto = alfa.size
    franjas = [(0, 0, ancho, 1), (0, alto - 1, ancho, alto), (0, 0, 1, alto), (ancho - 1, 0, ancho, alto)]
    return all(alfa.crop(caja).getextrema()[1] == 0 for caja in franjas)


def convertir(origen: Path, destino: Path) -> None:
    imagen = Image.open(origen).convert("RGBA")
    alfa = imagen.getchannel("A").point(lambda a: 0 if a < 2 else a)
    imagen.putalpha(alfa)
    # Donde no hay nada, color neutro: evita halos de color al comprimir.
    imagen = Image.composite(imagen, Image.new("RGBA", imagen.size, (0, 0, 0, 0)), alfa)

    caja = alfa.getbbox()
    if caja is None:
        raise SystemExit(f"{origen.name}: la imagen está vacía.")
    izquierda, arriba, derecha, abajo = caja
    if izquierda == 0 or arriba == 0 or derecha == imagen.width or abajo == imagen.height:
        raise SystemExit(f"{origen.name}: la sombra toca la orilla del lienzo; agranda el margen en marco.html.")
    caja = (max(0, izquierda - MARGEN), max(0, arriba - MARGEN),
            min(imagen.width, derecha + MARGEN), min(imagen.height, abajo + MARGEN))
    recortada = imagen.crop(caja)
    recortada.save(destino, "WEBP", quality=CALIDAD, alpha_quality=CALIDAD_ALFA, method=6)

    final = Image.open(destino).convert("RGBA")
    if not orillas_transparentes(final):
        raise SystemExit(f"{destino.name}: las orillas no son transparentes.")
    print(f"  {destino.name}: {final.width}×{final.height} px, {destino.stat().st_size / 1024:.0f} KB, orillas con alfa 0")


def main() -> None:
    origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
    destino.mkdir(parents=True, exist_ok=True)
    for nombre in NOMBRES:
        convertir(origen / f"{nombre}.png", destino / f"{nombre}.webp")


if __name__ == "__main__":
    main()
