from sqlalchemy.orm import Session
from infrastructure.database.models import Invoice

def search_invoices(db: Session, keyword: str = None, limit: int = 20):
    """
    Recherche intelligente - Version ultra stable
    """
    query = db.query(Invoice).order_by(Invoice.upload_date.desc()).limit(limit)
    results = query.all()
    
    if not keyword:
        return results
    
    keyword = keyword.lower()
    
    # Filtrage en Python (beaucoup plus sûr avec SQLite)
    filtered = []
    for inv in results:
        text_to_search = (
            inv.filename.lower() + " " +
            str(inv.extracted_data).lower()
        )
        if keyword in text_to_search:
            filtered.append(inv)
    
    return filtered