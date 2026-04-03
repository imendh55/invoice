import pytesseract
from PIL import Image

# Chemin Tesseract (badlou ken lazem)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_ocr(image_path: str) -> str:
    """Extrait le texte avec Tesseract"""
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(
            img,
            lang='fra+ara+eng',
            config='--oem 3 --psm 6'
        )
        return text.strip()
    except Exception as e:
        return f"Erreur OCR: {str(e)}"
