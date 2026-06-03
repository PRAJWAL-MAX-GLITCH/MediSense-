import io
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from datetime import datetime
import json

def create_consultation_pdf(consultation) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=60, leftMargin=60,
        topMargin=60, bottomMargin=30
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='CenterTitle', alignment=1, fontSize=20,
        fontName="Helvetica-Bold", spaceAfter=6, textColor=colors.HexColor("#0891B2")
    ))
    styles.add(ParagraphStyle(
        name='SubTitle', alignment=1, fontSize=11,
        fontName="Helvetica", spaceAfter=20, textColor=colors.HexColor("#64748B")
    ))
    styles.add(ParagraphStyle(
        name='SectionHeading', fontSize=13, fontName="Helvetica-Bold",
        spaceAfter=6, textColor=colors.HexColor("#0891B2"), spaceBefore=14
    ))
    styles.add(ParagraphStyle(
        name='NormalText', fontSize=11, fontName="Helvetica",
        spaceAfter=4, leading=16, textColor=colors.HexColor("#1E293B")
    ))
    styles.add(ParagraphStyle(
        name='BulletItem', fontSize=11, fontName="Helvetica",
        spaceAfter=4, leading=16, leftIndent=16, textColor=colors.HexColor("#1E293B")
    ))
    styles.add(ParagraphStyle(
        name='WarningText', fontSize=11, fontName="Helvetica-Bold",
        spaceAfter=4, textColor=colors.HexColor("#DC2626")
    ))
    styles.add(ParagraphStyle(
        name='DisclaimerText', fontSize=9, fontName="Helvetica",
        spaceAfter=4, leading=13, textColor=colors.HexColor("#64748B"), fontStyle="italic"
    ))

    Story = []

    # ─── Header ──────────────────────────────────────────────────────
    Story.append(Paragraph("MediSense AI", styles['CenterTitle']))
    Story.append(Paragraph("Clinical Health Consultation Report", styles['SubTitle']))

    # Divider line via table
    Story.append(Table([[""]], colWidths=[490], rowHeights=[2], style=[
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#0891B2")),
    ]))
    Story.append(Spacer(1, 12))

    # ─── Patient / Consultation Metadata ─────────────────────────────
    Story.append(Paragraph("Consultation Details", styles['SectionHeading']))
    Story.append(Paragraph(f"<b>Report ID:</b> {consultation.id}", styles['NormalText']))
    Story.append(Paragraph(f"<b>Patient ID:</b> {consultation.user_id}", styles['NormalText']))
    date_str = consultation.date.strftime('%B %d, %Y at %I:%M %p UTC')
    Story.append(Paragraph(f"<b>Date / Time:</b> {date_str}", styles['NormalText']))
    Story.append(Spacer(1, 10))

    # ─── Reported Symptoms ────────────────────────────────────────────
    Story.append(Paragraph("Reported Symptoms", styles['SectionHeading']))
    Story.append(Paragraph(consultation.symptoms or "Not specified.", styles['NormalText']))
    Story.append(Spacer(1, 6))

    # ─── Risk Level ──────────────────────────────────────────────────
    Story.append(Paragraph("Risk Assessment Level", styles['SectionHeading']))
    risk = consultation.risk_level.upper() if consultation.risk_level else "UNKNOWN"
    risk_style = styles['WarningText'] if risk == 'HIGH' else styles['NormalText']
    risk_icon = "🔴" if risk == "HIGH" else ("🟡" if risk == "MEDIUM" else "🟢")
    Story.append(Paragraph(f"<b>{risk_icon} Risk Level: {risk}</b>", risk_style))
    Story.append(Spacer(1, 8))

    # ─── Parse Full Report ────────────────────────────────────────────
    report_data = {}
    if consultation.full_report:
        try:
            report_data = json.loads(consultation.full_report)
        except Exception:
            pass

    if report_data and isinstance(report_data, dict):
        # Possible Conditions
        conditions = report_data.get("possible_conditions", [])
        if isinstance(conditions, list) and conditions:
            Story.append(Paragraph("Possible Conditions", styles['SectionHeading']))
            for cond in conditions:
                name = cond.get("name", str(cond)) if isinstance(cond, dict) else str(cond)
                Story.append(Paragraph(f"• {name}", styles['BulletItem']))
            Story.append(Spacer(1, 6))
        elif report_data.get("condition"):
            Story.append(Paragraph("Possible Condition", styles['SectionHeading']))
            Story.append(Paragraph(f"• {report_data['condition']}", styles['BulletItem']))
            Story.append(Spacer(1, 6))

        # Risk Explanation
        risk_exp = report_data.get("risk_explanation") or report_data.get("answer", "")
        if risk_exp:
            Story.append(Paragraph("Clinical Risk Explanation", styles['SectionHeading']))
            Story.append(Paragraph(str(risk_exp), styles['NormalText']))
            Story.append(Spacer(1, 6))

        # Recommendations
        recs = report_data.get("recommendations", [])
        if not recs and report_data.get("advice"):
            recs = [report_data["advice"]]
        if isinstance(recs, list) and recs:
            Story.append(Paragraph("Clinical Recommendations", styles['SectionHeading']))
            for rec in recs:
                Story.append(Paragraph(f"✓  {str(rec)}", styles['BulletItem']))
            Story.append(Spacer(1, 6))
        elif isinstance(recs, str) and recs:
            Story.append(Paragraph("Clinical Recommendations", styles['SectionHeading']))
            Story.append(Paragraph(recs, styles['NormalText']))
            Story.append(Spacer(1, 6))

        # Emergency Indicators
        emergency = report_data.get("emergency_indicators", [])
        if isinstance(emergency, list) and emergency:
            Story.append(Paragraph("Emergency Indicators – Seek Immediate Care If:", styles['SectionHeading']))
            for ind in emergency:
                Story.append(Paragraph(f"⚠  {str(ind)}", styles['WarningText']))
            Story.append(Spacer(1, 6))

        # Additional Notes
        notes = report_data.get("additional_notes", "")
        if notes:
            Story.append(Paragraph("Additional Notes", styles['SectionHeading']))
            Story.append(Paragraph(str(notes), styles['NormalText']))
            Story.append(Spacer(1, 6))
    else:
        # Fallback plain text
        Story.append(Paragraph("Analysis", styles['SectionHeading']))
        conds_str = consultation.possible_conditions or "Not available."
        Story.append(Paragraph(str(conds_str), styles['NormalText']))
        Story.append(Spacer(1, 6))

    # ─── Disclaimer ───────────────────────────────────────────────────
    Story.append(Spacer(1, 20))
    Story.append(Table([[""]], colWidths=[490], rowHeights=[1], style=[
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#CBD5E1")),
    ]))
    Story.append(Spacer(1, 8))
    Story.append(Paragraph(
        "<i>Disclaimer: This report is generated by MediSense AI and is intended for informational purposes only. "
        "It is NOT a substitute for professional medical advice, diagnosis, or treatment. "
        "Always consult a qualified healthcare provider regarding any medical condition or symptoms. "
        "In case of emergency, contact your local emergency services immediately.</i>",
        styles['DisclaimerText']
    ))

    doc.build(Story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
