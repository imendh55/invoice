"""
Interface abstraite pour le Repository des factures.
Aucune dépendance infrastructure ici → respecte Clean Architecture.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime


class InvoiceRepository(ABC):
    """Interface abstraite pour le Repository des factures."""

    @abstractmethod
    def save(self, invoice: Any) -> Any:
        """Sauvegarde une nouvelle facture."""
        pass

    @abstractmethod
    def get_by_id(self, invoice_id: int) -> Optional[Any]:
        """Récupère une facture par son ID."""
        pass

    @abstractmethod
    def list_all(self, limit: int = 20, status: Optional[str] = None) -> List[Any]:
        """Liste toutes les factures (avec filtre optionnel)."""
        pass

    @abstractmethod
    def search(self, keyword: str, limit: int = 20) -> List[Any]:
        """Recherche simple par mot-clé."""
        pass

    @abstractmethod
    def advanced_search(
        self,
        page: int = 1,
        limit: int = 15,
        sort_by: str = "upload_date",
        sort_order: str = "desc",
        **filters: Any
    ) -> Tuple[List[Any], int]:
        """Recherche avancée avec pagination, tri et filtres multiples."""
        pass

    @abstractmethod
    def update(self, invoice: Any) -> Any:
        """Met à jour une facture existante."""
        pass

    @abstractmethod
    def delete(self, invoice_id: int) -> bool:
        """Supprime une facture."""
        pass

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques globales des factures."""
        pass

    @abstractmethod
    def get_recent(self, limit: int = 5) -> List[Any]:
        """Récupère les dernières factures (dashboard)."""
        pass
