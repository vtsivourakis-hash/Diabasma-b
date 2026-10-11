from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor

import os
# Γραμματοσειρές με ελληνικά: Linux (DejaVu) ή macOS (Arial)
FONT_PAIRS = [
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ("/Library/Fonts/Arial.ttf", "/Library/Fonts/Arial Bold.ttf"),
]
regular, bold = next(((r, b) for r, b in FONT_PAIRS if os.path.exists(r) and os.path.exists(b)), (None, None))
if not regular:
    raise SystemExit("Δεν βρέθηκε γραμματοσειρά με ελληνικά. Βάλε τη διαδρομή μιας TTF στο FONT_PAIRS.")
pdfmetrics.registerFont(TTFont("DV", regular))
pdfmetrics.registerFont(TTFont("DVB", bold))

import sys
URL = sys.argv[1] if len(sys.argv) > 1 else "https://vtsivourakis-hash.github.io/Diabasma-b/"
INK = HexColor("#1F3A93"); MUTED = HexColor("#5B6475"); GRID = HexColor("#E6ECF6")
MARK = HexColor("#FFE15A"); TEXT = HexColor("#1E2430"); CUT = HexColor("#B8C2D3")

W, H = A4
COLS, ROWS = 2, 4
CW, CH = W / COLS, H / ROWS
PAD = 9 * mm

body = ParagraphStyle("b", fontName="DV", fontSize=8.6, leading=11.6, textColor=TEXT)
small = ParagraphStyle("s", fontName="DV", fontSize=8, leading=10.5, textColor=MUTED)
sign = ParagraphStyle("g", fontName="DVB", fontSize=9, leading=12, textColor=INK)

def card(c, x, y):
    # light grid (notebook paper)
    c.saveState()
    p = c.beginPath(); p.rect(x, y, CW, CH); c.clipPath(p, stroke=0)
    c.setStrokeColor(GRID); c.setLineWidth(0.4)
    step = 5 * mm
    gx = x
    while gx <= x + CW: c.line(gx, y, gx, y + CH); gx += step
    gy = y
    while gy <= y + CH: c.line(x, gy, x + CW, gy); gy += step
    c.restoreState()

    # QR on white
    qs = 42 * mm
    qx, qy = x + PAD, y + CH - PAD - qs
    c.setFillColorRGB(1, 1, 1); c.rect(qx - 1.5*mm, qy - 1.5*mm, qs + 3*mm, qs + 3*mm, stroke=0, fill=1)
    w = qr.QrCodeWidget(URL, barLevel="M")
    b = w.getBounds(); bw, bh = b[2] - b[0], b[3] - b[1]
    d = Drawing(qs, qs, transform=[qs / bw, 0, 0, qs / bh, 0, 0]); d.add(w)
    renderPDF.draw(d, c, qx, qy)

    # Title with highlighter
    tx = qx + qs + 6 * mm
    ty = y + CH - PAD - 5 * mm
    c.setFillColor(INK); c.setFont("DVB", 15)
    c.drawString(tx, ty, "Διάβασμα")
    t2 = "Β΄ Γυμνασίου"
    t2w = pdfmetrics.stringWidth(t2, "DVB", 15)
    c.setFillColor(MARK); c.rect(tx - 1, ty - 7.6*mm, t2w + 2, 3.2*mm, stroke=0, fill=1)
    c.setFillColor(INK); c.drawString(tx, ty - 6.6*mm, t2)

    fw = x + CW - PAD - tx
    f = Frame(tx, qy - 1*mm, fw, ty - 9*mm - (qy - 1*mm), leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, showBoundary=0)
    f.addFromList([
        Paragraph("Περίληψη, κάρτες επανάληψης και λυμένες ασκήσεις για Φυσική, Μαθηματικά και Αρχαία.", body),
        Paragraph("&nbsp;", small),
        Paragraph("Σκάναρε με την κάμερα του κινητού.", small),
    ], c)
    c.setFillColor(INK); c.setFont("DVB", 9.5)
    c.drawString(x + PAD, y + PAD + 2.2*mm, "Από τον Νίκο, για την τάξη μας.")

    # URL along the bottom
    c.setFillColor(MUTED); c.setFont("DV", 7.2)
    c.drawString(x + PAD, y + PAD - 2.5*mm, URL.replace("https://", ""))

c = canvas.Canvas("qr-kartelakia.pdf", pagesize=A4)
c.setTitle("Διάβασμα Β΄ Γυμνασίου: καρτελάκια με QR")
for r in range(ROWS):
    for col in range(COLS):
        card(c, col * CW, H - (r + 1) * CH)
# cut lines
c.setStrokeColor(CUT); c.setLineWidth(0.6); c.setDash(3, 3)
for col in range(1, COLS): c.line(col * CW, 0, col * CW, H)
for r in range(1, ROWS): c.line(0, r * CH, W, r * CH)
c.save()
print("ok")
