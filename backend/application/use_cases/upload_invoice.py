"""
Use case: Upload et traitement initial d'une facture.
Gère l'upload, le preprocessing, l'OCR et l'extraction des données.
"""
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import time
import os
from typing import Dict, Any

from domain.entities.invoice import Invoice
from domain.repositories.invoice_repository import InvoiceRepository
from infrastructure.storage.file_storage import save_uploaded_file
from infrastructure.preprocess import preprocess_image
from infrastructure.ocr.ocr_service import extract_text
from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository


class UploadInvoiceUseCase:
    """Cas d'utilisation pour l'upload de facture."""

    def __init__(self, db: Session):
        self.db = db
        self.repository = SqlInvoiceRepository(db)

    def execute(self, file: UploadFile) -> Dict[str, Any]:
        """
        Exécute le processus complet d'upload:
        1. Validation du fichier
        2. Sauvegarde
        3. Preprocessing (si image)
        4. OCR
        5. Extraction des champs
        6. Sauvegarde en base

        Returns:
            Dict avec les informations de la facture créée
        """

        # ── 1. Validation du fichier ─────────────────────────
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="Nom de fichier manquant"
            )

        valid_extensions = ('.pdf', '.png', '.jpg', '.jpeg')
        if not file.filename.lower().endswith(valid_extensions):
            raise HTTPException(
                status_code=400,
                detail=f"Format non supporté. Utilisez: {', '.join(valid_extensions)}"
            )

        # Vérifier la taille (max 10MB)
        MAX_SIZE = 10 * 1024 * 1024  # 10MB

        # Lire le contenu pour vérifier la taille
        content = file.file.read()
        if len(content) > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Fichier trop grand (max 10MB)"
            )

        # ── 2. Sauvegarde du fichier ────────────────────────
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)

        # Générer un nom unique
        timestamp = int(time.time())
        ext = Path(file.filename).suffix
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = uploads_dir / safe_filename

        # Écrire le fichier
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        original_path = f"uploads/{safe_filename}"

        # ── 3. Preprocessing (seulement pour les images) ────
        processed_path = original_path
        is_image = file.filename.lower().endswith(('.png', '.jpg', '.jpeg'))

        if is_image:
            try:
                processed_path = preprocess_image(str(file_path))
            except Exception as e:
                # Si le preprocessing échoue, utiliser l'original
                print(f"⚠️  Preprocessing échoué: {e}")
                processed_path = original_path

        # ── 4. Extraction texte via OCR ─────────────────────
        extracted_text = ""
        try:
            if file.filename.lower().endswith('.pdf'):
                # Pour PDF, utiliser pdf2image + OCR
                from pdf2image import convert_from_path
                import tempfile

                with tempfile.TemporaryDirectory() as tmpdir:
                    images = convert_from_path(str(file_path), output_folder=tmpdir)
                    for img in images:
                        extracted_text += extract_text(img)
            else:
                # Pour images, OCR direct
                extracted_text = extract_text(processed_path)

        except Exception as e:
            print(f"⚠️  OCR échoué: {e}")
            extracted_text = ""

        # ── 5. Extraction des champs (regex/NLP) ────────────
        fields = self._extract_fields(extracted_text)

        # ── 6. Création de l'entité domaine ─────────────────
        invoice_entity = Invoice(
            file_name=safe_filename,
            file_path=original_path,
            file_size=len(content),
            status="extracted" if extracted_text else "uploaded",
            extracted_data={
                **fields,
                "rawText": extracted_text
            },
            total_ttc=fields.get("total_ttc") or fields.get("totalTTC")
        )

        # ── 7. Sauvegarde via repository ────────────────────
        saved_invoice = self.repository.save(invoice_entity)

        return {
            "id": saved_invoice.id,
            "filename": saved_invoice.file_name,
            "status": saved_invoice.status,
            "extracted_data": saved_invoice.extracted_data,
            "total_ttc": saved_invoice.total_amount,
            "message": "Facture uploadée avec succès"
        }

    def _extract_fields(self, text: str) -> Dict[str, Any]:
        """
        Extrait les champs importants du texte OCR.
        Utilise des regex simples (à améliorer avec NLP/IA).
        """
        import re

        fields = {}

        if not text:
            return fields

        # Numéro de facture
        invoice_patterns = [
            r'N°\s*facture[:\s]+([A-Z0-9\-]+)',
            r'Facture\s*n°[:\s]+([A-Z0-9\-]+)',
            r'Invoice\s*number[:\s]+([A-Z0-9\-]+)',
        ]
        for pattern in invoice_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields['invoice_number'] = match.group(1).strip()
                break

        # Fournisseur
        supplier_patterns = [
            r'Fournisseur[:\s]+(.+?)(?:\n|$)',
            r'Émetteur[:\s]+(.+?)(?:\n|$)',
        ]
        for pattern in supplier_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                fields['supplier'] = match.group(1).strip()
                break

        # Total TTC
        total_patterns = [
            r'Total\s*TTC[:\s]+([\d\s,\.]+)\s*€',
            r'Total[:\s]+([\d\s,\.]+)\s*€',
            r'Montant\s*total[:\s]+([\d\s,\.]+)',
        ]
        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                total_str = match.group(1).replace(' ', '').replace(',', '.')
                try:
                    fields['total_ttc'] = float(total_str)
                except ValueError:
                    pass
                break

        # Date
        date_patterns = [
            r'Date[:\s]+(\d{2}[-/]\d{2}[-/]\d{4})',
            r'(\d{2}[-/]\d{2}[-/]\d{4})',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                fields['date'] = match.group(1)
                break

        return fields


# ── Fonction helper pour utilisation directe ───────────────
def process_upload(file: UploadFile, db: Session) -> dict:
    """Fonction utilitaire pour traiter un upload."""
    use_case = UploadInvoiceUseCase(db)
    return use_case.execute(file)
