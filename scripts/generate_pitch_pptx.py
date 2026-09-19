"""Generate the official FENDER CodeArena '26 pitch deck (16:9 PPTX)."""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import nsmap, qn
from pptx.oxml.xmlchemy import OxmlElement
from pptx.util import Emu, Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "docs" / "screenshots"
LOGO = ROOT / "backend" / "public" / "fender-logo.png"
OUT = ROOT / "FENDER_Pitch_Presentation.pptx"

# 16:9 widescreen
W = Inches(13.333)
H = Inches(7.5)

BG = RGBColor(0x0B, 0x12, 0x20)
CARD = RGBColor(0x12, 0x1A, 0x2B)
CARD_ALT = RGBColor(0x16, 0x23, 0x3A)
CYAN = RGBColor(0x22, 0xD3, 0xEE)
BLUE = RGBColor(0x3B, 0x82, 0xF6)
AMBER = RGBColor(0xF5, 0x9E, 0x0B)
EMERALD = RGBColor(0x10, 0xB9, 0x81)
RED = RGBColor(0xF8, 0x71, 0x71)
ORANGE = RGBColor(0xFB, 0x92, 0x3C)
PURPLE = RGBColor(0xC0, 0x84, 0xFC)
WHITE = RGBColor(0xF8, 0xFA, 0xFC)
SLATE = RGBColor(0x94, 0xA3, 0xB8)
MUTED = RGBColor(0xCB, 0xD5, 0xE1)
LINE = RGBColor(0x1E, 0x2A, 0x3D)


def set_run(run, text, size=14, bold=False, color=WHITE, font="Calibri"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font


def add_text(slide, l, t, w, h, text, size=14, bold=False, color=WHITE, align=PP_ALIGN.LEFT, font="Calibri", anchor=MSO_ANCHOR.TOP):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.paragraphs[0].alignment = align
    try:
        tf._txBody.bodyPr.set("anchor", {MSO_ANCHOR.TOP: "t", MSO_ANCHOR.MIDDLE: "ctr", MSO_ANCHOR.BOTTOM: "b"}[anchor])
    except Exception:
        pass
    set_run(_first_run(tf), text, size, bold, color, font)
    return box


def _first_run(tf):
    p = tf.paragraphs[0]
    return p.runs[0] if p.runs else p.add_run()


def add_para(tf, text, size=13, bold=False, color=WHITE, align=PP_ALIGN.LEFT, space_before=0, space_after=4, font="Calibri"):
    p = tf.paragraphs[0] if (len(tf.paragraphs) == 1 and not tf.paragraphs[0].text and not tf.paragraphs[0].runs) else tf.add_paragraph()
    p.alignment = align
    p.space_before = Pt(space_before)
    p.space_after = Pt(space_after)
    run = p.add_run()
    set_run(run, text, size, bold, color, font)
    return p


def fill_shape(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    if hasattr(shape, "line"):
        try:
            shape.line.fill.background()
        except Exception:
            pass


def paint_slide_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def card(slide, l, t, w, h, color=CARD, radius=0.08):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    fill_shape(shape, color)
    shape.adjustments[0] = radius
    return shape


def pill(slide, l, t, w, h, text, fill, text_color=WHITE, size=10, bold=True):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    fill_shape(shape, fill)
    shape.adjustments[0] = 0.5
    tf = shape.text_frame
    tf.word_wrap = False
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    try:
        tf._txBody.bodyPr.set("anchor", "ctr")
    except Exception:
        pass
    set_run(_first_run(tf), text, size, bold, text_color)
    return shape


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def paint_bg(slide):
    paint_slide_bg(slide, BG)
    # top accent line
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, Inches(0.06))
    fill_shape(bar, CYAN)
    # bottom footer strip
    foot = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(7.22), W, Inches(0.28))
    fill_shape(foot, RGBColor(0x08, 0x0E, 0x18))


def footer(slide, page, total=10):
    add_text(slide, Inches(0.4), Inches(7.24), Inches(6), Inches(0.24), "FENDER  ·  CodeArena '26  ·  Topic 04: Disaster Response", 9, False, SLATE)
    add_text(slide, Inches(10.6), Inches(7.24), Inches(2.3), Inches(0.24), f"{page}  /  {total}", 9, False, SLATE, PP_ALIGN.RIGHT)


def tag_line(slide, tag):
    add_text(slide, Inches(0.45), Inches(0.18), Inches(12.4), Inches(0.28), tag, 11, True, CYAN)


