import os
from datetime import datetime
from fastapi import UploadFile

UPLOAD_FOLDER = "uploads"

def save_uploaded_file(file: UploadFile) -> str:
    """Sauvegarde le fichier uploadé"""
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    return filename
