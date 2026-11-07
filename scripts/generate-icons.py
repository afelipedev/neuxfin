"""Gera os ícones do PWA a partir da marca NeuxFin (mesmo desenho de LogoMark).

Uso: python3 scripts/generate-icons.py   (requer Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

TEAL = (38, 200, 166, 255)      # --primary
INK = (4, 36, 29, 255)          # --primary-foreground
OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 4  # supersampling para bordas suaves

# Traços no grid de 32 — iguais ao SVG do LogoMark ("N" + seta de alta)
STROKE = 3.2
POLYLINES = [
    [(9.5, 23), (9.5, 10.5), (20.5, 21.5), (20.5, 9)],
    [(16.6, 12.6), (20.5, 8.7), (24.4, 12.6)],
]


def draw(size: int, *, rounded: bool, content_scale: float = 1.0) -> Image.Image:
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(big * 9 / 32) if rounded else 0
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=TEAL)
    unit = big / 32 * content_scale
    offset = (big - 32 * unit) / 2
    width = STROKE * unit
    r = width / 2
    for line in POLYLINES:
        pts = [(offset + x * unit, offset + y * unit) for x, y in line]
        d.line(pts, fill=INK, width=round(width))
        # pontas e junções arredondadas (stroke-linecap/linejoin="round")
        for px, py in pts:
            d.ellipse([px - r, py - r, px + r, py + r], fill=INK)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192, rounded=True).save(OUT / "icon-192.png")
    draw(512, rounded=True).save(OUT / "icon-512.png")
    # Maskable: fundo sangrado e conteúdo dentro da zona segura (80%)
    draw(512, rounded=False, content_scale=0.8).save(OUT / "maskable-512.png")
    # iOS aplica a própria máscara: quadrado cheio
    draw(180, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
    print("ícones gerados em", OUT)


if __name__ == "__main__":
    main()
