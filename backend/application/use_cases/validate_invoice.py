from sqlalchemy.orm import Session
from infrastructure.database.models import InvoiceModel


def validate_invoice(db: Session, invoice_id: int, corrected_data: dict):
    """
    Valide ou rejette une facture selon les données corrigées.
    Si corrected_data contient '_status': 'rejected', on rejette.
    """
    db_invoice = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not db_invoice:
        return None

    # Détecter si c'est un rejet
    internal_status = corrected_data.pop('_status', None)
    if internal_status == 'rejected':
        db_invoice.status = 'rejected'
    else:
        db_invoice.validated_data = corrected_data
        db_invoice.status = 'validated'

    db.commit()
    db.refresh(db_invoice)

    return {
        "id":            db_invoice.id,
        "fileName":      db_invoice.filename,
        "status":        db_invoice.status,
        "extractedData": db_invoice.extracted_data or {},
        "validatedData": db_invoice.validated_data or {},
        "total_ttc":     db_invoice.total_ttc,
        "createdAt":     db_invoice.upload_date.isoformat() if db_invoice.upload_date else None,
    }
