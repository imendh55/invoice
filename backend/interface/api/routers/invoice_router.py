from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from jose import jwt, JWTError

from core.config import get_settings
from core.db import get_db
from infrastructure.database.models import InvoiceModel

# Use Cases
from application.use_cases.upload_invoice import process_upload
from application.use_cases.get_history import get_invoice_history
from application.use_cases.search_invoices import search_invoices
from application.use_cases.export_invoice import export_to_csv, export_to_json
from application.use_cases.validate_invoice import validate_invoice

# Schemas
from interface.api.schemas.invoice_schema import InvoiceResponse, FeedbackRequest

router = APIRouter(
    prefix="/invoices",
    tags=["Factures"]
)

settings = get_settings()
security = HTTPBearer()

# ====================== DÉPENDANCE JWT AVEC DEBUG ======================
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    print(f"🔑 Token reçu dans le header : {token[:50]}...")  # DEBUG

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        print("✅ Token décodé avec succès ! User =", payload.get("sub"))
        return payload
    except JWTError as e:
        print(f"❌ Erreur JWT : {str(e)}")
        raise HTTPException(status_code=401, detail=f"Token invalide ou expiré : {str(e)}")
    except Exception as e:
        print(f"❌ Erreur inconnue : {str(e)}")
        raise HTTPException(status_code=401, detail="Erreur d'authentification")


# ====================== DASHBOARD STATS ======================
@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    total = db.query(InvoiceModel).count()
    en_cours = db.query(InvoiceModel).filter(InvoiceModel.statut == "EN_COURS").count()
    validees = db.query(InvoiceModel).filter(InvoiceModel.statut == "VALIDEE").count()
    rejetees = db.query(InvoiceModel).filter(InvoiceModel.statut == "REJETEE").count()

    return {
        "totalInvoices": total,
        "enCours": en_cours,
        "validees": validees,
        "rejetees": rejetees,
        "monthlyData": [
            {"month": "Jan", "count": 8},
            {"month": "Fév", "count": 15},
            {"month": "Mar", "count": 22},
            {"month": "Avr", "count": 18},
        ]
    }


# ====================== HISTORIQUE ======================
@router.get("/history")
def get_history(
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = db.query(InvoiceModel).order_by(InvoiceModel.created_at.desc())

    if status:
        query = query.filter(InvoiceModel.statut == status.upper())

    total = query.count()
    invoices = query.offset(skip).limit(limit).all()
    total_pages = (total + limit - 1) // limit

    return {
        "items": [inv.to_dict() for inv in invoices],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages
    }


# ====================== AUTRES ROUTES (simplifiées) ======================
@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        result = process_upload(file, db)
        return {"message": "✅ Facture uploadée et traitée avec succès", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# (Tu peux garder tes autres routes comme search, export, validate, etc. – elles utiliseront la même dépendance)