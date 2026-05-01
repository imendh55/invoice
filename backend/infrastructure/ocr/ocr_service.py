"""
infrastructure/ocr/ocr_service.py
Point d'entrée unique pour l'OCR.
Utilise Gemini Vision par défaut (remplace Tesseract).
"""
from pathlib import Path


def extract_text(file_path: str) -> str:
    """
    Extrait le texte brut d'une image via Gemini Vision.
    Fallback vers Tesseract si Gemini indisponible.
    """
    try:
        from infrastructure.ocr.gemini_ocr import extract_text_gemini
        return extract_text_gemini(file_path)
    except Exception as e:
        print(f"⚠️  Gemini indisponible, fallback Tesseract : {e}")
        from infrastructure.ocr.tesseract_ocr import extract_text_ocr
        return extract_text_ocr(file_path)


def extract_fields_from_image(file_path: str) -> dict:
    """
    Extraction DIRECTE des champs structurés depuis une image.
    Utilise Gemini Vision (OCR + extraction en une seule passe).
    C'est la fonction à privilégier pour les factures.
    """
    try:
        from infrastructure.ocr.gemini_ocr import extract_fields_gemini
        return extract_fields_gemini(file_path)
    except Exception as e:
        print(f"⚠️  Gemini indisponible, fallback regex : {e}")
        text = extract_text(file_path)
        from application.use_cases.extract_fields import extract_fields
        return extract_fields(text)
