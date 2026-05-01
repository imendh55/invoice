"""
interface/api/routers/invoice_router.py
Router factures — Pipeline complet : OpenCV → Gemini.
"""
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


# ─────────────────────────────────────────────────────────────
# Helper : InvoiceModel → dict frontend (camelCase complet)
# ─────────────────────────────────────────────────────────────
def _to_dict(inv: InvoiceModel) -> dict:
    raw = inv.extracted_data or {}
    return {
        "id":       inv.id,
        "fileName": inv.filename,
        "filePath": inv.path,
        "status":   inv.status,
        "extractedData": {
            "fournisseur":   raw.get("fournisseur")   or raw.get("supplier",       ""),
            "numeroFacture": raw.get("numeroFacture") or raw.get("invoice_number", ""),
            "date":          raw.get("date",          ""),
            "client":        raw.get("client",        ""),
            "totalHT":       raw.get("totalHT")  or raw.get("total_ht"),
            "tva":           raw.get("tva")       or raw.get("total_tva"),
            "totalTTC":      raw.get("totalTTC")  or raw.get("total_ttc") or inv.total_ttc,
            "adresseFournisseur": raw.get("adresseFournisseur", ""),
            "adresseClient":      raw.get("adresseClient",      ""),
            "produits":      raw.get("produits",  []),
            # ✅ Texte brut OCR
            "rawText":       raw.get("rawText") or raw.get("raw_text", ""),
            # ✅ Score de confiance et alertes
            "confidence_score":    raw.get("confidence_score"),
            "validation_errors":   raw.get("validation_errors",   []),
            "validation_warnings": raw.get("validation_warnings", []),
        },
        "validatedData": inv.validated_data or {},
        "total_ttc":     inv.total_ttc,
        "createdAt":     inv.upload_date.isoformat() if inv.upload_date else None,
    }


# ─────────────────────────────────────────────────────────────
# Pipeline commun upload / reprocess
# ─────────────────────────────────────────────────────────────
def _run_pipeline(image_path: str) -> tuple[dict, float | None, str]:
    """
    Lance OpenCV + Gemini sur image_path.
    Retourne (extracted_data, total_ttc, status).
    """
    extracted_data: dict = {}
    total_ttc = None
    status = "uploaded"

    # ── Prétraitement OpenCV ──────────────────────────────────
    processed_path = image_path
    try:
        from infrastructure.preprocess import preprocess_for_gemini
        processed_path = preprocess_for_gemini(image_path)
        print(f"✅ OpenCV OK : {processed_path}")
    except Exception as e:
        print(f"⚠️  OpenCV échoué ({e}) — image originale utilisée")

    # ── Gemini Extraction ─────────────────────────────────────
    try:
        from infrastructure.ocr.gemini_ocr import extract_fields_gemini, validate_invoice_gemini

        fields = extract_fields_gemini(processed_path)
        has_data = fields and any(
            v is not None
            for k, v in fields.items()
            if k not in ("produits", "raw_text")
        )

        if has_data:
            # Validation Gemini
            try:
                validation = validate_invoice_gemini(fields)
                fields["confidence_score"]    = validation.get("confidence_score", 0.8)
                fields["validation_errors"]   = validation.get("errors",   [])
                fields["validation_warnings"] = validation.get("warnings", [])
                suggestions = validation.get("suggestions", {})
                for key, fe_key in [("total_ht", "totalHT"), ("total_ttc", "totalTTC"), ("total_tva", "tva")]:
                    if suggestions.get(key):
                        fields[key]   = suggestions[key]
                        fields[fe_key] = suggestions[key]
            except Exception as e:
                print(f"⚠️  Validation échouée : {e}")
                fields.setdefault("confidence_score",    0.7)
                fields.setdefault("validation_errors",   [])
                fields.setdefault("validation_warnings", [])

            # Renommer raw_text → rawText pour la BDD
            fields["rawText"] = fields.pop("raw_text", "")

            extracted_data = fields
            total_ttc = fields.get("total_ttc") or fields.get("totalTTC")
            status = "extracted"
            print(f"✅ Pipeline OK : {len(fields.get('produits', []))} produit(s), TTC={total_ttc}")

        else:
            print("⚠️  Gemini : données vides — statut conservé à 'uploaded'")
            # Conserver au moins le texte brut
            extracted_data = {"rawText": fields.get("raw_text", "") if fields else ""}

    except Exception as e:
        print(f"⚠️  Gemini échoué ({e}) — fallback Tesseract/regex")
        try:
            from infrastructure.ocr.ocr_service import extract_text
            from application.use_cases.extract_fields import extract_fields
            text = extract_text(processed_path)
            if text.strip():
                extracted_data = extract_fields(text)
                extracted_data["rawText"] = text
                total_ttc = extracted_data.get("total_ttc")
                status = "extracted"
                print("✅ Fallback regex OK")
        except Exception as e2:
            print(f"❌ Fallback échoué : {e2}")

    return extracted_data, total_ttc, status


