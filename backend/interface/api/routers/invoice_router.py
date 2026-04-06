from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from collections import defaultdict

from core.db import get_db
from interface.dependencies.auth import get_current_user
from interface.api.schemas.invoice_schema import InvoiceResponse, FeedbackRequest

router = APIRouter(prefix="/invoices", tags=["Factures"])


# ============================================================
# 1. STATS — GET /api/invoices/stats
# ============================================================
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    all_invoices = repository.list_all(limit=10000)

    total    = len(all_invoices)
    en_cours = len([i for i in all_invoices if i.status == "en_cours"])
    validees = len([i for i in all_invoices if i.status == "validated"])
    rejetees = len([i for i in all_invoices if i.status == "rejected"])

    monthly_counts = defaultdict(int)
    for inv in all_invoices:
        if inv.upload_date:
            monthly_counts[inv.upload_date.strftime("%b")] += 1

    return {
        "totalInvoices": total,
        "enCours":       en_cours,
        "validees":      validees,
        "rejetees":      rejetees,
        "monthlyData":   [
            {"month": m, "count": c}
            for m, c in monthly_counts.items()
        ],
    }


# ============================================================
# 2. HISTORIQUE PAGINÉ — GET /api/invoices/history
# ============================================================
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

    total       = len(all_invoices)
    total_pages = max(1, (total + limit - 1) // limit)
    start       = (page - 1) * limit
    page_items  = all_invoices[start: start + limit]

    return {
        "items":      [inv.to_dict() for inv in page_items],
        "total":      total,
        "page":       page,
        "limit":      limit,
        "totalPages": total_pages,
    }


# ============================================================
# 3. RECHERCHE — GET /api/invoices/search
# ============================================================
@router.get("/search")
def search(
    keyword:      Optional[str] = Query(None),
    limit:        int           = Query(20, ge=1, le=100),
    db:           Session       = Depends(get_db),
    current_user: str           = Depends(get_current_user)
):
    from application.use_cases.search_invoices import search_invoices
    return search_invoices(db, keyword=keyword, limit=limit)


# ============================================================
# 4. EXPORT CSV — GET /api/invoices/export/csv
# ============================================================
@router.get("/export/csv")
def export_csv(
    db:           Session = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    from application.use_cases.export_invoice import export_to_csv
    csv_content = export_to_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=factures.csv"}
    )


# ============================================================
# 5. EXPORT JSON — GET /api/invoices/export/json
# ============================================================
@router.get("/export/json")
def export_json(
    db:           Session = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    from application.use_cases.export_invoice import export_to_json
    return export_to_json(db)


# ============================================================
# 6. UPLOAD — POST /api/invoices/upload
# ============================================================
@router.post("/upload")
async def upload_invoice(
    file:         UploadFile = File(...),
    db:           Session    = Depends(get_db),
    current_user: str        = Depends(get_current_user)
):
    from application.use_cases.upload_invoice import process_upload
    result = process_upload(file, db)
    return {
        "message": "✅ Facture uploadée et traitée avec succès",
        **result
    }


# ============================================================
# 7. LISTE SIMPLE — GET /api/invoices/
# ============================================================
@router.get("/")
def list_invoices(
    limit:        int     = Query(50, ge=1, le=200),
    db:           Session = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    return [inv.to_dict() for inv in repository.list_all(limit=limit)]


# ============================================================
# ⚠️ ROUTES AVEC PARAMÈTRES — TOUJOURS EN DERNIER
# ============================================================

# 8. VALIDATION — POST /api/invoices/{id}/validate
@router.post("/{invoice_id}/validate")
def validate(
    invoice_id:   int,
    feedback:     FeedbackRequest,
    db:           Session = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    from application.use_cases.validate_invoice import validate_invoice
    result = validate_invoice(db, invoice_id, feedback.corrections)
    if not result:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {
        "message": "✅ Facture validée",
        "invoice": result
    }


# 9. SUPPRESSION — DELETE /api/invoices/{id}
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
    db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).delete()
    db.commit()
    return {"message": "✅ Facture supprimée"}


# 10. DÉTAIL — GET /api/invoices/{id}  ← EN TOUT DERNIER
@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id:   int,
    db:           Session = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    invoice    = repository.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return invoice.to_dict()
