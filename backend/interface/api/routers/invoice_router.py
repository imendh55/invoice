from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from collections import defaultdict
from pathlib import Path
import time

from core.db import get_db
from interface.dependencies.auth import get_current_user
from interface.api.schemas.invoice_schema import FeedbackRequest
from infrastructure.database.models import InvoiceModel

router = APIRouter(prefix="/invoices", tags=["Factures"])


# ============================================================
# Helper — InvoiceModel → dict frontend complet
# ============================================================
def _to_dict(inv: InvoiceModel) -> dict:
    raw = inv.extracted_data or {}
    return {
        "id":       inv.id,
        "fileName": inv.filename,
        "filePath": inv.path,
        "status":   inv.status,
        "extractedData": {
            "fournisseur":   raw.get("fournisseur")   or raw.get("supplier",        ""),
            "numeroFacture": raw.get("numeroFacture")  or raw.get("invoice_number",  ""),
            "date":          raw.get("date",           ""),
            "client":        raw.get("client",         ""),
            "totalHT":       raw.get("totalHT")   or raw.get("total_ht"),
            "tva":           raw.get("tva")        or raw.get("total_tva"),
            "totalTTC":      raw.get("totalTTC")   or raw.get("total_ttc") or inv.total_ttc,
            "rawText":       raw.get("raw_text",   ""),
            # ✅ PRODUITS — champ obligatoire pour le tableau
            "produits":      raw.get("produits",   []),
        },
        "validatedData": inv.validated_data or {},
        "total_ttc":     inv.total_ttc,
        "createdAt":     inv.upload_date.isoformat() if inv.upload_date else None,
    }


# ============================================================
# ROUTES STATIQUES — avant les routes avec paramètres
# ============================================================

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    total    = db.query(InvoiceModel).count()
    uploaded = db.query(InvoiceModel).filter(InvoiceModel.status == "uploaded").count()
    extracted= db.query(InvoiceModel).filter(InvoiceModel.status == "extracted").count()
    validees = db.query(InvoiceModel).filter(InvoiceModel.status == "validated").count()
    rejetees = db.query(InvoiceModel).filter(InvoiceModel.status == "rejected").count()
    monthly: dict = defaultdict(int)
    for inv in db.query(InvoiceModel).all():
        if inv.upload_date:
            monthly[inv.upload_date.strftime("%b")] += 1
    return {
        "totalInvoices": total,
        "enCours":       uploaded + extracted,
        "validees":      validees,
        "rejetees":      rejetees,
        "monthlyData":   [{"month": m, "count": c} for m, c in monthly.items()],
    }


