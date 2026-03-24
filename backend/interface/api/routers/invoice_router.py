from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from infrastructure.storage.file_storage import save_uploaded_file
from infrastructure.database.database import get_db
from infrastructure.database.models import Invoice
from application.use_cases.preprocess_invoice import preprocess_image
from infrastructure.ocr.tesseract_ocr import extract_text_ocr
from application.use_cases.extract_fields_llm import extract_fields
from application.use_cases.validate_invoice import validate_invoice
from application.use_cases.get_invoice_history import get_invoice_history
from application.use_cases.search_invoices import search_invoices
from application.use_cases.export_invoice import export_to_csv, export_to_json
from application.use_cases.submit_feedback import submit_feedback

router = APIRouter(prefix="/invoices", tags=["Factures"])

@router.post("/upload")
async def upload_invoice(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Seuls PDF et images acceptés")
    
    saved_filename = save_uploaded_file(file)
    original_path = f"uploads/{saved_filename}"
    
    if file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        processed_path = preprocess_image(original_path)
    else:
        processed_path = original_path
    
    extracted_text = extract_text_ocr(processed_path)
    fields = extract_fields(extracted_text)
    total_ttc = fields.get("total_ttc")
    
    invoice = Invoice(
        filename=saved_filename,
        path=original_path,
        status="extracted",
        extracted_data=fields,
        total_ttc=total_ttc
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return {
        "message": "✅ Facture uploadée + traitée",
        "id": invoice.id,
        "filename": saved_filename,
        "extracted_data": fields
    }

@router.get("/history")
def history(limit: int = 20, status: Optional[str] = None, db: Session = Depends(get_db)):
    return get_invoice_history(db, limit=limit, status=status)

@router.get("/search")
def search(keyword: Optional[str] = None, limit: int = 20, db: Session = Depends(get_db)):
    return search_invoices(db, keyword=keyword, limit=limit)

@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    csv_content = export_to_csv(db)
    return Response(content=csv_content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=factures.csv"})

@router.get("/export/json")
def export_json(db: Session = Depends(get_db)):
    return export_to_json(db)

@router.post("/{invoice_id}/feedback")
def submit_feedback_endpoint(invoice_id: int, corrections: dict, db: Session = Depends(get_db)):
    """Apprentissage continu : l'utilisateur envoie ses corrections"""
    invoice = submit_feedback(db, invoice_id, corrections)
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {"message": "✅ Corrections enregistrées - Merci ! Le système va s'améliorer.", "id": invoice.id}

@router.get("/{invoice_id}")
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return {
        "id": invoice.id,
        "filename": invoice.filename,
        "image_path": invoice.path,
        "status": invoice.status,
        "extracted_data": invoice.extracted_data,
        "validated_data": invoice.validated_data,
        "feedback": invoice.feedback
    }

@router.get("/")
def simple_list(db: Session = Depends(get_db)):
    invoices = db.query(Invoice).all()
    return [{"id": inv.id, "filename": inv.filename, "status": inv.status} for inv in invoices]