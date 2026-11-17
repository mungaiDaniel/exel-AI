import io
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT


BRAND_BLUE  = colors.HexColor("#1A56DB")
DARK_BG     = colors.HexColor("#1A1D27")
BORDER_CLR  = colors.HexColor("#2E3248")
TEXT_LIGHT  = colors.HexColor("#F1F3F9")
TEXT_MUTED  = colors.HexColor("#8B90A7")
ROW_ALT     = colors.HexColor("#22263A")


def export_sheet_pdf(sheet_name: str, columns: list[dict], data: list[dict], max_rows: int = 500) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=16, textColor=BRAND_BLUE)
    sub_style   = ParagraphStyle("sub",   fontName="Helvetica",      fontSize=9,  textColor=TEXT_MUTED)

    col_names = [c["name"] for c in columns]
    rows = data[:max_rows]

    # Table data: header + rows
    header = col_names
    table_data = [header] + [[str(row.get(c, "")) for c in col_names] for row in rows]

    col_width = (landscape(A4)[0] - 3 * cm) / max(len(col_names), 1)
    col_widths = [col_width] * len(col_names)

    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  BRAND_BLUE),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  TEXT_LIGHT),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0),  8),
        ("ALIGN",       (0, 0), (-1, -1), "LEFT"),
        ("FONTSIZE",    (0, 1), (-1, -1), 7),
        ("TEXTCOLOR",   (0, 1), (-1, -1), colors.black),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFF")]),
        ("GRID",        (0, 0), (-1, -1), 0.25, BORDER_CLR),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))

    story = [
        Paragraph(f"ExcelAI Export — {sheet_name}", title_style),
        Spacer(1, 0.3 * cm),
        Paragraph(f"{len(rows)} rows · {len(col_names)} columns", sub_style),
        Spacer(1, 0.5 * cm),
        t,
    ]
    doc.build(story)
    return buf.getvalue()