def heading(slide, title, subtitle):
    add_text(slide, Inches(0.45), Inches(0.42), Inches(12.4), Inches(0.48), title, 26, True, WHITE)
    add_text(slide, Inches(0.45), Inches(0.88), Inches(12.4), Inches(0.32), subtitle, 13, False, SLATE)


def new_slide(prs):
    layout = prs.slide_layouts[6]  # blank
    slide = prs.slides.add_slide(layout)
    paint_bg(slide)
    return slide


def slide_cover(prs):
    slide = new_slide(prs)
    notes(
        slide,
        "Good morning, judges. My name is Mohan. Today, we present FENDER—an intelligent, "
        "multi-tier disaster response ecosystem engineered for the Colombo flood corridor and "
        "ready for nationwide deployment. During seasonal monsoons, the Kelani River breaches "
        "its banks in Nagalagam Street, Sedawatta, and Kolonnawa. The real tragedy is the "
        "information void: dispatchers take 45 minutes to verify a single incident while "
        "ambulances navigate into submerged dead ends.",
    )

    pill(slide, Inches(4.15), Inches(0.28), Inches(5.05), Inches(0.32), "CODEARENA '26  ·  TOPIC 04: DISASTER RESPONSE", RGBColor(0x12, 0x3A, 0x4A), CYAN, 10)

    if LOGO.exists():
        # white badge behind logo
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.95), Inches(0.78), Inches(1.44), Inches(1.44))
        fill_shape(badge, WHITE)
        badge.adjustments[0] = 0.18
        slide.shapes.add_picture(str(LOGO), Inches(6.07), Inches(0.90), Inches(1.20), Inches(1.20))

    add_text(slide, Inches(0.5), Inches(2.28), Inches(12.3), Inches(0.85), "FENDER", 54, True, WHITE, PP_ALIGN.CENTER)
    add_text(
        slide,
        Inches(1.4),
        Inches(3.10),
        Inches(10.5),
        Inches(0.70),
        "Next-Gen National Disaster Risk Reduction &\nEmergency Management System  ·  Kelani River Basin & Beyond",
        16,
        False,
        MUTED,
        PP_ALIGN.CENTER,
    )

    tiles = [
        (BLUE, "5-CHECK AI", "Gemini Vision + PostGIS\nspatial clustering"),
        (CYAN, "EARLY WARNING", "Autonomous rainfall &\nriver gauge triggers"),
        (AMBER, "ANTI-GHOST", "Mandatory photo proof\nbefore road clearance"),
        (EMERALD, "REUNIFICATION", "I'm Safe registry &\nlive shelter telemetry"),
    ]
    x0 = 0.55
    for i, (color, title, body) in enumerate(tiles):
        x = Inches(x0 + i * 3.15)
        c = card(slide, x, Inches(4.00), Inches(2.98), Inches(1.85))
        accent = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(4.00), Inches(0.08), Inches(1.85))
        fill_shape(accent, color)
        add_text(slide, x + Inches(0.22), Inches(4.14), Inches(2.62), Inches(0.32), title, 12, True, color)
        add_text(slide, x + Inches(0.22), Inches(4.50), Inches(2.62), Inches(1.10), body, 13, False, MUTED)

    add_text(
        slide,
        Inches(0.5),
        Inches(6.05),
        Inches(12.3),
        Inches(0.28),
        "LIVE ON VERCEL   ·   Next.js 16.3  +  Supabase PostGIS  +  Google Gemini 3.5 Flash Lite  +  Expo SDK 57",
        12,
        True,
        CYAN,
        PP_ALIGN.CENTER,
    )
    add_text(
        slide,
        Inches(0.5),
        Inches(6.38),
        Inches(12.3),
        Inches(0.26),
        "https://backend-chi-gilt-80.vercel.app",
        12,
        False,
        SLATE,
        PP_ALIGN.CENTER,
    )
    add_text(slide, Inches(0.45), Inches(7.24), Inches(12.4), Inches(0.24), "FENDER Engineering Team  ·  CodeArena '26  ·  Slide 1 / 10", 9, False, SLATE, PP_ALIGN.CENTER)


