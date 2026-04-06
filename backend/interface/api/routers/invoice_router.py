from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from collections import defaultdict

# Dependencies
from core.db import get_db
from interface.dependencies.auth import get_current_user

# Use Cases
from application.use_cases.upload_invoice import process_upload
from application.use_cases.search_invoices import search_invoices
from application.use_cases.export_invoice import export_to_csv, export_to_json
from application.use_cases.validate_invoice import validate_invoice

# Schemas
from interface.api.schemas.invoice_schema import InvoiceResponse, FeedbackRequest

router = APIRouter(
    prefix="/invoices",
    tags=["Factures"]
)

# ====================== STATS DASHBOARD ======================
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    all_invoices = repository.list_all(limit=10000)

    total = len(all_invoices)
    en_cours = len([i for i in all_invoices if i.status == "en_cours"])
    validees = len([i for i in all_invoices if i.status == "validated"])
    rejetees = len([i for i in all_invoices if i.status == "rejected"])

    monthly_counts = defaultdict(int)
    for inv in all_invoices:
        if inv.upload_date:
            month_key = inv.upload_date.strftime("%b")
            monthly_counts[month_key] += 1

    monthly_data = [{"month": month, "count": count} for month, count in monthly_counts.items()]

    return {
        "totalInvoices": total,
        "enCours": en_cours,
        "validees": validees,
        "rejetees": rejetees,
        "monthlyData": monthly_data,
    }


# ====================== UPLOAD ======================
@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    try:
        result = process_upload(file, db)
        return {
            "message": "✅ Facture uploadée et traitée avec succès",
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ====================== HISTORIQUE ======================
@router.get("/history")
def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)

    if query:
        all_invoices = repository.search(query, limit=10000)
    else:
        all_invoices = repository.list_all(limit=10000, status=status)

    if query and status:
        all_invoices = [i for i in all_invoices if i.status == status]

    total = len(all_invoices)
    total_pages = max(1, (total + limit - 1) // limit)
    start = (page - 1) * limit
    page_items = all_invoices[start:start + limit]

    return {
        "items": [inv.to_dict() for inv in page_items],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
    }


# ====================== DÉTAIL FACTURE (CORRIGÉ) ======================
@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Récupère les détails d'une facture - Mapping corrigé pour le frontend"""
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    invoice = repository.get_by_id(invoice_id)

    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    data = invoice.to_dict()

    # Mapping explicite pour éviter l'erreur de validation Pydantic
    return {
        "id": data["id"],
        "filename": data.get("fileName") or data.get("filename"),
        "filePath": data.get("filePath"),
        "status": data.get("status"),
        "extracted_data": data.get("extractedData"),   # ← correction clé
        "createdAt": data.get("createdAt"),
        "totalTTC": data.get("total_ttc") or data.get("totalTTC"),
    }


# ====================== AUTRES ROUTES (inchangées) ======================
@router.get("/search")
def search(
    keyword: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return search_invoices(db, keyword=keyword, limit=limit)


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    csv_content = export_to_csv(db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=factures.csv"}
    )


@router.get("/export/json")
def export_json(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return export_to_json(db)


@router.post("/{invoice_id}/validate")
def validate(
    invoice_id: int,
    feedback: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    result = validate_invoice(db, invoice_id, feedback.corrections)
    if not result:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {"message": "✅ Facture validée", "invoice": result}


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
    repository = SqlInvoiceRepository(db)
    invoice = repository.get_by_id(invoice_id)

    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    from infrastructure.database.models import InvoiceModel
    db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).delete()
    db.commit()

    return {"message": "✅ Facture supprimée avec succès"}