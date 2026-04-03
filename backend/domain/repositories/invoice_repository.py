from abc import ABC, abstractmethod
from typing import List, Optional
from domain.entities.invoice import Invoice

class InvoiceRepository(ABC):
    """Interface du repository - dépendance inversée"""

    @abstractmethod
    def save(self, invoice: Invoice) -> Invoice:
        pass

    @abstractmethod
    def get_by_id(self, invoice_id: int) -> Optional[Invoice]:
        pass

    @abstractmethod
    def list_all(self, limit: int = 20, status: Optional[str] = None) -> List[Invoice]:
        pass

    @abstractmethod
    def search(self, keyword: str, limit: int = 20) -> List[Invoice]:
        pass