def slide_problem(prs):
    slide = new_slide(prs)
    tag_line(slide, "THE CRISIS IN COLOMBO")
    heading(slide, "The Deadly 45-Minute Information Void", "Why traditional disaster response collapses when the Kelani overflows")
    footer(slide, 2)
    notes(
        slide,
        "Every year, torrential monsoon downpours flood Sedawatta, Nagalagam Street, and Kolonnawa. "
        "People assume response fails because of a lack of rescue boats. In reality, it fails because of "
        "information paralysis. When 117 receives 5,000 unverified calls, dispatchers spend critical hours "
        "confirming rumors, duplicate tickets flood the queue, and rescue units operate completely blind.",
    )

    problems = [
        (RED, "01", "Verification delay & spam", "117 / 1990 lines are paralyzed by unstructured panic calls. Dispatchers take 30–45 minutes to confirm a single incident."),
        (AMBER, "02", "Duplicate ticket avalanche", "One fallen tree in Sedawatta triggers 50 duplicate reports, pulling crews away from life-threatening floods nearby."),
        (ORANGE, "03", "Ghost clearances", "Field units radio that a road is clear with no proof. Ambulances then drive into submerged culverts and dead ends."),
        (PURPLE, "04", "The missing evacuee void", "Children and elderly citizens are scattered across temples and schools with no unified shelter roster."),
    ]
    for i, (color, num, title, body) in enumerate(problems):
        y = Inches(1.32 + i * 1.38)
        card(slide, Inches(0.40), y, Inches(7.15), Inches(1.26))
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.58), y + Inches(0.32), Inches(0.62), Inches(0.62))
        fill_shape(badge, color)
        badge.adjustments[0] = 0.18
        tf = badge.text_frame
        tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        try:
            tf._txBody.bodyPr.set("anchor", "ctr")
        except Exception:
            pass
        set_run(_first_run(tf), num, 12, True, WHITE)
        add_text(slide, Inches(1.40), y + Inches(0.14), Inches(5.95), Inches(0.36), title, 16, True, WHITE)
        add_text(slide, Inches(1.40), y + Inches(0.50), Inches(5.95), Inches(0.66), body, 12, False, MUTED)

    card(slide, Inches(7.75), Inches(1.32), Inches(5.15), Inches(5.52), CARD_ALT)
    add_text(slide, Inches(8.00), Inches(1.48), Inches(4.70), Inches(0.28), "KELANI BASIN RISK SNAPSHOT", 11, True, CYAN)
    add_text(slide, Inches(8.00), Inches(1.78), Inches(4.70), Inches(0.24), "Nagalagam Street gauge  ·  88%", 11, False, SLATE)

    card(slide, Inches(8.00), Inches(2.20), Inches(4.70), Inches(1.55), RGBColor(0x2A, 0x14, 0x18))
    add_text(slide, Inches(8.18), Inches(2.32), Inches(4.35), Inches(0.24), "TRADITIONAL CYCLE", 10, True, RED)
    add_text(slide, Inches(8.18), Inches(2.58), Inches(4.35), Inches(0.40), "Incident  →  45+ min delay  →  Triage", 14, True, WHITE)
    add_text(slide, Inches(8.18), Inches(3.00), Inches(4.35), Inches(0.55), "Unstructured phone calls, paper logs, and unverified radio reports.", 12, False, MUTED)

    card(slide, Inches(8.00), Inches(3.92), Inches(4.70), Inches(1.55), RGBColor(0x0E, 0x2A, 0x32))
    add_text(slide, Inches(8.18), Inches(4.04), Inches(4.35), Inches(0.24), "WITH FENDER AI PIPELINE", 10, True, CYAN)
    add_text(slide, Inches(8.18), Inches(4.30), Inches(4.35), Inches(0.40), "Photo + GPS  →  < 3 seconds  →  Auto-triage", 14, True, WHITE)
    add_text(slide, Inches(8.18), Inches(4.72), Inches(4.35), Inches(0.55), "Vision scoring, spatial clustering, and autonomous ward escalation.", 12, False, MUTED)

    add_text(
        slide,
        Inches(8.00),
        Inches(5.65),
        Inches(4.70),
        Inches(0.95),
        "“In a flood, a 15-minute verification delay is the difference between safe evacuation and stranded casualties.”",
        12,
        False,
        MUTED,
    )


