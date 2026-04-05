from sqlalchemy.orm import Session
from infrastructure.database.models import InvoiceModel


def validate_invoice(db: Session, invoice_id: int, corrected_data: dict):
    """
    Valide et met à jour les données corrigées par l'utilisateur.
    ✅ Utilise un UPDATE direct pour éviter la création d'un doublon.
    """
    db_invoice = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()

    if not db_invoice:
        return None

    db_invoice.validated_data = corrected_data
    db_invoice.status = "validated"
    db.commit()
    db.refresh(db_invoice)

    # Retourner au format camelCase pour le frontend
    return {
        "id":            db_invoice.id,
        "fileName":      db_invoice.filename,
        "status":        db_invoice.status,
        "extractedData": db_invoice.extracted_data or {},
        "validatedData": db_invoice.validated_data or {},
        "total_ttc":     db_invoice.total_ttc,
        "createdAt":     db_invoice.upload_date.isoformat() if db_invoice.upload_date else None,
    }
