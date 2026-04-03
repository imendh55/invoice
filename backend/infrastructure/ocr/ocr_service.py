from infrastructure.ocr.tesseract_ocr import extract_text_ocr

def extract_text(file_path: str) -> str:
    """Service OCR - Tesseract tawa (Azure ba3d)"""
    return extract_text_ocr(file_path)