def slide_ecosystem(prs):
    slide = new_slide(prs)
    tag_line(slide, "THE FENDER ECOSYSTEM")
    heading(slide, "One Unified Platform. Zero Information Silos.", "Citizens, command, field units, and relief camps — synchronized in real time")
    footer(slide, 3)
    notes(
        slide,
        "Fender solves this by connecting all four crisis stakeholders into a single, real-time data fabric. "
        "When a citizen reports an incident, it is verified in seconds, prioritized on the municipal command desk, "
        "dispatched to on-ground crews, and updated on the public safe map—all synchronized via Supabase "
        "WebSockets in under 200 milliseconds.",
    )

    portals = [
        (BLUE, "PORTAL 1  ·  FRONTLINE", "Citizen Lifeline PWA", "/report  ·  /", [
            "Trilingual: English, Sinhala, Tamil",
            "One-tap geotagged camera report",
            "Live 5-check AI verdict modal",
            "Offline QR SOS + 117 / 1990 dialer",
        ]),
        (CYAN, "PORTAL 2  ·  MUNICIPAL HQ", "Command Console", "/dashboard/officer", [
            "Live incident triage queue",
            "PostGIS split-screen spatial sync",
            "Autonomous river / rainfall triggers",
            "AI threshold slider + audit trail",
        ]),
        (AMBER, "PORTAL 3  ·  FIELD OPS", "Crew Clearance Desk", "/crew", [
            "Navy, DMC, CMC ticket queue",
            "One-tap turn-by-turn navigation",
            "Mandatory after-repair photo",
            "Instant public-map unblock",
        ]),
        (EMERALD, "PORTAL 4  ·  HUMANITARIAN", "Relief & Safe Registry", "/safe  ·  /relief", [
            "Live shelter bed counters",
            "I'm Safe family search",
            "Missing persons NIC lookup",
            "Medical / infant aid matching",
        ]),
    ]
    for i, (color, tag, title, route, bullets) in enumerate(portals):
        x = Inches(0.38 + i * 3.24)
        card(slide, x, Inches(1.36), Inches(3.10), Inches(4.55))
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(1.36), Inches(3.10), Inches(0.08))
        fill_shape(bar, color)
        add_text(slide, x + Inches(0.16), Inches(1.56), Inches(2.78), Inches(0.28), tag, 10, True, color)
        add_text(slide, x + Inches(0.16), Inches(1.86), Inches(2.78), Inches(0.55), title, 18, True, WHITE)
        for j, b in enumerate(bullets):
            add_text(slide, x + Inches(0.16), Inches(2.50 + j * 0.58), Inches(2.78), Inches(0.52), f"▸  {b}", 13, False, MUTED)
        add_text(slide, x + Inches(0.16), Inches(5.45), Inches(2.78), Inches(0.28), route, 11, True, CYAN)

    card(slide, Inches(0.38), Inches(6.05), Inches(12.56), Inches(0.95))
    add_text(slide, Inches(0.58), Inches(6.16), Inches(8.4), Inches(0.28), "UNIFIED REALTIME DATA FABRIC", 11, True, CYAN)
    add_text(slide, Inches(0.58), Inches(6.46), Inches(8.4), Inches(0.38), "Supabase PostGIS  +  WebSocket subscriptions  +  Edge replication", 14, True, WHITE)
    add_text(slide, Inches(8.80), Inches(6.30), Inches(3.90), Inches(0.50), "Every action reflects across\nall 4 screens in < 200ms", 13, False, MUTED, PP_ALIGN.RIGHT)


