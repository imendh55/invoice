from sqlalchemy.orm import Session
from infrastructure.database.models import Invoice

def get_invoice_history(db: Session, limit: int = 20, status: str = None):
    """
    Récupère l'historique des factures (avec filtre optionnel par statut)
    """
    query = db.query(Invoice).order_by(Invoice.upload_date.desc())
    
    if status:
        query = query.filter(Invoice.status == status)
    
    invoices = query.limit(limit).all()
    
    return [
        {
            "id": inv.id,
            "filename": inv.filename,
            "upload_date": inv.upload_date.isoformat(),
            "status": inv.status,
            "total_ttc": inv.total_ttc,
            "supplier": inv.validated_data.get("supplier") or inv.extracted_data.get("supplier")
        }
        for inv in invoices
    ]