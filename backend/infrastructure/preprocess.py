import cv2
import numpy as np

def preprocess_image(image_path: str) -> str:
    """Améliore l'image pour meilleur OCR"""
    img = cv2.imread(image_path)
    if img is None:
        return image_path

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)

    processed_path = image_path.replace(".", "_processed.")
    cv2.imwrite(processed_path, enhanced)
    return processed_path
