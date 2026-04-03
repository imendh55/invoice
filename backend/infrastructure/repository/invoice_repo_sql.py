from typing import List, Optional
from sqlalchemy.orm import Session
from domain.entities.invoice import Invoice
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.database.models import InvoiceModel


class SqlInvoiceRepository(InvoiceRepository):
    """Implémentation SQLAlchemy du repository"""

    def __init__(self, db: Session):
        self.db = db

    def save(self, invoice: Invoice) -> Invoice:
        """Sauvegarde une nouvelle facture"""
        db_invoice = InvoiceModel(
            filename=invoice.filename,
            file_path=invoice.path,                    # correspond à file_path dans le modèle
            original_filename=invoice.filename,
            statut=invoice.status.upper() if invoice.status else "EN_COURS",
            total_ttc=invoice.total_ttc,
            raw_data=str(invoice.extracted_data) if invoice.extracted_data else None,
        )

        self.db.add(db_invoice)
        self.db.commit()
        self.db.refresh(db_invoice)

        # Mise à jour de l'entité domaine
        invoice.id = db_invoice.id
        return invoice

    def get_by_id(self, invoice_id: int) -> Optional[Invoice]:
        """Récupère une facture par son ID"""
        db_invoice = self.db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
        if not db_invoice:
            return None
        return self._to_domain(db_invoice)

    def list_all(self, limit: int = 20, status: Optional[str] = None) -> List[Invoice]:
        """Liste toutes les factures (utilisé par le dashboard)"""
        query = self.db.query(InvoiceModel).order_by(InvoiceModel.created_at.desc())

        if status:
            query = query.filter(InvoiceModel.statut == status.upper())

        results = query.limit(limit).all()
        return [self._to_domain(inv) for inv in results]

    def search(self, keyword: str, limit: int = 20) -> List[Invoice]:
        """Recherche simple par mot-clé"""
        results = self.db.query(InvoiceModel).limit(limit).all()
        keyword = keyword.lower()
        filtered = []

        for inv in results:
            text = (inv.filename + " " + str(inv.raw_data or "")).lower()
            if keyword in text:
                filtered.append(self._to_domain(inv))

        return filtered

    def _to_domain(self, model: InvoiceModel) -> Invoice:
        """Convertit InvoiceModel → Invoice (entité domaine)"""
        return Invoice(
            id=model.id,
            filename=model.filename,
            path=model.file_path,
            status=model.statut.lower() if model.statut else "en_cours",
            extracted_data=model.raw_data,
            validated_data=None,           # à implémenter plus tard
            total_ttc=model.total_ttc,
            # upload_date n'existe pas → on utilise created_at
            upload_date=model.created_at,
        )