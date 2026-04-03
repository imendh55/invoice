from sqlalchemy.orm import Session
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
import csv
import io

def export_to_csv(db: Session):
    """Exporte toutes les factures en CSV"""
    repository: InvoiceRepository = SqlInvoiceRepository(db)
    invoices = repository.list_all(limit=1000)

    output = io.StringIO()
    writer = csv.writer(output)

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
    repository: InvoiceRepository = SqlInvoiceRepository(db)
    invoices = repository.list_all(limit=1000)

    return [inv.to_dict() for inv in invoices]
