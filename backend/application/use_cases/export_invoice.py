import csv
import io
from sqlalchemy.orm import Session
from infrastructure.database.models import Invoice

def export_to_csv(db: Session):
    """Exporte toutes les factures en CSV"""
    invoices = db.query(Invoice).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # En-têtes
    writer.writerow(["ID", "Filename", "Status", "Supplier", "Invoice Number", "Date", "Total TTC"])
    
    for inv in invoices:
        data = inv.extracted_data or {}
        writer.writerow([
            inv.id,
            inv.filename,
            inv.status,
            data.get("supplier", ""),
            data.get("invoice_number", ""),
            data.get("date", ""),
            inv.total_ttc or ""
        ])
    
    return output.getvalue()

def export_to_json(db: Session):
    """Exporte toutes les factures en JSON"""
    invoices = db.query(Invoice).all()
    result = []
    for inv in invoices:
        data = inv.extracted_data or {}
        result.append({
            "id": inv.id,
            "filename": inv.filename,
            "status": inv.status,
            "supplier": data.get("supplier"),
            "invoice_number": data.get("invoice_number"),
            "date": data.get("date"),
            "total_ttc": inv.total_ttc,
            "validated_data": inv.validated_data
        })
    return result