def slide_ai(prs):
    slide = new_slide(prs)
    tag_line(slide, "THE SECRET SAUCE")
    heading(slide, "The Multi-Modal 5-Check AI Engine", "How Fender scores hazard credibility and severity in under 3 seconds")
    footer(slide, 4)
    notes(
        slide,
        "Rather than using a generic chatbot, we engineered a deterministic 5-check evaluation pipeline. "
        "Gemini Vision confirms visual hazard veracity; PostGIS groups nearby calls to kill 90% of duplicate spam; "
        "and river telemetry checks environmental plausibility. Within 3 seconds, the report is mathematically "
        "scored and routed without human bottleneck.",
    )

    checks = [
        (BLUE, "01", "Input & Multilingual AI", "15%", "Sanitizes Sinhala / Tamil / English. Flags distress terms like “elderly trapped” and “water rising fast”."),
        (CYAN, "02", "Gemini 3.5 Flash Lite Vision", "35%", "Estimates flood depth, detects live wires and submerged vehicles, rejects stock or fake photos."),
        (RGBColor(0x81, 0x8C, 0xF8), "03", "Weather & River Telemetry", "20%", "Cross-checks Kelani gauges at Nagalagam Street and 24h ward rainfall radar."),
        (AMBER, "04", "PostGIS Cluster Check", "20%", "ST_DWithin 150–200m groups 50 duplicate calls into 1 master incident."),
        (EMERALD, "05", "Topology & Risk Score", "10%", "Ward elevation, drainage risk, and arterial-road blockage set the final urgency badge."),
    ]
    for i, (color, num, title, weight, body) in enumerate(checks):
        x = Inches(0.32 + i * 2.60)
        card(slide, x, Inches(1.38), Inches(2.48), Inches(4.05))
        num_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x + Inches(0.16), Inches(1.56), Inches(0.48), Inches(0.40))
        fill_shape(num_box, color)
        num_box.adjustments[0] = 0.25
        tf = num_box.text_frame
        tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        try:
            tf._txBody.bodyPr.set("anchor", "ctr")
        except Exception:
            pass
        set_run(_first_run(tf), num, 12, True, WHITE)
        add_text(slide, x + Inches(0.16), Inches(2.10), Inches(2.16), Inches(0.70), title, 15, True, WHITE)
        add_text(slide, x + Inches(0.16), Inches(2.82), Inches(2.16), Inches(1.70), body, 12, False, MUTED)
        add_text(slide, x + Inches(0.16), Inches(4.85), Inches(2.16), Inches(0.36), f"WEIGHT  {weight}", 12, True, color)

    card(slide, Inches(0.32), Inches(5.58), Inches(12.70), Inches(1.42))
    add_text(slide, Inches(0.52), Inches(5.70), Inches(4.2), Inches(0.28), "AGGREGATOR  ·  COMPOSITE SCORE", 11, True, CYAN)
    add_text(slide, Inches(0.52), Inches(6.00), Inches(5.6), Inches(0.36), "Score = Σ (Check_i  ×  Weight_i)     Example:  0.80", 14, True, WHITE)
    add_text(slide, Inches(0.52), Inches(6.40), Inches(5.6), Inches(0.36), "Officers can retune the threshold live during a storm surge.", 12, False, SLATE)

    pill(slide, Inches(6.40), Inches(6.00), Inches(2.25), Inches(0.52), "≥ 0.75  AUTO-PUBLISH", RGBColor(0x06, 0x4E, 0x3B), EMERALD, 11)
    pill(slide, Inches(8.80), Inches(6.00), Inches(2.10), Inches(0.52), "0.50–0.74  NEED INFO", RGBColor(0x45, 0x32, 0x0A), AMBER, 11)
    pill(slide, Inches(11.05), Inches(6.00), Inches(1.75), Inches(0.52), "< 0.50  PENDING", RGBColor(0x45, 0x14, 0x14), RED, 11)


def slide_officer(prs):
    slide = new_slide(prs)
    tag_line(slide, "LIVE PLATFORM TOUR  ·  SCREEN 1")
    heading(slide, "Municipal Officer Command & Triage Console", "Real-time spatial awareness, 5-check telemetry, and autonomous weather triggers")
    footer(slide, 5)
    notes(
        slide,
        "This is what municipal commanders see at CMC headquarters. Incident #428CA8A8 in Nagalagam Street "
        "was submitted with a photo. The system automatically assigned an 0.80 verdict score. The officer can "
        "inspect the exact Gemini reasoning, view clustered nearby reports, adjust AI sensitivity thresholds, "
        "or escalate an entire ward with one click.",
    )

    img = SHOTS / "01-officer-triage-dashboard.png"
    if img.exists():
        frame = card(slide, Inches(0.38), Inches(1.32), Inches(8.55), Inches(5.55), RGBColor(0x08, 0x0E, 0x18))
        slide.shapes.add_picture(str(img), Inches(0.50), Inches(1.44), Inches(8.31), Inches(4.67))
        add_text(slide, Inches(0.55), Inches(6.20), Inches(5.8), Inches(0.28), "Incident #428CA8A8  ·  Flood  ·  Ward 01 Nagalagam", 11, True, CYAN)
        add_text(slide, Inches(6.40), Inches(6.20), Inches(2.35), Inches(0.28), "Verdict  0.80  CONFIRMED", 11, True, EMERALD, PP_ALIGN.RIGHT)

    points = [
        (CYAN, "AI sensitivity slider", "Throttle auto-publish from 0.50 to 0.90 during peak storm volume."),
        (BLUE, "Deep telemetry", "Inspect Input 0.85 · Vision 0.90 · Weather 0.70 · Cluster 1.00 · Risk 0.75."),
        (AMBER, "One-click override", "Publish · Need Info · Area Alert · Council Ticket — every action is audited."),
        (EMERALD, "River gauge alarm", "Kelani at 88% auto-raises ward banners without waiting for a dispatcher."),
    ]
    for i, (color, title, body) in enumerate(points):
        y = Inches(1.32 + i * 1.38)
        card(slide, Inches(9.10), y, Inches(3.82), Inches(1.26))
        add_text(slide, Inches(9.28), y + Inches(0.12), Inches(3.48), Inches(0.32), title, 14, True, color)
        add_text(slide, Inches(9.28), y + Inches(0.46), Inches(3.48), Inches(0.68), body, 12, False, MUTED)


