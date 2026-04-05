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

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    nom = Column(String, nullable=True)
    prenom = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    dateAnniversaire = Column(String, nullable=True)
    cin = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
