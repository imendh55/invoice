import os
from datetime import datetime
from fastapi import UploadFile

UPLOAD_FOLDER = "uploads"

def save_uploaded_file(file: UploadFile) -> str:
    # Crée le dossier uploads s'il n'existe pas
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Nom du fichier : date + nom original
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    # Sauvegarde le fichier
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
    
    return filename  # On retourne le nom pour plus tard