def slide_citizen(prs):
    slide = new_slide(prs)
    tag_line(slide, "LIVE PLATFORM TOUR  ·  SCREEN 2")
    heading(slide, "Citizen Emergency Lifeline & Interactive Map", "15-second geotagged intake, offline SOS, and live evacuation routing")
    footer(slide, 6)
    notes(
        slide,
        "For citizens trapped by rising waters, simplicity is survival. Fender is an installable PWA that works "
        "on any mobile browser. It speaks their language—English, Sinhala, or Tamil. A citizen can report a hazard "
        "in 15 seconds. On the public safe map, they see active flood pins and safe, non-submerged evacuation "
        "routes to open shelters.",
    )

    phones = [
        ("02-citizen-home-lifeline.jpg", "Trilingual Lifelines", "117 / 1990 dialers, flood advisory, offline QR SOS."),
        ("07-citizen-report-hazard.jpg", "One-tap Camera + GPS", "Locked coordinates + live 5-check AI progress modal."),
        ("05-interactive-safe-map.jpg", "Interactive Safe Map", "Pulsing hazard pins, detours, and open-shelter paths."),
    ]
    for i, (fn, title, body) in enumerate(phones):
        x = Inches(0.55 + i * 4.25)
        card(slide, x, Inches(1.32), Inches(4.00), Inches(5.58))
        img = SHOTS / fn
        if img.exists():
            # phone aspect ~ 1440/3168
            slide.shapes.add_picture(str(img), x + Inches(0.85), Inches(1.46), Inches(2.30), Inches(4.06))
        add_text(slide, x + Inches(0.16), Inches(5.62), Inches(3.68), Inches(0.32), title, 14, True, WHITE, PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.16), Inches(5.94), Inches(3.68), Inches(0.72), body, 12, False, SLATE, PP_ALIGN.CENTER)


def slide_crew(prs):
    slide = new_slide(prs)
    tag_line(slide, "LIVE PLATFORM TOUR  ·  SCREEN 3")
    heading(slide, "Field Crew Dispatch & Anti-Ghost Verification", "Tickets cannot close until a live after-fix photo proves the road is clear")
    footer(slide, 7)
    notes(
        slide,
        "A critical flaw in existing municipal systems is ghost clearances—workers marking roads cleared over "
        "the radio when fallen trees still block emergency ambulances. With Fender, tickets cannot be closed "
        "with a button. Field crews must capture an on-site photo showing the obstruction cleared. Once verified, "
        "the database flips is_road_blocked to false, and the public map updates instantly.",
    )

    img = SHOTS / "03-field-crew-hub.jpg"
    card(slide, Inches(0.45), Inches(1.32), Inches(4.55), Inches(5.58))
    if img.exists():
        slide.shapes.add_picture(str(img), Inches(1.22), Inches(1.48), Inches(3.00), Inches(5.26))

    points = [
        (AMBER, "Multi-agency dispatch", "Built for Sri Lanka Navy rescue boats, DMC crews, and CMC tree-clearing engineers."),
        (CYAN, "Zero-trust closure", "The Resolve button stays locked until a timestamped, GPS-stamped after-fix photo is uploaded."),
        (EMERALD, "Instant cascade", "Supabase Realtime flips is_road_blocked = false. Public map pins go green in milliseconds."),
        (BLUE, "Turn-by-turn routing", "One tap opens navigation to the exact incident coordinates — no radio guesswork."),
    ]
    for i, (color, title, body) in enumerate(points):
        y = Inches(1.32 + i * 1.38)
        card(slide, Inches(5.20), y, Inches(7.70), Inches(1.26))
        add_text(slide, Inches(5.44), y + Inches(0.14), Inches(7.28), Inches(0.32), title, 16, True, color)
        add_text(slide, Inches(5.44), y + Inches(0.50), Inches(7.28), Inches(0.62), body, 13, False, MUTED)


