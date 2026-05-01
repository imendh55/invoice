"""
infrastructure/preprocess.py
Pipeline de prétraitement OpenCV pour améliorer la qualité des images
avant envoi à Gemini Vision.
"""
import cv2
import numpy as np
from pathlib import Path


def preprocess_image(image_path: str) -> str:
    """
    Pipeline complet de prétraitement OpenCV.

    Étapes :
      1. Chargement et vérification
      2. Conversion en niveaux de gris
      3. Débruitage (fastNlMeansDenoising)
      4. Amélioration du contraste (CLAHE)
      5. Correction de l'inclinaison (deskew)
      6. Binarisation adaptative (Otsu)
      7. Suppression des petits bruits (morphologie)

    Retourne : chemin de l'image traitée (_processed.png)
    """
    img = cv2.imread(image_path)

    # ── Vérification ─────────────────────────────────────────
    if img is None:
        print(f"⚠️  Impossible de lire l'image : {image_path}")
        return image_path

    # ── 1. Niveaux de gris ───────────────────────────────────
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── 2. Débruitage ────────────────────────────────────────
    denoised = cv2.fastNlMeansDenoising(
        gray,
        h=10,
        templateWindowSize=7,
        searchWindowSize=21
    )

    # ── 3. Amélioration du contraste (CLAHE) ─────────────────
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # ── 4. Correction inclinaison (deskew) ───────────────────
    deskewed = _deskew(enhanced)

    # ── 5. Binarisation adaptative (Otsu + Gaussien) ─────────
    _, otsu = cv2.threshold(
        deskewed, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # ── 6. Morphologie : suppression petits bruits ───────────
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    cleaned = cv2.morphologyEx(otsu, cv2.MORPH_OPEN, kernel)

    # ── 7. Mise à l'échelle si trop petite ───────────────────
    h, w = cleaned.shape
    if w < 1000:
        scale = 1000 / w
        cleaned = cv2.resize(
            cleaned,
            (int(w * scale), int(h * scale)),
            interpolation=cv2.INTER_CUBIC
        )

    # ── Sauvegarde ───────────────────────────────────────────
    path = Path(image_path)
    processed_path = str(path.parent / f"{path.stem}_processed.png")
    cv2.imwrite(processed_path, cleaned)

    print(f"✅ Prétraitement OK → {processed_path}")
    return processed_path


def _deskew(gray: np.ndarray) -> np.ndarray:
    """
    Détecte et corrige l'inclinaison d'une image via les coordonnées
    des pixels non-nuls (projection de Hough simplifiée).
    """
    try:
        # Binarisation temporaire pour la détection
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        coords = np.column_stack(np.where(binary > 0))

        if len(coords) < 100:
            return gray  # Pas assez de pixels pour estimer l'angle

        angle = cv2.minAreaRect(coords)[-1]

        # Correction de l'angle (OpenCV donne des angles dans [-90, 0])
        if angle < -45:
            angle = 90 + angle
        elif angle > 45:
            angle = angle - 90

        # Si l'inclinaison est négligeable, ne rien faire
        if abs(angle) < 0.5:
            return gray

        h, w = gray.shape
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            gray, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        print(f"   ↪ Deskew: correction de {angle:.2f}°")
        return rotated

    except Exception as e:
        print(f"⚠️  Deskew échoué : {e}")
        return gray


def preprocess_for_gemini(image_path: str) -> str:
    """
    Version légère du prétraitement : pas de binarisation agressive.
    Gemini Vision fonctionne mieux avec des images en couleurs ou en
    niveaux de gris naturels (pas binarisées à 100%).
    Recommandé pour les factures avec logos, couleurs, tableaux.
    """
    img = cv2.imread(image_path)

    if img is None:
        return image_path

    # Niveaux de gris
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Débruitage léger
    denoised = cv2.fastNlMeansDenoising(gray, h=7)

    # CLAHE pour le contraste
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Deskew
    deskewed = _deskew(enhanced)

    # Upscale si nécessaire (Gemini préfère les images ≥ 1000px)
    h, w = deskewed.shape
    if w < 1000:
        scale = 1000 / w
        deskewed = cv2.resize(
            deskewed,
            (int(w * scale), int(h * scale)),
            interpolation=cv2.INTER_CUBIC
        )

    # Reconvertir en BGR pour sauvegarder en PNG couleur
    # (Gemini analyse mieux les images non binarisées)
    output = cv2.cvtColor(deskewed, cv2.COLOR_GRAY2BGR)

    path = Path(image_path)
    processed_path = str(path.parent / f"{path.stem}_processed.png")
    cv2.imwrite(processed_path, output)

    print(f"✅ Prétraitement Gemini OK → {processed_path}")
    return processed_path
