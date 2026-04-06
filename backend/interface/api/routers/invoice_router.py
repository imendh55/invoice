from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from collections import defaultdict

from core.db import get_db
from interface.dependencies.auth import get_current_user
from interface.api.schemas.invoice_schema import InvoiceResponse, FeedbackRequest

router = APIRouter(prefix="/invoices", tags=["Factures"])


# ====================== STATS DASHBOARD ====================== ✅ NOUVEAU
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    all_invoices = repository.list_all(limit=10000)

    # Comptages par statut
    total = len(all_invoices)
    en_cours = len([i for i in all_invoices if i.status == "en_cours"])
    validees = len([i for i in all_invoices if i.status == "validated"])
    rejetees = len([i for i in all_invoices if i.status == "rejected"])

    monthly_counts = defaultdict(int)
    for inv in all_invoices:
        if inv.upload_date:
            month_key = inv.upload_date.strftime("%b")
            monthly_counts[month_key] += 1

    monthly_data = [
        {"month": month, "count": count}
        for month, count in monthly_counts.items()
    ]

    return {
        "totalInvoices": total,
        "enCours": en_cours,
        "validees": validees,
        "rejetees": rejetees,
        "monthlyData": monthly_data,
    }


# ====================== UPLOAD ======================
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


# ====================== HISTORIQUE PAGINÉ ====================== ✅ MODIFIÉ
@router.get("/history")
def get_history(
    page:         int           = Query(1,  ge=1),
    limit:        int           = Query(20, ge=1, le=100),
    status:       Optional[str] = Query(None),
    query:        Optional[str] = Query(None),
    db:           Session       = Depends(get_db),
    current_user: str           = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)

    if query:
        all_invoices = repository.search(query, limit=10000)
        if status:
            all_invoices = [i for i in all_invoices if i.status == status]
    else:
        all_invoices = repository.list_all(limit=10000, status=status)

    # Filtrer par statut si recherche + statut combinés
    if query and status:
        all_invoices = [i for i in all_invoices if i.status == status]

    total = len(all_invoices)
    total_pages = max(1, (total + limit - 1) // limit)

    # Pagination manuelle
    start = (page - 1) * limit
    end = start + limit
    page_items = all_invoices[start:end]

    return {
        "items":      [inv.to_dict() for inv in page_items],
        "total":      total,
        "page":       page,
        "limit":      limit,
        "totalPages": total_pages,
    }


# ====================== RECHERCHE ======================
@router.get("/search", response_model=list)
def search(
    keyword:      Optional[str] = Query(None),
    limit:        int           = Query(20, ge=1, le=100),
    db:           Session       = Depends(get_db),
    current_user: str           = Depends(get_current_user)
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


# ====================== VALIDATION ======================
@router.post("/{invoice_id}/validate", response_model=dict)
def validate(
    invoice_id:   int,
    feedback:     FeedbackRequest,
    db:           Session = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    """Valide et corrige les données d'une facture"""
    result = validate_invoice(db, invoice_id, feedback.corrections)
    if not result:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    return {
        "message": "✅ Facture validée et corrections enregistrées",
        "invoice": result
    }


# ====================== RÉCUPÉRER PAR ID ======================
@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Récupère les détails complets d'une facture"""
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    invoice = repository.get_by_id(invoice_id)

    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    return invoice.to_dict()


# ====================== SUPPRIMER UNE FACTURE ======================
@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id:   int,
    db:           Session = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    from infrastructure.database.models import InvoiceModel
    repository = SqlInvoiceRepository(db)
    if not repository.get_by_id(invoice_id):
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    # Supprimer via le modèle SQLAlchemy directement
    from infrastructure.database.models import InvoiceModel
    db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).delete()
    db.commit()

    return {"message": "✅ Facture supprimée"}


# ====================== LISTE SIMPLE ======================
@router.get("/")
def list_invoices(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Liste simple de toutes les factures"""
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    invoices = repository.list_all(limit=limit)
    return [inv.to_dict() for inv in invoices]