def slide_relief(prs):
    slide = new_slide(prs)
    tag_line(slide, "LIVE PLATFORM TOUR  ·  SCREEN 4")
    heading(slide, "Humanitarian Relief & Family Reunification", "Live shelter vacancy, medical matching, and the I'm Safe public registry")
    footer(slide, 8)
    notes(
        slide,
        "Disaster response doesn't end when the rescue boat docks. Displaced citizens are often separated from "
        "children and elderly parents. Our I'm Safe registry lets evacuees register in 30 seconds, enabling loved "
        "ones anywhere in the world to search and verify their safety. Simultaneously, relief coordinators track "
        "real-time shelter bed counts so camps never dangerously overflow.",
    )

    phones = [
        ("04-relief-shelter-hub.jpg", "Shelter Hub"),
        ("06-evacuee-safety-registry.jpg", "I'm Safe Registry"),
    ]
    for i, (fn, label) in enumerate(phones):
        x = Inches(0.40 + i * 3.35)
        card(slide, x, Inches(1.32), Inches(3.20), Inches(5.58))
        img = SHOTS / fn
        if img.exists():
            slide.shapes.add_picture(str(img), x + Inches(0.40), Inches(1.46), Inches(2.40), Inches(4.90))
        add_text(slide, x, Inches(6.42), Inches(3.20), Inches(0.32), label, 12, True, CYAN, PP_ALIGN.CENTER)

    points = [
        (EMERALD, "Live bed & supply telemetry", "Track free beds and meals across Colombo camps — St. Anthony's, Sedawatta Temple, Thimbirigasyaya School — before overflow."),
        (BLUE, "I'm Safe family registry", "Evacuees check in in 30 seconds. Relatives search by name, NIC, or phone from anywhere in the world."),
        (PURPLE, "Vulnerability matching", "Prioritize insulin, dialysis, oxygen, infant formula, and wheelchair needs for NGO and medical teams."),
        (CYAN, "Privacy by design", "Public view shows name + shelter + status. NIC, phone, and medical notes stay hashed and search-gated."),
    ]
    for i, (color, title, body) in enumerate(points):
        y = Inches(1.32 + i * 1.38)
        card(slide, Inches(7.15), y, Inches(5.75), Inches(1.26))
        add_text(slide, Inches(7.35), y + Inches(0.12), Inches(5.38), Inches(0.32), title, 14, True, color)
        add_text(slide, Inches(7.35), y + Inches(0.46), Inches(5.38), Inches(0.68), body, 12, False, MUTED)


def slide_impact(prs):
    slide = new_slide(prs)
    tag_line(slide, "TECHNICAL EXCELLENCE & REAL-WORLD IMPACT")
    heading(slide, "Measurable Impact & Production Architecture", "Built to scale under catastrophic load — not a mockup, live on Vercel")
    footer(slide, 9)
    notes(
        slide,
        "Fender delivers immediate, measurable impact: a 90% reduction in dispatcher triage time, 90% duplicate "
        "elimination, and zero ghost clearances. Our architecture is built for production: Next.js 16.3 on Vercel "
        "Edge, Supabase PostGIS with Row Level Security, and Google Gemini 3.5 Flash Lite multimodal vision.",
    )

    metrics = [
        (BLUE, "< 3s", "AI TRIAGE SPEED", "Down from 45 minutes of manual dispatcher phone triage."),
        (CYAN, "90%", "DUPLICATE CUT", "PostGIS ST_DWithin collapses 50 calls into 1 master dispatch."),
        (AMBER, "100%", "VERIFIED CLEARANCES", "Zero ghost clearances. Closure requires a live photo."),
        (EMERALD, "3 LNG", "TRILINGUAL PARITY", "Full English, Sinhala, and Tamil support for every citizen."),
    ]
    for i, (color, num, title, body) in enumerate(metrics):
        x = Inches(0.38 + i * 3.24)
        card(slide, x, Inches(1.36), Inches(3.10), Inches(2.15))
        add_text(slide, x + Inches(0.16), Inches(1.50), Inches(2.78), Inches(0.62), num, 32, True, color, PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.16), Inches(2.14), Inches(2.78), Inches(0.30), title, 12, True, WHITE, PP_ALIGN.CENTER)
        add_text(slide, x + Inches(0.16), Inches(2.46), Inches(2.78), Inches(0.85), body, 12, False, SLATE, PP_ALIGN.CENTER)

    add_text(slide, Inches(0.45), Inches(3.68), Inches(12.4), Inches(0.28), "FULL-STACK ARCHITECTURE", 11, True, CYAN)
    stack = [
        (BLUE, "Frontend & PWA", "Next.js 16.3 App Router\nReact 19 · Tailwind v4 · Leaflet"),
        (CYAN, "Spatial & Database", "Supabase PostgreSQL\nPostGIS · Realtime WebSockets"),
        (AMBER, "Intelligence", "Gemini 3.5 Flash Lite Vision\nStructured JSON + fallback rules"),
        (EMERALD, "Mobile Native", "Expo SDK 57\nReact Native 0.86 · offline cache"),
    ]
    for i, (color, title, body) in enumerate(stack):
        x = Inches(0.38 + i * 3.24)
        card(slide, x, Inches(4.02), Inches(3.10), Inches(1.85))
        add_text(slide, x + Inches(0.18), Inches(4.14), Inches(2.74), Inches(0.32), title, 13, True, color)
        add_text(slide, x + Inches(0.18), Inches(4.50), Inches(2.74), Inches(1.15), body, 13, False, MUTED)

    card(slide, Inches(0.38), Inches(6.02), Inches(12.56), Inches(0.98))
    add_text(slide, Inches(0.58), Inches(6.16), Inches(7.4), Inches(0.32), "PRODUCTION READY  ·  Live on Vercel Edge", 13, True, WHITE)
    add_text(slide, Inches(0.58), Inches(6.50), Inches(7.4), Inches(0.32), "Zero cold-start pooling  ·  Row Level Security  ·  Deterministic AI fallback if Gemini is down", 12, False, SLATE)
    add_text(slide, Inches(8.20), Inches(6.28), Inches(4.50), Inches(0.46), "backend-chi-gilt-80.vercel.app", 13, True, CYAN, PP_ALIGN.RIGHT)


