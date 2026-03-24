from sqlalchemy.orm import Session
from infrastructure.database.models import Invoice

def validate_invoice(db: Session, invoice_id: int, corrected_data: dict):
    """
    Met à jour les champs corrigés par l'utilisateur et marque comme validée
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        return None
    
    invoice.extracted_data = corrected_data
    invoice.status = "validated"
    db.commit()
    db.refresh(invoice)
    return invoice