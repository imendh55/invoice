from typing import List
from sqlalchemy.orm import Session
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
from domain.entities.invoice import Invoice

def search_invoices(db: Session, keyword: str = None, limit: int = 20) -> List[dict]:
    """Recherche des factures par mot-clé"""
    repository: InvoiceRepository = SqlInvoiceRepository(db)

    if not keyword:
        results = repository.list_all(limit=limit)
    else:
        results = repository.search(keyword, limit=limit)

    return [inv.to_dict() for inv in results]