def slide_close(prs):
    slide = new_slide(prs)
    tag_line(slide, "FUTURE ROADMAP & CONCLUSION")
    heading(slide, "Saving Lives Before the Waters Rise", "From Colombo’s Kelani River to a national disaster infrastructure standard")
    footer(slide, 10)
    notes(
        slide,
        "Our vision goes beyond this competition. We are architecting offline LoRa mesh synchronization for "
        "total cellular tower blackouts, aerial drone video feeds, and direct integration with Sri Lanka's "
        "Disaster Management Centre. When monsoons come, speed and clarity save lives. Fender delivers both. "
        "Thank you—we welcome your questions!",
    )

    phases = [
        (BLUE, "PHASE 1", "LoRa / BLE Mesh Sync", "Peer-to-peer offline hop for total cellular blackout. SOS packets travel 5 km without towers."),
        (CYAN, "PHASE 2", "Drone Stream Vision", "Feed UAV video into Gemini Vision to trace breached levees and expanding flood boundaries."),
        (EMERALD, "PHASE 3", "National DMC Integration", "Bidirectional telemetry into Sri Lanka’s 117 / DMC dispatch and municipal siren systems."),
    ]
    for i, (color, phase, title, body) in enumerate(phases):
        x = Inches(0.40 + i * 4.30)
        card(slide, x, Inches(1.36), Inches(4.10), Inches(2.55))
        add_text(slide, x + Inches(0.22), Inches(1.52), Inches(3.66), Inches(0.28), phase, 11, True, color)
        add_text(slide, x + Inches(0.22), Inches(1.84), Inches(3.66), Inches(0.42), title, 18, True, WHITE)
        add_text(slide, x + Inches(0.22), Inches(2.34), Inches(3.66), Inches(1.25), body, 13, False, MUTED)

    card(slide, Inches(0.40), Inches(4.10), Inches(12.54), Inches(2.88), RGBColor(0x0E, 0x22, 0x36))
    add_text(slide, Inches(0.70), Inches(4.28), Inches(12.0), Inches(0.50), "Thank you. Questions & live demo?", 26, True, WHITE, PP_ALIGN.CENTER)
    add_text(
        slide,
        Inches(0.70),
        Inches(4.84),
        Inches(12.0),
        Inches(0.36),
        "Flash floods are inevitable. Blind disaster response is not.",
        15,
        False,
        MUTED,
        PP_ALIGN.CENTER,
    )
    add_text(
        slide,
        Inches(0.70),
        Inches(5.28),
        Inches(12.0),
        Inches(0.32),
        "https://backend-chi-gilt-80.vercel.app",
        16,
        True,
        CYAN,
        PP_ALIGN.CENTER,
    )

    links = [
        (BLUE, "Command Desk   /dashboard/officer"),
        (CYAN, "Safe Map   /map"),
        (EMERALD, "Safe Registry   /safe"),
        (AMBER, "Crew Clearance   /crew"),
    ]
    for i, (color, label) in enumerate(links):
        pill(slide, Inches(0.85 + i * 3.10), Inches(5.80), Inches(2.90), Inches(0.42), label, RGBColor(0x12, 0x1A, 0x2B), color, 11)


def main():
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H

    slide_cover(prs)
    slide_problem(prs)
    slide_ecosystem(prs)
    slide_ai(prs)
    slide_officer(prs)
    slide_citizen(prs)
    slide_crew(prs)
    slide_relief(prs)
    slide_impact(prs)
    slide_close(prs)

    prs.save(str(OUT))
    print(f"Wrote {OUT}  ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
