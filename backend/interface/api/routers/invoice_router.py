from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from core.config import get_settings
# Dependencies
from core.db import get_db
from interface.dependencies.auth import get_current_user

# Use Cases (Application Layer)
from application.use_cases.upload_invoice import process_upload
from application.use_cases.get_history import get_invoice_history
from application.use_cases.search_invoices import search_invoices
from application.use_cases.export_invoice import export_to_csv, export_to_json
from application.use_cases.validate_invoice import validate_invoice

# Schemas (Response models)
from interface.api.schemas.invoice_schema import InvoiceResponse, FeedbackRequest

router = APIRouter(
    prefix="/invoices",
    tags=["Factures"]
)

# ====================== UPLOAD + TRAITEMENT COMPLET ======================
@router.post("/upload", response_model=dict)
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Upload une facture → Preprocess → OCR → Extraction → Sauvegarde"""
    result = process_upload(file, db)
    return {
        "message": "✅ Facture uploadée et traitée avec succès",
        **result
    }


# ====================== HISTORIQUE ======================
@router.get("/history", response_model=list)
def get_history(
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, example="validated"),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Récupère l'historique des factures"""
    return get_invoice_history(db, limit=limit, status=status)


# ====================== RECHERCHE ======================
@router.get("/search", response_model=list)
def search(
    keyword: Optional[str] = Query(None, description="Mot-clé pour rechercher dans filename ou données extraites"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Recherche intelligente des factures"""
    return search_invoices(db, keyword=keyword, limit=limit)


# ====================== EXPORT CSV ======================
@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Exporte toutes les factures au format CSV"""
    csv_content = export_to_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=factures.csv"}
    )


# ====================== EXPORT JSON ======================
@router.get("/export/json")
def export_json(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Exporte toutes les factures au format JSON"""
    return export_to_json(db)


# ====================== VALIDATION / FEEDBACK ======================
@router.post("/{invoice_id}/validate", response_model=dict)
def validate(
    invoice_id: int,
    feedback: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Valide et corrige les données d'une facture"""
    result = validate_invoice(db, invoice_id, feedback.corrections)
    if not result:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    return {
        "message": "✅ Facture validée et corrections enregistrées",
        "invoice": result
    }


# ====================== RÉCUPÉRER UNE FACTURE PAR ID (Public ou protégé) ======================
@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Récupère les détails complets d'une facture"""
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    from domain.repositories.invoice_repository import InvoiceRepository

    repository: InvoiceRepository = SqlInvoiceRepository(db)
    invoice = repository.get_by_id(invoice_id)

    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    return invoice.to_dict()


# ====================== LISTE SIMPLE (toutes les factures) ======================
@router.get("/")
def list_invoices(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Liste simple de toutes les factures"""
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    from domain.repositories.invoice_repository import InvoiceRepository

    repository: InvoiceRepository = SqlInvoiceRepository(db)
    invoices = repository.list_all(limit=limit)

    return [inv.to_dict() for inv in invoices]