# ─────────────────────────────────────────────────────────────
# ROUTES STATIQUES
# ─────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    total     = db.query(InvoiceModel).count()
    uploaded  = db.query(InvoiceModel).filter(InvoiceModel.status == "uploaded").count()
    extracted = db.query(InvoiceModel).filter(InvoiceModel.status == "extracted").count()
    validees  = db.query(InvoiceModel).filter(InvoiceModel.status == "validated").count()
    rejetees  = db.query(InvoiceModel).filter(InvoiceModel.status == "rejected").count()
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
    current_user: str     = Depends(get_current_user),
):
    q = db.query(InvoiceModel)
    if status:
        q = q.filter(InvoiceModel.status == status)
    if query:
        kw = f"%{query}%"
        q = q.filter(
            InvoiceModel.filename.ilike(kw)
            | InvoiceModel.extracted_data.cast(str).ilike(kw)
        )
    total = q.count()
    items = q.order_by(desc(InvoiceModel.upload_date)).offset((page - 1) * limit).limit(limit).all()
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
    current_user: str      = Depends(get_current_user),
):
    q = db.query(InvoiceModel)
    if keyword:
        kw = f"%{keyword}%"
        q = q.filter(
            InvoiceModel.filename.ilike(kw)
            | InvoiceModel.extracted_data.cast(str).ilike(kw)
        )
    return [_to_dict(i) for i in q.order_by(desc(InvoiceModel.upload_date)).limit(limit).all()]


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Fichier", "Statut", "Fournisseur", "N° Facture", "Date", "Total TTC", "Confiance"])
    for inv in db.query(InvoiceModel).order_by(desc(InvoiceModel.upload_date)).all():
        d = inv.extracted_data or {}
        writer.writerow([
            inv.id, inv.filename, inv.status,
            d.get("fournisseur") or d.get("supplier", ""),
            d.get("numeroFacture") or d.get("invoice_number", ""),
            d.get("date", ""),
            inv.total_ttc or "",
            d.get("confidence_score", ""),
        ])
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=factures.csv"},
    )


@router.get("/export/json")
def export_json(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    return [_to_dict(i) for i in db.query(InvoiceModel).order_by(desc(InvoiceModel.upload_date)).all()]


# ─────────────────────────────────────────────────────────────
# UPLOAD
# ─────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(400, "Nom de fichier manquant")
    if not file.filename.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
        raise HTTPException(400, "Format non supporté (PDF, PNG, JPG, JPEG)")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop grand (max 10 MB)")

    uploads_dir = Path("uploads")
    uploads_dir.mkdir(exist_ok=True)
    safe_filename = f"{int(time.time())}_{file.filename}"
    file_path = uploads_dir / safe_filename
    file_path.write_bytes(content)

    image_path = str(file_path)
    if file.filename.lower().endswith(".pdf"):
        image_path = _pdf_to_image(str(file_path)) or str(file_path)

    extracted_data, total_ttc, status = _run_pipeline(image_path)

    db_invoice = InvoiceModel(
        filename=safe_filename,
        path=f"uploads/{safe_filename}",
        status=status,
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
        "confidence":    extracted_data.get("confidence_score"),
        "message":       "✅ Facture traitée avec succès",
    }


# ─────────────────────────────────────────────────────────────
# RE-TRAITER une facture existante
# ─────────────────────────────────────────────────────────────

@router.post("/{invoice_id}/reprocess")
def reprocess_invoice(
    invoice_id: int,
    db:         Session = Depends(get_db),
    current_user: str   = Depends(get_current_user),
):
    """Re-lance le pipeline OCR/Gemini sur une facture déjà en base."""
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Facture non trouvée")

    file_path = Path(inv.path)
    if not file_path.exists():
        raise HTTPException(404, f"Fichier introuvable : {inv.path}")

    image_path = str(file_path)
    if inv.filename.lower().endswith(".pdf"):
        image_path = _pdf_to_image(str(file_path)) or str(file_path)

    extracted_data, total_ttc, status = _run_pipeline(image_path)

    inv.extracted_data = extracted_data
    inv.total_ttc      = total_ttc
    inv.status         = status
    db.commit()
    db.refresh(inv)

    return {
        "message": f"✅ Facture re-traitée → statut : {status}",
        "invoice": _to_dict(inv),
    }


# ─────────────────────────────────────────────────────────────
# Helper PDF → Image
# ─────────────────────────────────────────────────────────────

def _pdf_to_image(pdf_path: str) -> str | None:
    try:
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=1)
        if not images:
            return None
        img_path = pdf_path.replace(".pdf", "_page1.png")
        images[0].save(img_path, "PNG")
        print(f"✅ PDF → PNG : {img_path}")
        return img_path
    except Exception as e:
        print(f"❌ PDF conversion : {e}")
        return None


# ─────────────────────────────────────────────────────────────
# ROUTES AVEC PARAMÈTRES
# ─────────────────────────────────────────────────────────────

@router.get("/")
def list_invoices(
    limit: int    = Query(50, ge=1, le=200),
    db:    Session = Depends(get_db),
    current_user: str = Depends(get_current_user),
):
    return [
        _to_dict(i)
        for i in db.query(InvoiceModel).order_by(desc(InvoiceModel.upload_date)).limit(limit).all()
    ]


@router.post("/{invoice_id}/validate")
def validate(
    invoice_id: int,
    feedback:   FeedbackRequest,
    db:         Session = Depends(get_db),
    current_user: str   = Depends(get_current_user),
):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Facture non trouvée")

    corrections = dict(feedback.corrections)
    is_reject   = corrections.pop("_status", None) == "rejected"

    if is_reject:
        inv.status = "rejected"
    else:
        inv.validated_data = corrections
        inv.status         = "validated"
        ttc = corrections.get("totalTTC") or corrections.get("total_ttc")
        if ttc:
            try:
                inv.total_ttc = float(ttc)
            except Exception:
                pass

    db.commit()
    db.refresh(inv)
    return {"message": f"✅ Facture {'rejetée' if is_reject else 'validée'}", "invoice": _to_dict(inv)}


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db:         Session = Depends(get_db),
    current_user: str   = Depends(get_current_user),
):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Facture non trouvée")
    db.delete(inv)
    db.commit()
    return {"message": "✅ Facture supprimée"}


@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db:         Session = Depends(get_db),
    current_user: str   = Depends(get_current_user),
):
    inv = db.query(InvoiceModel).filter(InvoiceModel.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, "Facture non trouvée")
    return _to_dict(inv)
