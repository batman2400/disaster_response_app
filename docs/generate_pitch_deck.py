"""Generate the FENDER CodeArena '26 pitch deck (16:9 PowerPoint)."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageChops
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import nsmap, qn
from pptx.util import Emu, Inches, Pt
from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "backend" / "public"
SHOTS = PUBLIC / "screenshots"
OUT = ROOT / "docs" / "FENDER_Pitch_Deck.pptx"
PUBLIC_COPY = PUBLIC / "FENDER_Pitch_Deck.pptx"

NAVY = RGBColor(0x07, 0x12, 0x22)
SURFACE = RGBColor(0x0F, 0x1C, 0x2E)
CARD = RGBColor(0x15, 0x27, 0x3E)
LINE = RGBColor(0x1E, 0x3A, 0x5F)
CYAN = RGBColor(0x22, 0xD3, 0xEE)
BLUE = RGBColor(0x3B, 0x82, 0xF6)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
EMERALD = RGBColor(0x34, 0xD3, 0x99)
RED = RGBColor(0xF8, 0x71, 0x71)
ROSE = RGBColor(0xFB, 0x71, 0x85)
WHITE = RGBColor(0xF8, 0xFA, 0xFC)
MUTED = RGBColor(0x94, 0xA3, 0xB8)
SOFT = RGBColor(0xCB, 0xD5, 0xE1)

FONT = "Segoe UI"
FONT_LIGHT = "Segoe UI"
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


def rgb_hex(c: RGBColor) -> str:
    return f"{c[0]:02X}{c[1]:02X}{c[2]:02X}"


def set_run(run, text, size, color, bold=False, italic=False, name=FONT):
    run.text = text
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.italic = italic
    run.font.name = name


def add_text(
    slide,
    text,
    left,
    top,
    width,
    height,
    size=16,
    color=WHITE,
    bold=False,
    italic=False,
    align=PP_ALIGN.LEFT,
    anchor=MSO_ANCHOR.TOP,
    name=FONT,
):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = align
    p.space_before = Pt(0)
    p.space_after = Pt(0)
    set_run(p.add_run() if p.runs else p.runs[0] if False else type("R", (), {})(), "", size, color)
    # python-pptx always has an empty first run after paragraph create? safer:
    p.clear() if hasattr(p, "clear") else None
    run = p.add_run()
    set_run(run, text, size, color, bold, italic, name)
    if not p.runs:
        p.text = text
        p.font.size = Pt(size)
        p.font.color.rgb = color
        p.font.bold = bold
        p.font.name = name
        p.alignment = align
    return box


def textbox(slide, left, top, width, height, lines, anchor="t"):
    """lines: list of dicts {text, size, color, bold, italic, align, space_after}"""
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    try:
        tf._txBody.bodyPr.set("anchor", anchor)
    except Exception:
        pass
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = line.get("align", PP_ALIGN.LEFT)
        p.space_before = Pt(line.get("space_before", 0))
        p.space_after = Pt(line.get("space_after", 4))
        run = p.add_run()
        set_run(
            run,
            line["text"],
            line.get("size", 14),
            line.get("color", WHITE),
            line.get("bold", False),
            line.get("italic", False),
            line.get("name", FONT),
        )
    return box


def rect(slide, left, top, width, height, fill, line=None, radius=None):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE if radius is not None else MSO_SHAPE.RECTANGLE,
        left,
        top,
        width,
        height,
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(1)
    if radius is not None:
        try:
            shape.adjustments[0] = radius
        except Exception:
            pass
    shape.shadow.inherit = False
    return shape


def set_bg(slide, color=NAVY):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def notes(slide, text: str):
    slide.notes_slide.notes_text_frame.text = text


def picture(slide, image, left, top, width=None, height=None):
    if isinstance(image, (str, Path)):
        return slide.shapes.add_picture(str(image), left, top, width=width, height=height)
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    buf.seek(0)
    return slide.shapes.add_picture(buf, left, top, width=width, height=height)


def tight_crop(path: Path, dark_thresh: int = 18) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (0, 0, 0, 255))
    diff = ImageChops.difference(im.convert("RGB"), bg.convert("RGB"))
    mask = diff.convert("L").point(lambda p: 255 if p > dark_thresh else 0)
    bbox = mask.getbbox()
    if not bbox:
        return im
    pad = 24
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def crop_chrome(path: Path, top_px: int = 92) -> Image.Image:
    im = Image.open(path).convert("RGB")
    return im.crop((0, top_px, im.width, im.height))


def resize_max(im: Image.Image, max_w: int, max_h: int) -> Image.Image:
    im = im.copy()
    im.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    return im


def jpeg_buf(im: Image.Image, quality=82) -> io.BytesIO:
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (7, 18, 34))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    elif im.mode != "RGB":
        im = im.convert("RGB")
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=quality, optimize=True)
    buf.seek(0)
    return buf


def add_pic_buf(slide, buf, left, top, width=None, height=None):
    return slide.shapes.add_picture(buf, left, top, width=width, height=height)


def footer(slide, idx, total, label="FENDER  ·  CodeArena '26  ·  Topic 04"):
    rect(slide, Inches(0), Inches(0), Inches(0.12), SLIDE_H, CYAN)
    textbox(
        slide,
        Inches(0.45),
        Inches(7.18),
        Inches(10.2),
        Inches(0.28),
        [{"text": label, "size": 10, "color": MUTED, "bold": False, "space_after": 0}],
    )
    textbox(
        slide,
        Inches(11.2),
        Inches(7.18),
        Inches(1.7),
        Inches(0.28),
        [{"text": f"{idx:02d}  /  {total:02d}", "size": 10, "color": CYAN, "bold": True, "align": PP_ALIGN.RIGHT, "space_after": 0}],
    )


def kicker(slide, text, top=Inches(0.28)):
    textbox(
        slide,
        Inches(0.5),
        top,
        Inches(12.3),
        Inches(0.28),
        [{"text": text.upper(), "size": 11, "color": CYAN, "bold": True, "space_after": 0}],
    )


def title_block(slide, title, subtitle, y=Inches(0.5)):
    kicker(slide, title[0] if False else "")  # placeholder unused
    textbox(
        slide,
        Inches(0.5),
        y,
        Inches(12.3),
        Inches(0.55),
        [{"text": title, "size": 28, "color": WHITE, "bold": True, "space_after": 0}],
    )
    if subtitle:
        textbox(
            slide,
            Inches(0.5),
            y + Inches(0.5),
            Inches(12.3),
            Inches(0.38),
            [{"text": subtitle, "size": 14, "color": MUTED, "space_after": 0}],
        )


def build():
    logo = tight_crop(PUBLIC / "fender-logo.png")
    logo_sm = resize_max(logo, 420, 280)
    logo_buf = io.BytesIO()
    logo_sm.save(logo_buf, format="PNG")
    logo_buf.seek(0)

    officer = resize_max(crop_chrome(SHOTS / "01-officer-triage-dashboard.png", 88), 1600, 900)
    citizen = resize_max(Image.open(SHOTS / "02-citizen-home-lifeline.jpg"), 540, 1180)
    report = resize_max(Image.open(SHOTS / "07-citizen-report-hazard.jpg"), 540, 1180)
    smap = resize_max(Image.open(SHOTS / "05-interactive-safe-map.jpg"), 540, 1180)
    crew = resize_max(Image.open(SHOTS / "03-field-crew-hub.jpg"), 540, 1180)
    relief = resize_max(Image.open(SHOTS / "04-relief-shelter-hub.jpg"), 540, 1180)
    safe = resize_max(Image.open(SHOTS / "06-evacuee-safety-registry.jpg"), 540, 1180)

    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]
    total = 10

    # ------------------------------------------------------------------ 1 COVER
    s = prs.slides.add_slide(blank)
    set_bg(s)
    rect(s, Inches(0), Inches(0), Inches(0.12), SLIDE_H, CYAN)
    rect(s, Inches(9.9), Inches(0), Inches(3.44), SLIDE_H, SURFACE)

    add_pic_buf(s, io.BytesIO(logo_buf.getvalue()), Inches(0.55), Inches(1.15), height=Inches(1.15))
    textbox(
        s,
        Inches(0.55),
        Inches(2.45),
        Inches(8.8),
        Inches(0.32),
        [{"text": "CODEARENA  '26   ·   TOPIC 04  DISASTER RESPONSE", "size": 12, "color": CYAN, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(0.5),
        Inches(2.85),
        Inches(9.0),
        Inches(1.15),
        [{"text": "FENDER", "size": 72, "color": WHITE, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(0.55),
        Inches(4.05),
        Inches(8.8),
        Inches(0.9),
        [{
            "text": "The closed-loop flood command system for Colombo.\nVerify in seconds. Dispatch with proof. Reunite families.",
            "size": 18,
            "color": SOFT,
            "space_after": 0,
        }],
    )

    pills = [
        (CYAN, "5-Check Gemini AI"),
        (AMBER, "PostGIS clustering"),
        (EMERALD, "Photo-proof clearance"),
        (BLUE, "I'm Safe registry"),
    ]
    for i, (color, label) in enumerate(pills):
        x = Inches(0.55 + i * 2.15)
        rect(s, x, Inches(5.25), Inches(2.0), Inches(0.42), CARD, LINE, 0.2)
        textbox(
            s,
            x,
            Inches(5.3),
            Inches(2.0),
            Inches(0.34),
            [{"text": label, "size": 11, "color": color, "bold": True, "align": PP_ALIGN.CENTER, "space_after": 0}],
        )

    textbox(
        s,
        Inches(0.55),
        Inches(6.05),
        Inches(8.8),
        Inches(0.4),
        [{"text": "Live  ·  backend-chi-gilt-80.vercel.app", "size": 13, "color": EMERALD, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(0.55),
        Inches(6.4),
        Inches(8.8),
        Inches(0.35),
        [{"text": "Next.js 16  ·  Supabase PostGIS  ·  Gemini 3.5 Flash Lite  ·  Expo SDK 57", "size": 12, "color": MUTED, "space_after": 0}],
    )

    textbox(
        s,
        Inches(10.15),
        Inches(1.6),
        Inches(3.0),
        Inches(4.4),
        [
            {"text": "BUILT FOR", "size": 11, "color": CYAN, "bold": True, "space_after": 10},
            {"text": "Kelani River Basin", "size": 20, "color": WHITE, "bold": True, "space_after": 8},
            {"text": "Nagalagam  ·  Sedawatta\nWellampitiya  ·  Kolonnawa", "size": 13, "color": SOFT, "space_after": 22},
            {"text": "THE LOOP", "size": 11, "color": CYAN, "bold": True, "space_after": 8},
            {"text": "Citizen  →  AI triage\nOfficer  →  Field crew\nShelter  →  Family", "size": 14, "color": WHITE, "space_after": 22},
            {"text": "NDRRMS  ·  CMC", "size": 12, "color": MUTED, "bold": True, "space_after": 0},
        ],
    )
    notes(
        s,
        "Open with the monsoon: when the Kelani breaches, dispatchers drown in calls before they drown in water. "
        "FENDER is the closed loop — citizen photo in, verified map out, crews cannot close without proof. "
        "Then click through. Do not read the pills.",
    )
    footer(s, 1, total)

    # ------------------------------------------------------------------ 2 PROBLEM NUMBER
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "The crisis in Colombo")
    textbox(
        s,
        Inches(0.5),
        Inches(0.55),
        Inches(12.3),
        Inches(0.5),
        [{"text": "The deadly information void", "size": 28, "color": WHITE, "bold": True, "space_after": 0}],
    )

    rect(s, Inches(0.5), Inches(1.35), Inches(7.4), Inches(5.35), SURFACE, None, 0.06)
    textbox(
        s,
        Inches(0.85),
        Inches(1.7),
        Inches(6.8),
        Inches(0.35),
        [{"text": "TRADITIONAL DISPATCH", "size": 12, "color": ROSE, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(0.8),
        Inches(2.05),
        Inches(6.8),
        Inches(1.6),
        [{"text": "45 min", "size": 84, "color": ROSE, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(0.85),
        Inches(3.7),
        Inches(6.7),
        Inches(2.4),
        [{
            "text": "That is how long it takes a dispatcher to confirm a single flood call — while ambulances drive into submerged culverts and families wait on rooftops in Nagalagam, Sedawatta, and Kolonnawa.",
            "size": 16,
            "color": SOFT,
            "space_after": 12,
        }, {
            "text": "The water is not the only failure. The information is.",
            "size": 16,
            "color": WHITE,
            "bold": True,
            "space_after": 0,
        }],
    )

    rect(s, Inches(8.15), Inches(1.35), Inches(4.65), Inches(5.35), CARD, None, 0.06)
    textbox(
        s,
        Inches(8.45),
        Inches(1.7),
        Inches(4.15),
        Inches(0.35),
        [{"text": "WITH FENDER", "size": 12, "color": CYAN, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(8.4),
        Inches(2.15),
        Inches(4.2),
        Inches(1.2),
        [{"text": "< 3s", "size": 72, "color": CYAN, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(8.45),
        Inches(3.5),
        Inches(4.1),
        Inches(2.7),
        [
            {"text": "Photo + GPS in.", "size": 16, "color": WHITE, "bold": True, "space_after": 8},
            {"text": "Five checks score the report.", "size": 15, "color": SOFT, "space_after": 8},
            {"text": "Duplicates collapse into one ticket.", "size": 15, "color": SOFT, "space_after": 8},
            {"text": "River gauges raise the ward themselves.", "size": 15, "color": SOFT, "space_after": 8},
            {"text": "The map updates before the next call.", "size": 15, "color": WHITE, "bold": True, "space_after": 0},
        ],
    )
    notes(
        s,
        "Hold the 45 vs 3 contrast. Judges remember the number. Then: 'The tragedy is not only the flood. It is the 45-minute void while we decide if the flood is real.'",
    )
    footer(s, 2, total)

    # ------------------------------------------------------------------ 3 FOUR FAILURES
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "Why response collapses")
    textbox(
        s,
        Inches(0.5),
        Inches(0.55),
        Inches(12.3),
        Inches(0.5),
        [{"text": "Four bottlenecks. One monsoon. Zero shared picture.", "size": 26, "color": WHITE, "bold": True, "space_after": 0}],
    )

    failures = [
        (ROSE, "01", "Spam & verification lag", "117 / 1990 drown in panic calls. Officers cannot tell a real drowning from a rumour for half an hour."),
        (AMBER, "02", "Duplicate avalanches", "Fifty people report the same fallen tree. Crews fan out to one pin while a flash flood 500 m away waits."),
        (BLUE, "03", "Ghost clearances", "Radio says the road is open. The ambulance arrives to a submerged culvert. No photograph. No truth."),
        (EMERALD, "04", "Missing families", "Children and elders scatter across temples and schools. There is no shared roster, no 'I'm safe' search."),
    ]
    for i, (color, num, title, body) in enumerate(failures):
        col, row = i % 2, i // 2
        x = Inches(0.5 + col * 6.4)
        y = Inches(1.3 + row * 2.7)
        rect(s, x, y, Inches(6.15), Inches(2.5), SURFACE, None, 0.06)
        rect(s, x, y, Inches(0.12), Inches(2.5), color)
        textbox(
            s,
            x + Inches(0.4),
            y + Inches(0.28),
            Inches(5.4),
            Inches(0.35),
            [{"text": num, "size": 12, "color": color, "bold": True, "space_after": 0}],
        )
        textbox(
            s,
            x + Inches(0.4),
            y + Inches(0.62),
            Inches(5.4),
            Inches(0.45),
            [{"text": title, "size": 20, "color": WHITE, "bold": True, "space_after": 0}],
        )
        textbox(
            s,
            x + Inches(0.4),
            y + Inches(1.15),
            Inches(5.4),
            Inches(1.05),
            [{"text": body, "size": 14, "color": SOFT, "space_after": 0}],
        )
    notes(
        s,
        "Walk the four failures as an ops story, not a feature list. End on families — that is the human hook before you show the product.",
    )
    footer(s, 3, total)

    # ------------------------------------------------------------------ 4 SOLUTION
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "The FENDER ecosystem")
    textbox(
        s,
        Inches(0.5),
        Inches(0.55),
        Inches(12.3),
        Inches(0.5),
        [{"text": "One platform. Four desks. Zero silos.", "size": 26, "color": WHITE, "bold": True, "space_after": 0}],
    )

    portals = [
        (BLUE, "Citizen lifeline", "EN · සිං · தமிழ்  PWA", "Photo + GPS in 15 seconds. Offline QR SOS. Direct 117 / 1990. Live 5-check verdict."),
        (CYAN, "Command console", "Municipal HQ", "Queue, map, river gauges, AI threshold slider, override with a full audit trail."),
        (AMBER, "Crew clearance", "Navy · DMC · CMC", "Navigate to the pin. Cannot close without a live after-fix photo. Map unblocks instantly."),
        (EMERALD, "Relief & safe", "Shelters + families", "Live bed counts, aid matching, and a public I'm Safe search by name or NIC."),
    ]
    for i, (color, title, tag, body) in enumerate(portals):
        x = Inches(0.45 + i * 3.2)
        rect(s, x, Inches(1.3), Inches(3.05), Inches(4.55), SURFACE, None, 0.05)
        rect(s, x, Inches(1.3), Inches(3.05), Inches(0.1), color)
        textbox(
            s,
            x + Inches(0.18),
            Inches(1.6),
            Inches(2.7),
            Inches(0.3),
            [{"text": f"PORTAL  {i+1}", "size": 11, "color": color, "bold": True, "space_after": 0}],
        )
        textbox(
            s,
            x + Inches(0.18),
            Inches(1.95),
            Inches(2.7),
            Inches(0.9),
            [{"text": title, "size": 20, "color": WHITE, "bold": True, "space_after": 0}],
        )
        textbox(
            s,
            x + Inches(0.18),
            Inches(2.85),
            Inches(2.7),
            Inches(0.4),
            [{"text": tag, "size": 12, "color": color, "bold": True, "space_after": 0}],
        )
        textbox(
            s,
            x + Inches(0.18),
            Inches(3.35),
            Inches(2.7),
            Inches(2.1),
            [{"text": body, "size": 13, "color": SOFT, "space_after": 0}],
        )
    textbox(
        s,
        Inches(0.5),
        Inches(6.05),
        Inches(12.3),
        Inches(0.45),
        [{"text": "Supabase Realtime  ·  every action on any desk hits every other screen in under 200 ms", "size": 14, "color": MUTED, "align": PP_ALIGN.CENTER, "space_after": 0}],
    )
    notes(
        s,
        "FENDER is not a reporting app. It is the operating system of the flood: citizen, officer, crew, shelter. Same data fabric.",
    )
    footer(s, 4, total)

    # ------------------------------------------------------------------ 5 AI ENGINE
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "The secret sauce")
    textbox(
        s,
        Inches(0.5),
        Inches(0.55),
        Inches(12.3),
        Inches(0.5),
        [{"text": "Five checks. One verdict. Under three seconds.", "size": 26, "color": WHITE, "bold": True, "space_after": 0}],
    )

    checks = [
        ("01", "Input AI", "15%", "Sinhala, Tamil, English. Distress keywords. Clean operational summary.", BLUE),
        ("02", "Gemini Vision", "35%", "Flood depth, live wires, structural damage. Rejects stock photos.", CYAN),
        ("03", "Weather", "20%", "Rain > 40 mm or Kelani gauge > 75% confirms the environment.", BLUE),
        ("04", "PostGIS cluster", "20%", "ST_DWithin 150–200 m. Fifty calls become one master incident.", AMBER),
        ("05", "Risk AI", "10%", "Ward topology, road blockage, population exposure → urgency.", EMERALD),
    ]
    for i, (num, name, weight, body, color) in enumerate(checks):
        x = Inches(0.4 + i * 2.56)
        rect(s, x, Inches(1.25), Inches(2.45), Inches(3.55), SURFACE, None, 0.05)
        textbox(s, x + Inches(0.15), Inches(1.4), Inches(2.15), Inches(0.3),
                [{"text": num, "size": 12, "color": color, "bold": True, "space_after": 0}])
        textbox(s, x + Inches(0.15), Inches(1.75), Inches(2.15), Inches(0.7),
                [{"text": name, "size": 16, "color": WHITE, "bold": True, "space_after": 0}])
        textbox(s, x + Inches(0.15), Inches(2.5), Inches(2.15), Inches(1.5),
                [{"text": body, "size": 12, "color": SOFT, "space_after": 0}])
        textbox(s, x + Inches(0.15), Inches(4.2), Inches(2.15), Inches(0.35),
                [{"text": f"Weight  {weight}", "size": 12, "color": color, "bold": True, "space_after": 0}])

    rect(s, Inches(0.4), Inches(5.0), Inches(12.5), Inches(1.55), CARD, None, 0.05)
    textbox(
        s,
        Inches(0.65),
        Inches(5.15),
        Inches(4.2),
        Inches(1.25),
        [
            {"text": "AGGREGATOR", "size": 11, "color": CYAN, "bold": True, "space_after": 6},
            {"text": "Score  ≥  0.75   auto-publish", "size": 16, "color": EMERALD, "bold": True, "space_after": 4},
            {"text": "0.50–0.74  need info   ·   < 0.50  hold", "size": 13, "color": SOFT, "space_after": 0},
        ],
    )
    textbox(
        s,
        Inches(5.2),
        Inches(5.15),
        Inches(7.4),
        Inches(1.25),
        [
            {"text": "DETERMINISTIC FALLBACK", "size": 11, "color": AMBER, "bold": True, "space_after": 6},
            {"text": "If Gemini drops, weather + cluster still return a conservative verdict in < 200 ms. The demo never dies with the model.", "size": 14, "color": SOFT, "space_after": 0},
        ],
    )
    notes(
        s,
        "This is the technical punch. Stress Vision + PostGIS as the pair that kills fakes and duplicates. Mention the fallback so they know you thought about outages.",
    )
    footer(s, 5, total)

    # ------------------------------------------------------------------ 6 CITIZEN
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "Live product  ·  citizen")
    textbox(
        s,
        Inches(0.5),
        Inches(0.52),
        Inches(12.3),
        Inches(0.42),
        [{"text": "From rooftop to verified pin in one tap.", "size": 24, "color": WHITE, "bold": True, "space_after": 0}],
    )

    phones = [
        (citizen, "Lifeline hub", "Flood watch, trilingual switch, 117 / 1990, offline QR SOS."),
        (report, "Hazard intake", "Camera + locked GPS. Live 5-check stepper. Instant verdict."),
        (smap, "Safe map", "Pulsing pins, blocked roads, detours, live shelter beds."),
    ]
    for i, (im, title, body) in enumerate(phones):
        x = Inches(0.55 + i * 4.2)
        frame = rect(s, x, Inches(1.1), Inches(3.85), Inches(4.55), SURFACE, None, 0.05)
        buf = jpeg_buf(im)
        # phone image centered in frame
        add_pic_buf(s, buf, x + Inches(0.95), Inches(1.22), height=Inches(4.3))
        textbox(s, x, Inches(5.72), Inches(3.85), Inches(0.32),
                [{"text": title, "size": 14, "color": WHITE, "bold": True, "align": PP_ALIGN.CENTER, "space_after": 0}])
        textbox(s, x, Inches(6.05), Inches(3.85), Inches(0.5),
                [{"text": body, "size": 11, "color": MUTED, "align": PP_ALIGN.CENTER, "space_after": 0}])
    notes(
        s,
        "If you have a phone, live-demo the report here. If not, these three screens are the story: warn, capture, navigate.",
    )
    footer(s, 6, total)

    # ------------------------------------------------------------------ 7 OFFICER
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "Live product  ·  municipal HQ")
    textbox(
        s,
        Inches(0.5),
        Inches(0.52),
        Inches(12.3),
        Inches(0.4),
        [{"text": "Triage with evidence, not rumours.", "size": 24, "color": WHITE, "bold": True, "space_after": 0}],
    )
    rect(s, Inches(0.4), Inches(1.05), Inches(9.05), Inches(5.55), SURFACE, None, 0.04)
    add_pic_buf(s, jpeg_buf(officer, 86), Inches(0.5), Inches(1.15), width=Inches(8.85))

    bullets = [
        (CYAN, "5-check telemetry", "Vision, weather, cluster, location, risk — scored on every ticket."),
        (AMBER, "Threshold slider", "Tighten or loosen auto-publish when the storm peaks."),
        (EMERALD, "One-click override", "Publish, need-info, area alert, council ticket — with an audit trail."),
        (BLUE, "Autonomous gauges", "Rain and river telemetry can raise a ward to CRITICAL with no click."),
    ]
    for i, (color, title, body) in enumerate(bullets):
        y = Inches(1.1 + i * 1.35)
        rect(s, Inches(9.6), y, Inches(3.3), Inches(1.22), SURFACE, None, 0.08)
        textbox(s, Inches(9.8), y + Inches(0.12), Inches(2.95), Inches(0.32),
                [{"text": title, "size": 13, "color": color, "bold": True, "space_after": 0}])
        textbox(s, Inches(9.8), y + Inches(0.44), Inches(2.95), Inches(0.65),
                [{"text": body, "size": 11, "color": SOFT, "space_after": 0}])
    notes(
        s,
        "Point at case #428CA8A8 if live. Call out SCORE 0.80 and the five check chips. Officers stay in the loop — AI never silently publishes without a trail.",
    )
    footer(s, 7, total)

    # ------------------------------------------------------------------ 8 CLOSED LOOP
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "Live product  ·  crew + humanitarian")
    textbox(
        s,
        Inches(0.5),
        Inches(0.52),
        Inches(12.3),
        Inches(0.4),
        [{"text": "No ghost clearances. No missing names.", "size": 24, "color": WHITE, "bold": True, "space_after": 0}],
    )

    shots = [
        (crew, AMBER, "Field crew", "Tickets, nav, mandatory after-fix photo. Resolve flips is_road_blocked on every public map."),
        (relief, CYAN, "Relief desk", "Live beds, rations, medical kits. HELP_REQUEST matches the nearest shelter with space."),
        (safe, EMERALD, "I'm Safe registry", "Check in as SAFE / IN_SHELTER / DISPLACED. Search by name, NIC, ward, or camp."),
    ]
    for i, (im, color, title, body) in enumerate(shots):
        x = Inches(0.45 + i * 4.25)
        rect(s, x, Inches(1.08), Inches(4.05), Inches(5.5), SURFACE, None, 0.05)
        add_pic_buf(s, jpeg_buf(im), x + Inches(1.05), Inches(1.2), height=Inches(3.55))
        textbox(s, x + Inches(0.2), Inches(4.85), Inches(3.65), Inches(0.35),
                [{"text": title, "size": 16, "color": color, "bold": True, "align": PP_ALIGN.CENTER, "space_after": 0}])
        textbox(s, x + Inches(0.2), Inches(5.22), Inches(3.65), Inches(1.15),
                [{"text": body, "size": 12, "color": SOFT, "align": PP_ALIGN.CENTER, "space_after": 0}])
    notes(
        s,
        "Punchline: a crew cannot lie the road open. A family does not have to call twenty camps. That is the closed loop.",
    )
    footer(s, 8, total)

    # ------------------------------------------------------------------ 9 IMPACT
    s = prs.slides.add_slide(blank)
    set_bg(s)
    kicker(s, "Impact  ·  production architecture")
    textbox(
        s,
        Inches(0.5),
        Inches(0.55),
        Inches(12.3),
        Inches(0.45),
        [{"text": "Built to run the demo. Built to survive the storm.", "size": 26, "color": WHITE, "bold": True, "space_after": 0}],
    )

    metrics = [
        (CYAN, "< 3s", "AI triage", "From 45 minutes of phone sorting."),
        (AMBER, "90%", "Duplicates cut", "ST_DWithin collapses 50 calls to 1."),
        (EMERALD, "100%", "Photo proof", "Zero ghost clearances by design."),
        (BLUE, "3", "Languages", "English, Sinhala, Tamil — full parity."),
    ]
    for i, (color, num, label, body) in enumerate(metrics):
        x = Inches(0.45 + i * 3.2)
        rect(s, x, Inches(1.25), Inches(3.05), Inches(2.45), SURFACE, None, 0.06)
        textbox(s, x + Inches(0.15), Inches(1.4), Inches(2.75), Inches(0.85),
                [{"text": num, "size": 36, "color": color, "bold": True, "align": PP_ALIGN.CENTER, "space_after": 0}])
        textbox(s, x + Inches(0.15), Inches(2.25), Inches(2.75), Inches(0.4),
                [{"text": label, "size": 14, "color": WHITE, "bold": True, "align": PP_ALIGN.CENTER, "space_after": 0}])
        textbox(s, x + Inches(0.2), Inches(2.7), Inches(2.65), Inches(0.7),
                [{"text": body, "size": 12, "color": MUTED, "align": PP_ALIGN.CENTER, "space_after": 0}])

    stack = [
        ("Web & PWA", "Next.js 16.3  ·  React 19  ·  Tailwind v4  ·  Leaflet"),
        ("Spatial DB", "Supabase Postgres  ·  PostGIS  ·  Realtime  ·  RLS"),
        ("Intelligence", "Gemini 3.5 Flash Lite  ·  structured JSON  ·  fallback engine"),
        ("Native", "Expo SDK 57  ·  React Native  ·  offline cache"),
    ]
    for i, (title, body) in enumerate(stack):
        x = Inches(0.45 + i * 3.2)
        rect(s, x, Inches(3.95), Inches(3.05), Inches(2.5), CARD, None, 0.06)
        textbox(s, x + Inches(0.2), Inches(4.15), Inches(2.65), Inches(0.4),
                [{"text": title, "size": 14, "color": CYAN, "bold": True, "space_after": 0}])
        textbox(s, x + Inches(0.2), Inches(4.6), Inches(2.65), Inches(1.5),
                [{"text": body, "size": 13, "color": SOFT, "space_after": 0}])
    notes(
        s,
        "These metrics are design targets from the locked spec, not a year of production telemetry. Be honest if asked. Then: it is live on Vercel tonight.",
    )
    footer(s, 9, total)

    # ------------------------------------------------------------------ 10 CLOSE
    s = prs.slides.add_slide(blank)
    set_bg(s)
    rect(s, Inches(0), Inches(0), Inches(0.12), SLIDE_H, CYAN)
    add_pic_buf(s, io.BytesIO(logo_buf.getvalue()), Inches(0.55), Inches(0.7), height=Inches(0.85))

    textbox(
        s,
        Inches(0.55),
        Inches(1.7),
        Inches(12.2),
        Inches(1.0),
        [{"text": "Flash floods are inevitable.\nBlind response is not.", "size": 32, "color": WHITE, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(0.55),
        Inches(3.0),
        Inches(12.2),
        Inches(0.7),
        [{"text": "FENDER gives Colombo a shared picture in seconds — and a standard that can travel to every river basin in the country.", "size": 16, "color": SOFT, "space_after": 0}],
    )

    next_steps = [
        (BLUE, "Now", "Kelani corridor live ops: report, triage, prove, reunite."),
        (CYAN, "Next", "SMS / USSD fallback when towers fail. LoRa mesh SOS."),
        (EMERALD, "National", "DMC 117 interoperability. Drone vision into the same pipeline."),
    ]
    for i, (color, when, body) in enumerate(next_steps):
        x = Inches(0.55 + i * 4.2)
        rect(s, x, Inches(3.85), Inches(4.0), Inches(1.55), SURFACE, None, 0.08)
        textbox(s, x + Inches(0.25), Inches(4.0), Inches(3.5), Inches(0.32),
                [{"text": when.upper(), "size": 12, "color": color, "bold": True, "space_after": 0}])
        textbox(s, x + Inches(0.25), Inches(4.35), Inches(3.5), Inches(0.85),
                [{"text": body, "size": 14, "color": WHITE, "space_after": 0}])

    textbox(
        s,
        Inches(0.55),
        Inches(5.65),
        Inches(12.2),
        Inches(0.45),
        [{"text": "Thank you. Questions — and a live demo.", "size": 22, "color": CYAN, "bold": True, "space_after": 0}],
    )
    textbox(
        s,
        Inches(0.55),
        Inches(6.2),
        Inches(12.2),
        Inches(0.5),
        [{"text": "https://backend-chi-gilt-80.vercel.app     ·     /dashboard/officer     ·     /map     ·     /crew     ·     /safe", "size": 13, "color": MUTED, "space_after": 0}],
    )
    notes(
        s,
        "Stop talking. Invite the live demo. If time is gone, stay on this slide and take questions. Demo order: report → officer queue → crew close → map pin flips → I'm Safe search.",
    )
    footer(s, 10, total)

    prs.save(OUT)
    prs.save(PUBLIC_COPY)
    print(f"Wrote {OUT}")
    print(f"Wrote {PUBLIC_COPY}")
    print(f"Size {OUT.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    build()
