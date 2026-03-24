import cv2
import numpy as np
import os

def preprocess_image(image_path: str) -> str:
    """
    Améliore l'image pour l'OCR : redressement + nettoyage + contraste
    Retourne le chemin de l'image traitée
    """
    # Charge l'image
    img = cv2.imread(image_path)
    if img is None:
        return image_path  # Si erreur, on garde l'original
    
    # 1. Passage en gris
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Suppression du bruit
    denoised = cv2.fastNlMeansDenoising(gray)
    
    # 3. Augmentation du contraste
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)
    
    # 4. Redressement simple (rotation si besoin)
    # (On peut ajouter du deskew plus avancé plus tard)
    
    # Sauvegarde la version traitée
    processed_path = image_path.replace(".", "_processed.")
    cv2.imwrite(processed_path, enhanced)
    
    return processed_path