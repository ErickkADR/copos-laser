# Converte a 1ª página de um PDF vetorial em SVG (texto vira curva), com PyMuPDF.
#   python3 scripts/pdf-to-svg.py assets-src/arte/boiadeira.pdf assets-src/arte/boiadeira.svg
# Alternativas se não houver PyMuPDF: pdftocairo -svg (poppler) ou mutool convert -F svg.
import sys
import fitz  # PyMuPDF

src, dst = sys.argv[1], sys.argv[2]
page = fitz.open(src)[0]
r = page.rect
open(dst, "w").write(page.get_svg_image(text_as_path=True))
print(f"{src}: {r.width:.1f} x {r.height:.1f} pt = {r.width/72*25.4:.1f} x {r.height/72*25.4:.1f} mm")
