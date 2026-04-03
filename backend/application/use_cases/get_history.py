from typing import List, Optional
from sqlalchemy.orm import Session
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository

def get_invoice_history(db: Session, limit: int = 20, status: Optional[str] = None) -> List[dict]:
    """Récupère l'historique des factures"""
    repository: InvoiceRepository = SqlInvoiceRepository(db)
    invoices = repository.list_all(limit=limit, status=status)
    return [inv.to_dict() for inv in invoices]
