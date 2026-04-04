<<<<<<< HEAD
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .base import Base
from typing import Optional, Dict, Any
import json


# ====================== USER MODEL ======================
=======
from sqlalchemy import Column, Integer, String, DateTime, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class InvoiceModel(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    path = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="uploaded")
    extracted_data = Column(JSON, default={})
    validated_data = Column(JSON, default={})
    total_ttc = Column(Float, nullable=True)
    feedback = Column(JSON, default={})

>>>>>>> origin/main
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
<<<<<<< HEAD

    nom = Column(String, nullable=True)
    prenom = Column(String, nullable=True)
    cin = Column(String, nullable=True)
    date_anniversaire = Column(DateTime, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User {self.username}>"


# ====================== INVOICE MODEL ======================
class InvoiceModel(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)           # chemin complet du fichier
    original_filename = Column(String, nullable=True)

    # Données extraites par l'OCR
    fournisseur = Column(String, nullable=True)
    date_facture = Column(DateTime, nullable=True)
    numero_facture = Column(String, nullable=True)
    total_ht = Column(Float, nullable=True)
    total_tva = Column(Float, nullable=True)
    total_ttc = Column(Float, nullable=True)

    # Statut du traitement
    statut = Column(String, default="EN_COURS")   # EN_COURS, VALIDEE, CORRIGEE, REJETEE, EN_ATTENTE
    confidence_score = Column(Float, default=0.0)

    # Données brutes (stockées en JSON string)
    raw_data = Column(Text, nullable=True)

    # Lien avec l'utilisateur (optionnel pour le moment)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relation avec User (décommenter si besoin plus tard)
    # user = relationship("User", back_populates="invoices")

    def __repr__(self):
        return f"<Invoice {self.id} - {self.fournisseur or 'N/A'}>"

    def to_dict(self) -> Dict[str, Any]:
        """Convertit le modèle en dictionnaire compatible avec le frontend"""
        try:
            extracted = json.loads(self.raw_data) if self.raw_data else {}
        except:
            extracted = {}

        return {
            "id": self.id,
            "fileName": self.filename,
            "originalFilename": self.original_filename,
            "filePath": self.file_path,
            "status": self.statut.lower() if self.statut else "en_cours",
            "confidenceScore": round(self.confidence_score or 0.0, 2),
            "fournisseur": self.fournisseur,
            "numeroFacture": self.numero_facture,
            "date": self.date_facture.isoformat() if self.date_facture else None,
            "totalHT": self.total_ht,
            "totalTVA": self.total_tva,
            "totalTTC": self.total_ttc,
            "extractedData": extracted,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
=======
    created_at = Column(DateTime, default=datetime.utcnow)
>>>>>>> origin/main
