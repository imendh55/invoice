from pydantic import BaseModel
from typing import Dict, Optional, Any
from datetime import datetime

class InvoiceResponse(BaseModel):
    id: int
    filename: str
    status: str
    extracted_data: Dict[str, Any]
    validated_data: Optional[Dict[str, Any]] = None
    total_ttc: Optional[float] = None
    upload_date: Optional[str] = None

class InvoiceListResponse(BaseModel):
    invoices: list[InvoiceResponse]

class FeedbackRequest(BaseModel):
    corrections: Dict[str, Any]
