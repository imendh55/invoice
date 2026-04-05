from datetime import datetime
from typing import Dict, Optional, Any


class Invoice:
    """Entity pure métier - sans SQLAlchemy ni FastAPI"""

    def __init__(
        self,
        id: Optional[int] = None,
        filename: str = "",
        path: str = "",
        status: str = "uploaded",
        extracted_data: Optional[Dict[str, Any]] = None,
        validated_data: Optional[Dict[str, Any]] = None,
        total_ttc: Optional[float] = None,
        upload_date: Optional[datetime] = None,
    ):
        self.id = id
        self.filename = filename
        self.path = path
        self.status = status
        self.extracted_data = extracted_data or {}
        self.validated_data = validated_data or {}
        self.total_ttc = total_ttc
        self.upload_date = upload_date or datetime.utcnow()

    def validate(self) -> bool:
        """Règle métier simple"""
        return bool(self.extracted_data.get("supplier") and self.total_ttc)

    def to_dict(self) -> Dict:
        """
        ✅ Format camelCase compatible avec le frontend Next.js.
        Le frontend attend : fileName, extractedData, createdAt, etc.
        """
        raw = self.extracted_data or {}

        # Construire extractedData au format attendu par le frontend
        extracted_data_frontend = {
            # Champs nommés par le frontend
            "numeroFacture": raw.get("invoice_number") or raw.get("numeroFacture", ""),
            "fournisseur":   raw.get("supplier")       or raw.get("fournisseur", ""),
            "date":          raw.get("date", ""),
            "totalHT":       raw.get("total_ht")       or raw.get("totalHT"),
            "tva":           raw.get("total_tva")      or raw.get("tva"),
            "totalTTC":      raw.get("total_ttc")      or raw.get("totalTTC") or self.total_ttc,
            "adresseFournisseur": raw.get("adresseFournisseur", ""),
            "client":        raw.get("client", ""),
            "adresseClient": raw.get("adresseClient", ""),
            "produits":      raw.get("produits", []),
            # Conserver le texte brut OCR si présent
            "rawText":       raw.get("raw_text", ""),
        }

        return {
            # ✅ camelCase pour le frontend
            "id":            self.id,
            "fileName":      self.filename,
            "filePath":      self.path,
            "status":        self.status,
            "extractedData": extracted_data_frontend,
            "validatedData": self.validated_data or {},
            "total_ttc":     self.total_ttc,           # gardé pour compat backend
            "createdAt":     self.upload_date.isoformat() if self.upload_date else None,
        }
