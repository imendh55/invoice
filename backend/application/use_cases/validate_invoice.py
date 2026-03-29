from sqlalchemy.orm import Session
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository

def validate_invoice(db: Session, invoice_id: int, corrected_data: dict):
    """Valide et met à jour les données corrigées par l'utilisateur"""
    repository: InvoiceRepository = SqlInvoiceRepository(db)
    invoice = repository.get_by_id(invoice_id)

    if not invoice:
        return None

    invoice.validated_data = corrected_data
    invoice.status = "validated"

    # Mise à jour via repository (à améliorer si besoin)
    updated = repository.save(invoice)  # reuse save pour simplifier
    return updated.to_dict()
