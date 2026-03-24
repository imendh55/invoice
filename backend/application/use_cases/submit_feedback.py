from sqlalchemy.orm import Session
from infrastructure.database.models import Invoice

def submit_feedback(db: Session, invoice_id: int, corrections: dict):
    """
    Enregistre les corrections de l'utilisateur (apprentissage continu)
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        return None
    
    invoice.validated_data = corrections
    invoice.feedback = corrections
    invoice.status = "validated"
    db.commit()
    db.refresh(invoice)
    return invoice