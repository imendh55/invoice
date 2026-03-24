import pytesseract
from PIL import Image

# Chemin de Tesseract (change si ton installation est ailleurs)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_ocr(image_path: str) -> str:
    """
    Extrait le texte de l'image avec Tesseract
    """
    try:
        img = Image.open(image_path)
        # Configuration adaptée aux factures (meilleure précision)
        text = pytesseract.image_to_string(
            img,
            lang='fra+ara+eng',      # français + arabe + anglais
            config='--oem 3 --psm 6' # mode factures / documents structurés
        )
        return text.strip()
    except Exception as e:
        return f"Erreur OCR : {str(e)}"