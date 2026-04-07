"""
Implémentation concrète du InvoiceRepository avec SQLAlchemy.
Cette classe dépend de l'interface abstraite et des modèles SQLAlchemy.
"""
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from sqlalchemy import or_, and_, cast, String, func, desc, asc
from sqlalchemy.orm import Session

# Import de l'interface (seul endroit où infrastructure dépend du domain)
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.database.models import InvoiceModel


class SqlInvoiceRepository(InvoiceRepository):
    """Implémentation concrète avec SQLAlchemy."""

    def __init__(self, db: Session):
        self.db = db

    def save(self, invoice: Any) -> Any:
        """Sauvegarde une nouvelle facture en base."""
        # Conversion entité → modèle si nécessaire
        if hasattr(invoice, 'to_dict'):
            data = invoice.to_dict()
        elif isinstance(invoice, dict):
            data = invoice
        else:
            data = invoice.__dict__ if hasattr(invoice, '__dict__') else invoice

        db_invoice = InvoiceModel(**data)
        self.db.add(db_invoice)
        self.db.commit()
        self.db.refresh(db_invoice)
        return db_invoice

    def get_by_id(self, invoice_id: int) -> Optional[Any]:
        """Récupère une facture par son ID."""
        return self.db.query(InvoiceModel).filter(
            InvoiceModel.id == invoice_id
        ).first()

    def list_all(self, limit: int = 20, status: Optional[str] = None) -> List[Any]:
        """Liste toutes les factures avec filtre optionnel."""
        query = self.db.query(InvoiceModel)
        if status:
            query = query.filter(InvoiceModel.status == status)
        return query.order_by(desc(InvoiceModel.created_at)).limit(limit).all()

    def search(self, keyword: str, limit: int = 20) -> List[Any]:
        """Recherche simple par mot-clé sur filename et données extraites."""
        search_pattern = f"%{keyword}%"
        return self.db.query(InvoiceModel).filter(
            or_(
                InvoiceModel.extracted_data.ilike(search_pattern),
                InvoiceModel.file_name.ilike(search_pattern),
                InvoiceModel.supplier_name.ilike(search_pattern) if hasattr(InvoiceModel, 'supplier_name') else False
            )
        ).limit(limit).all()

    def advanced_search(
        self,
        page: int = 1,
        limit: int = 15,
        sort_by: str = "upload_date",
        sort_order: str = "desc",
        **filters: Any
    ) -> Tuple[List[Any], int]:
        """Recherche avancée avec pagination, tri et filtres multiples."""
        query = self.db.query(InvoiceModel)

        # Appliquer les filtres dynamiques
        for key, value in filters.items():
            if value is None or value == "":
                continue
            if key == "status":
                query = query.filter(InvoiceModel.status == value)
            elif key == "date_from":
                query = query.filter(InvoiceModel.created_at >= value)
            elif key == "date_to":
                query = query.filter(InvoiceModel.created_at <= value)
            elif key == "supplier":
                query = query.filter(InvoiceModel.supplier_name.ilike(f"%{value}%"))
            elif key == "amount_min":
                query = query.filter(InvoiceModel.total_amount >= float(value))
            elif key == "amount_max":
                query = query.filter(InvoiceModel.total_amount <= float(value))

        # Tri dynamique
        order_func = desc if sort_order.lower() == "desc" else asc
        sort_column = getattr(InvoiceModel, sort_by, InvoiceModel.created_at)
        query = query.order_by(order_func(sort_column))

        # Pagination
        total = query.count()
        offset = (page - 1) * limit
        items = query.offset(offset).limit(limit).all()

        return items, total

    def update(self, invoice: Any) -> Any:
        """Met à jour une facture existante."""
        if hasattr(invoice, 'id'):
            db_invoice = self.get_by_id(invoice.id)
            if db_invoice:
                # Mise à jour champ par champ
                for key, value in invoice.__dict__.items():
                    if key != '_sa_instance_state' and hasattr(db_invoice, key):
                        setattr(db_invoice, key, value)
                self.db.commit()
                self.db.refresh(db_invoice)
                return db_invoice
        return None

    def delete(self, invoice_id: int) -> bool:
        """Supprime une facture par son ID."""
        invoice = self.get_by_id(invoice_id)
        if invoice:
            self.db.delete(invoice)
            self.db.commit()
            return True
        return False

    def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques globales des factures."""
        total = self.db.query(InvoiceModel).count()
        validated = self.db.query(InvoiceModel).filter(
            InvoiceModel.status == "validée"
        ).count()
        pending = self.db.query(InvoiceModel).filter(
            InvoiceModel.status == "en_attente"
        ).count()
        rejected = self.db.query(InvoiceModel).filter(
            InvoiceModel.status == "rejetée"
        ).count()

        # Statistiques montant
        total_amount = self.db.query(func.sum(InvoiceModel.total_amount)).scalar() or 0

        return {
            "total_invoices": total,
            "validated": validated,
            "pending": pending,
            "rejected": rejected,
            "total_amount": float(total_amount),
            "validation_rate": (validated / total * 100) if total > 0 else 0
        }

    def get_recent(self, limit: int = 5) -> List[Any]:
        """Récupère les dernières factures ajoutées."""
        return self.db.query(InvoiceModel).order_by(
            desc(InvoiceModel.created_at)
        ).limit(limit).all()
