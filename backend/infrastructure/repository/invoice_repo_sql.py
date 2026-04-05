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
        db_invoice = InvoiceModel(
            filename=invoice.filename,
            path=invoice.path,
            status=invoice.status,
            extracted_data=invoice.extracted_data,
            validated_data=invoice.validated_data,
            total_ttc=invoice.total_ttc,
        )
        self.db.add(db_invoice)
        self.db.commit()
        self.db.refresh(db_invoice)

        invoice.id = db_invoice.id
        invoice.upload_date = db_invoice.upload_date
        return invoice

    def get_by_id(self, invoice_id: int) -> Optional[Invoice]:
        db_invoice = self.db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
        if not db_invoice:
            return None
        return self._to_domain(db_invoice)

    def list_all(self, limit: int = 20, status: Optional[str] = None) -> List[Invoice]:
        query = self.db.query(InvoiceModel).order_by(InvoiceModel.upload_date.desc())
        if status:
            query = query.filter(InvoiceModel.status == status)
        results = query.limit(limit).all()
        return [self._to_domain(inv) for inv in results]

    def search(self, keyword: str, limit: int = 20) -> List[Invoice]:
        # Implémentation simple (améliore ba3d)
        results = self.db.query(InvoiceModel).limit(limit).all()
        keyword = keyword.lower()
        filtered = []
        for inv in results:
            text = (inv.filename + str(inv.extracted_data)).lower()
            if keyword in text:
                filtered.append(self._to_domain(inv))
        return filtered

    def _to_domain(self, model: InvoiceModel) -> Invoice:
        return Invoice(
            id=model.id,
            filename=model.filename,
            path=model.path,
            status=model.status,
            extracted_data=model.extracted_data,
            validated_data=model.validated_data,
            total_ttc=model.total_ttc,
            upload_date=model.upload_date,
        )