@router.get("/history")
def get_history(
    page:   int           = Query(1, ge=1),
    limit:  int           = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    query:  Optional[str] = Query(None),
    db:     Session       = Depends(get_db),
    current_user: str     = Depends(get_current_user)
):
    q = db.query(InvoiceModel)
    if status:
        q = q.filter(InvoiceModel.status == status)
    if query:
        kw = f"%{query}%"
        q = q.filter(InvoiceModel.filename.ilike(kw) | InvoiceModel.extracted_data.cast(str).ilike(kw))
    total = q.count()
    items = q.order_by(desc(InvoiceModel.upload_date)).offset((page-1)*limit).limit(limit).all()
    return {
        "items":      [_to_dict(i) for i in items],
        "total":      total,
        "page":       page,
        "limit":      limit,
        "totalPages": max(1, (total + limit - 1) // limit),
    }


@router.get("/search")
def search(
    keyword: Optional[str] = Query(None),
    limit:   int           = Query(20, ge=1, le=100),
    db:      Session       = Depends(get_db),
    current_user: str      = Depends(get_current_user)
):
    q = db.query(InvoiceModel)
    if keyword:
        kw = f"%{keyword}%"
        q = q.filter(InvoiceModel.filename.ilike(kw) | InvoiceModel.extracted_data.cast(str).ilike(kw))
    return [_to_dict(i) for i in q.order_by(desc(InvoiceModel.upload_date)).limit(limit).all()]


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Fichier", "Statut", "Fournisseur", "N° Facture", "Date", "Total TTC"])
    for inv in db.query(InvoiceModel).order_by(desc(InvoiceModel.upload_date)).all():
        d = inv.extracted_data or {}
        writer.writerow([inv.id, inv.filename, inv.status,
                         d.get("fournisseur") or d.get("supplier", ""),
                         d.get("numeroFacture") or d.get("invoice_number", ""),
                         d.get("date", ""), inv.total_ttc or ""])
    return Response(content=output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=factures.csv"})


@router.get("/export/json")
def export_json(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return [_to_dict(i) for i in db.query(InvoiceModel).order_by(desc(InvoiceModel.upload_date)).all()]


@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nom de fichier manquant")
    if not file.filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Format non supporté (PDF, PNG, JPG, JPEG)")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop grand (max 10 MB)")

    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    safe_filename = f"{int(time.time())}_{file.filename}"
    file_path = uploads_dir / safe_filename
    with open(file_path, "wb") as f:
        f.write(content)

    extracted_data: dict = {}
    total_ttc = None
    try:
        from infrastructure.preprocess import preprocess_image
        from infrastructure.ocr.ocr_service import extract_text
        from application.use_cases.extract_fields import extract_fields

        processed = str(file_path)
        if file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            try:
                processed = preprocess_image(str(file_path))
            except Exception as e:
                print(f"⚠️ Preprocess: {e}")

        text = extract_text(processed)
        if text and text.strip():
            fields = extract_fields(text)
            extracted_data = fields
            total_ttc = fields.get("total_ttc")
            nb_prods = len(fields.get("produits", []))
            print(f"✅ OCR OK — {nb_prods} produit(s) extrait(s)")
        else:
            print("⚠️ OCR : texte vide")
    except Exception as e:
        print(f"⚠️ OCR échoué : {e}")

    db_invoice = InvoiceModel(
        filename=safe_filename,
        path=f"uploads/{safe_filename}",
        status="extracted" if extracted_data else "uploaded",
        extracted_data=extracted_data,
        total_ttc=total_ttc,
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)

    return {
        "id":            db_invoice.id,
        "fileName":      db_invoice.filename,
        "status":        db_invoice.status,
        "extractedData": db_invoice.extracted_data,
        "total_ttc":     db_invoice.total_ttc,
        "message":       "✅ Facture uploadée avec succès",
    }


@router.get("/")
def list_invoices(
    limit: int = Query(50, ge=1, le=200),
    db:    Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    return [_to_dict(i) for i in db.query(InvoiceModel).order_by(desc(InvoiceModel.upload_date)).limit(limit).all()]


# ============================================================
# ROUTES AVEC PARAMÈTRES — TOUJOURS EN DERNIER
# ============================================================

@router.post("/{invoice_id}/validate")
def validate(
    invoice_id: int,
    feedback:   FeedbackRequest,
    db:         Session = Depends(get_db),
    current_user: str   = Depends(get_current_user)
):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Facture non trouvée")

    corrections = dict(feedback.corrections)
    is_reject   = corrections.pop("_status", None) == "rejected"

    if is_reject:
        inv.status = "rejected"
    else:
        inv.validated_data = corrections
        inv.status         = "validated"
        ttc = corrections.get("totalTTC") or corrections.get("total_ttc")
        if ttc:
            try: inv.total_ttc = float(ttc)
            except Exception: pass

    db.commit()
    db.refresh(inv)
    msg = "rejetée" if is_reject else "validée"
    return {"message": f"✅ Facture {msg}", "invoice": _to_dict(inv)}


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db:         Session = Depends(get_db),
    current_user: str   = Depends(get_current_user)
):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    db.delete(inv)
    db.commit()
    return {"message": "✅ Facture supprimée"}


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db:         Session = Depends(get_db),
    current_user: str   = Depends(get_current_user)
):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return _to_dict(inv)
