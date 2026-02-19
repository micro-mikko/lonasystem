from io import BytesIO
from datetime import date
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from tax import calculate_monthly_tax


def generate_payslip_pdf(
    namn: str,
    personnummer: str,
    lon: Decimal,
    avdelning: str,
    month: int,
    year: int,
) -> bytes:
    """Genererar lönespec som PDF."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="CustomTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=20,
    )

    # Skatteberäkning
    lon_float = float(lon)
    kommunal, statlig, total_skatt = calculate_monthly_tax(Decimal(str(lon_float)))
    nettolon = Decimal(str(round(lon_float - float(total_skatt), 2)))

    month_names = [
        "", "januari", "februari", "mars", "april", "maj", "juni",
        "juli", "augusti", "september", "oktober", "november", "december"
    ]
    month_name = month_names[month] if 1 <= month <= 12 else str(month)

    elements = []
    elements.append(Paragraph("LÖNESPEC", title_style))
    elements.append(Paragraph(f"{month_name} {year}", styles["Normal"]))
    elements.append(Spacer(1, 0.5 * cm))

    # Anställdinfo
    info_data = [
        ["Namn:", namn],
        ["Personnummer:", personnummer],
        ["Avdelning:", avdelning],
    ]
    info_table = Table(info_data, colWidths=[4 * cm, 10 * cm])
    info_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.8 * cm))

    # Löneuppgifter
    salary_data = [
        ["Beskrivning", "Belopp (SEK)"],
        ["Bruttolön", f"{lon_float:,.2f}".replace(",", " ").replace(".", ",")],
        ["Kommunalskatt (32%)", f"-{float(kommunal):,.2f}".replace(",", " ").replace(".", ",")],
        ["Statlig skatt (20% över 540 000 kr/år)", f"-{float(statlig):,.2f}".replace(",", " ").replace(".", ",")],
        ["Totala avdrag", f"-{float(total_skatt):,.2f}".replace(",", " ").replace(".", ",")],
        ["Nettolön", f"{float(nettolon):,.2f}".replace(",", " ").replace(".", ",")],
    ]
    salary_table = Table(salary_data, colWidths=[12 * cm, 5 * cm])
    salary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0ea5e9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("LINEABOVE", (0, -1), (-1, -1), 2, colors.black),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
    ]))
    elements.append(salary_table)

    doc.build(elements)
    return buffer.getvalue()
