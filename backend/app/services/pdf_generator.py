import os
import io
import datetime
from typing import Optional, List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage


def generate_procurement_pdf(
    commodity: str = "Potato",
    market: str = "Agra",
    date_str: Optional[str] = None,
    p10: Optional[float] = None,
    p50: Optional[float] = None,
    p90: Optional[float] = None,
    arbitrage_items: Optional[List[Dict[str, Any]]] = None,
    decision: Optional[str] = None
) -> bytes:
    """
    Generates a dynamic PDF Procurement Report populated with actual model predictions
    and spatial arbitrage price gradient opportunities.
    """
    if not date_str:
        date_str = datetime.date.today().isoformat()

    forecast_available = all(value is not None for value in (p10, p50, p90))
    p10_val = p10
    p50_val = p50
    p90_val = p90
    decision_text = decision or "Unavailable until a model-backed forecast is available"

    def format_price(value: Optional[float]) -> str:
        return f"₹{int(value):,}" if value is not None else "Unavailable"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#046c4e')
    )

    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569')
    )

    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#0f172a')
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    elements = []

    # Header Title with Logo
    logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/client/public/logo-primary.png"))
    if os.path.exists(logo_path):
        logo_img = RLImage(logo_path, width=1.35 * 72, height=1.08 * 72)
        title_block = [
            Paragraph("CropLens AI — Procurement Report", title_style),
            Spacer(1, 4),
            Paragraph(f"Commodity: <b>{commodity}</b> | Mandi: <b>{market} APMC</b> | Reference Date: <b>{date_str}</b>", sub_style)
        ]
        header_table = Table([[title_block, logo_img]], colWidths=[410, 130])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('PADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(header_table)
    else:
        elements.append(Paragraph("CropLens AI — Institutional Procurement Report", title_style))
        elements.append(Paragraph(f"Commodity: <b>{commodity}</b> | Mandi: <b>{market} APMC</b> | Forecast Reference Date: <b>{date_str}</b>", sub_style))

    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#046c4e'), spaceAfter=12))

    # Executive Summary Box
    summary_text = (
        "<b>Executive Brief:</b> "
        + (f"Based on the multi-quantile LightGBM forecast, the wholesale modal price of <b>{commodity}</b> in <b>{market} APMC</b> has a P50 median of "
           f"<b>{format_price(p50_val)}/qtl</b> (P10 Floor: {format_price(p10_val)}/qtl, P90 Stress Ceiling: {format_price(p90_val)}/qtl). "
           f"Recommended marketing advisory: <b>{decision_text}</b>."
           if forecast_available else
           "A model-backed forecast was unavailable when this report was generated. No placeholder prices are shown. "
           "Please retry after the model service is healthy.")
    )

    summary_table = Table([[Paragraph(summary_text, body_style)]], colWidths=[540])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('BORDER', (0, 0), (-1, -1), 1, colors.HexColor('#bbf7d0')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 12))

    # Quantile Forecast Table
    elements.append(Paragraph("1. Multi-Quantile Price Forecast (₹ / Quintal)", heading_style))
    elements.append(Spacer(1, 4))

    q_data = [
        ["Quantile Horizon", "Price (₹/qtl)", "Confidence Band", "Risk Terminology"],
        ["P10 (Floor Price)", format_price(p10_val), "90% Support Floor", "Minimum Expected Price Floor"],
        ["P50 (Median Forecast)", format_price(p50_val), "Base Expected Target", "Expected Market Modal Rate"],
        ["P90 (Ceiling Stress)", format_price(p90_val), "90% Stress Ceiling", "Maximum Stress Price Ceiling"]
    ]
    q_table = Table(q_data, colWidths=[130, 100, 120, 190])
    q_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#046c4e')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(q_table)
    elements.append(Spacer(1, 12))

    # Spatial Arbitrage Opportunities Table
    elements.append(Paragraph("2. Cross-Mandi Spatial Arbitrage Matrix", heading_style))
    elements.append(Spacer(1, 4))

    arb_headers = ["Source Mandi", "Destination Mandi", "Source Rate", "Dest Rate", "Gross Difference", "Margin %"]
    arb_rows = [arb_headers]

    if arbitrage_items:
        for item in arbitrage_items[:5]:
            src = str(item.get("source_market", market))
            dest = str(item.get("destination_market", ""))
            s_price = item.get("source_price")
            d_price = item.get("destination_price")
            diff = item.get("gross_price_difference")
            pct = item.get("price_gradient_percentage")
            if s_price is None or d_price is None or diff is None or pct is None:
                continue
            s_price, d_price, diff, pct = map(float, (s_price, d_price, diff, pct))
            diff_str = f"+₹{diff:.1f}" if diff > 0 else f"₹{diff:.1f}"
            pct_str = f"{pct:+.1f}%"
            arb_rows.append([src, dest, f"₹{int(s_price):,}", f"₹{int(d_price):,}", diff_str, pct_str])
    if len(arb_rows) == 1:
        arb_rows.append(["Unavailable", "Unavailable", "Unavailable", "Unavailable", "Unavailable", "Unavailable"])

    arb_table = Table(arb_rows, colWidths=[95, 95, 80, 80, 95, 95])
    arb_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(arb_table)
    elements.append(Spacer(1, 14))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=8))
    elements.append(Paragraph("Generated by CropLens AI Engine • Forecast values are model-backed when available • Confidential", sub_style))

    doc.build(elements)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
