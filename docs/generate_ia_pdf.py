"""
Generate PDF from 06_INFORMATION_ARCHITECTURE.md using ReportLab
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, Preformatted
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import re

INPUT  = "06_INFORMATION_ARCHITECTURE.md"
OUTPUT = "06_INFORMATION_ARCHITECTURE.pdf"

# ── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

H1 = ParagraphStyle('H1', parent=styles['Heading1'],
    fontSize=18, textColor=colors.HexColor('#1e1b4b'),
    spaceAfter=10, spaceBefore=16)
H2 = ParagraphStyle('H2', parent=styles['Heading2'],
    fontSize=14, textColor=colors.HexColor('#3730a3'),
    spaceAfter=8, spaceBefore=14)
H3 = ParagraphStyle('H3', parent=styles['Heading3'],
    fontSize=11, textColor=colors.HexColor('#4f46e5'),
    spaceAfter=6, spaceBefore=10)
H4 = ParagraphStyle('H4', parent=styles['Heading4'],
    fontSize=10, textColor=colors.HexColor('#6366f1'),
    spaceAfter=4, spaceBefore=8, fontName='Helvetica-Bold')
BODY = ParagraphStyle('Body', parent=styles['Normal'],
    fontSize=8.5, leading=12, spaceAfter=4)
CODE = ParagraphStyle('Code', parent=styles['Code'],
    fontSize=7, leading=10, fontName='Courier',
    backColor=colors.HexColor('#f1f5f9'),
    borderColor=colors.HexColor('#e2e8f0'),
    borderWidth=0.5, borderPadding=6,
    spaceAfter=6, spaceBefore=4)
BULLET = ParagraphStyle('Bullet', parent=BODY,
    leftIndent=14, bulletIndent=4, spaceAfter=2)

def escape(text):
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;'))

def parse_md_line(line):
    """Convert inline markdown (bold, code, links) to ReportLab XML."""
    # Bold
    line = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', line)
    # Inline code
    line = re.sub(r'`([^`]+)`', r'<font name="Courier" size="7.5" color="#be185d">\1</font>', line)
    # Links [text](url) → just text
    line = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', line)
    return line

def build_table(rows):
    """Build a ReportLab Table from markdown table rows."""
    data = []
    is_header = True
    for row in rows:
        if re.match(r'^\|[-| :]+\|$', row.strip()):
            continue  # separator row
        cells = [c.strip() for c in row.strip().strip('|').split('|')]
        if is_header:
            data.append([Paragraph(f'<b>{escape(c)}</b>', ParagraphStyle(
                'TH', parent=BODY, fontSize=7.5, textColor=colors.white)) for c in cells])
            is_header = False
        else:
            data.append([Paragraph(parse_md_line(escape(c)), ParagraphStyle(
                'TD', parent=BODY, fontSize=7.5)) for c in cells])

    if not data:
        return None

    col_count = len(data[0])
    page_w = A4[0] - 3*cm
    col_w = page_w / col_count

    t = Table(data, colWidths=[col_w]*col_count, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3730a3')),
        ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',   (0,0), (-1,-1), 7.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1),
            [colors.HexColor('#f8fafc'), colors.HexColor('#eef2ff')]),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#c7d2fe')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING',  (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING',   (0,0), (-1,-1), 3),
        ('BOTTOMPADDING',(0,0), (-1,-1), 3),
    ]))
    return t

# ── Parse MD ──────────────────────────────────────────────────────────────────
with open(INPUT, encoding='utf-8') as f:
    lines = f.readlines()

story = []
i = 0
while i < len(lines):
    raw = lines[i].rstrip('\n')
    stripped = raw.strip()

    # Skip HTML comments
    if stripped.startswith('<!--'):
        i += 1
        continue

    # Headings
    if stripped.startswith('#### '):
        story.append(Paragraph(parse_md_line(escape(stripped[5:])), H4))
        i += 1; continue
    if stripped.startswith('### '):
        story.append(Paragraph(parse_md_line(escape(stripped[4:])), H3))
        i += 1; continue
    if stripped.startswith('## '):
        story.append(HRFlowable(width='100%', thickness=1,
            color=colors.HexColor('#c7d2fe'), spaceAfter=4))
        story.append(Paragraph(parse_md_line(escape(stripped[3:])), H2))
        i += 1; continue
    if stripped.startswith('# '):
        story.append(Paragraph(parse_md_line(escape(stripped[2:])), H1))
        story.append(HRFlowable(width='100%', thickness=2,
            color=colors.HexColor('#3730a3'), spaceAfter=8))
        i += 1; continue

    # Code block
    if stripped.startswith('```'):
        code_lines = []
        i += 1
        while i < len(lines) and not lines[i].strip().startswith('```'):
            code_lines.append(lines[i].rstrip('\n'))
            i += 1
        code_text = '\n'.join(code_lines)
        story.append(Preformatted(code_text, CODE))
        i += 1; continue

    # Table
    if stripped.startswith('|'):
        table_rows = []
        while i < len(lines) and lines[i].strip().startswith('|'):
            table_rows.append(lines[i].rstrip('\n'))
            i += 1
        tbl = build_table(table_rows)
        if tbl:
            story.append(tbl)
            story.append(Spacer(1, 6))
        continue

    # Horizontal rule
    if stripped in ('---', '***', '___') or re.match(r'^-{3,}$', stripped):
        story.append(HRFlowable(width='100%', thickness=0.5,
            color=colors.HexColor('#e2e8f0'), spaceAfter=4))
        i += 1; continue

    # Bullet list
    if stripped.startswith('- ') or stripped.startswith('* '):
        text = parse_md_line(escape(stripped[2:]))
        story.append(Paragraph(f'&#x2022; {text}', BULLET))
        i += 1; continue

    # Numbered list
    if re.match(r'^\d+\. ', stripped):
        text = re.sub(r'^\d+\. ', '', stripped)
        story.append(Paragraph(parse_md_line(escape(text)), BULLET))
        i += 1; continue

    # Blockquote
    if stripped.startswith('> '):
        story.append(Paragraph(parse_md_line(escape(stripped[2:])),
            ParagraphStyle('BQ', parent=BODY, leftIndent=16,
                textColor=colors.HexColor('#6b7280'), fontSize=8)))
        i += 1; continue

    # Empty line
    if not stripped:
        story.append(Spacer(1, 4))
        i += 1; continue

    # Normal paragraph
    story.append(Paragraph(parse_md_line(escape(stripped)), BODY))
    i += 1

# ── Build PDF ─────────────────────────────────────────────────────────────────
def header_footer(canvas, doc):
    canvas.saveState()
    # Header
    canvas.setFillColor(colors.HexColor('#3730a3'))
    canvas.rect(0, A4[1]-1.2*cm, A4[0], 1.2*cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica-Bold', 9)
    canvas.drawString(1.5*cm, A4[1]-0.8*cm, 'PMS Platform — Information Architecture')
    canvas.setFont('Helvetica', 8)
    canvas.drawRightString(A4[0]-1.5*cm, A4[1]-0.8*cm, '2026-03-21')
    # Footer
    canvas.setFillColor(colors.HexColor('#e2e8f0'))
    canvas.rect(0, 0, A4[0], 0.9*cm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#6b7280'))
    canvas.setFont('Helvetica', 7.5)
    canvas.drawString(1.5*cm, 0.3*cm, 'Confidential — PMS Platform Internal Documentation')
    canvas.drawRightString(A4[0]-1.5*cm, 0.3*cm, f'Page {doc.page}')
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=1.5*cm, rightMargin=1.5*cm,
    topMargin=1.8*cm, bottomMargin=1.5*cm,
    title='PMS Platform — Information Architecture',
    author='PMS Platform',
    subject='Complete IA: Frontend Routes, Backend APIs, RBAC Matrix',
)
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"PDF created: {OUTPUT}")
