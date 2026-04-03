from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from domain.entities.invoice import Invoice
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.storage.file_storage import save_uploaded_file
from infrastructure.preprocess import preprocess_image
from infrastructure.ocr.ocr_service import extract_text
from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository

def process_upload(file: UploadFile, db: Session) -> dict:
    """Use case principal : upload + preprocess + OCR + extraction + sauvegarde"""

    if not file.filename.lower().endswith(('.pdf', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Seuls PDF et images (PNG, JPG, JPEG) sont acceptés")

    # 1. Sauvegarde du fichier
    filename = save_uploaded_file(file)
    original_path = f"uploads/{filename}"

    # 2. Preprocess (seulement pour les images)
    processed_path = original_path
    if file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
        processed_path = preprocess_image(original_path)

    # 3. Extraction texte via OCR service
    text = extract_text(processed_path)

    # 4. Extraction des champs (regex pour l'instant)
    from application.use_cases.extract_fields import extract_fields  # import ici pour éviter circular
    fields = extract_fields(text)
    total_ttc = fields.get("total_ttc")

    # 5. Création de l'entité domaine
    invoice_entity = Invoice(
        filename=filename,
        path=original_path,
        status="extracted",
        extracted_data=fields,
        total_ttc=total_ttc
    )

    # 6. Sauvegarde via repository
    repository: InvoiceRepository = SqlInvoiceRepository(db)
    saved_invoice = repository.save(invoice_entity)

    return {
        "id": saved_invoice.id,
        "filename": saved_invoice.filename,
        "status": saved_invoice.status,
        "extracted_data": saved_invoice.extracted_data,
        "total_ttc": saved_invoice.total_ttc
    }
