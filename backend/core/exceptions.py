from fastapi import HTTPException

class InvoiceNotFound(HTTPException):
    def __init__(self):
        super().__init__(status_code=404, detail="Facture non trouvée")

class InvalidFileType(HTTPException):
    def __init__(self):
        super().__init__(status_code=400, detail="Seuls les fichiers PDF et images (PNG, JPG, JPEG) sont acceptés")
