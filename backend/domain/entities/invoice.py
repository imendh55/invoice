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
        return {
            "id": self.id,
            "filename": self.filename,
            "status": self.status,
            "extracted_data": self.extracted_data,
            "validated_data": self.validated_data,
            "total_ttc": self.total_ttc,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
        }
