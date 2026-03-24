from sqlalchemy import Column, Integer, String, DateTime, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    path = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="uploaded")
    extracted_data = Column(JSON, default={})
    validated_data = Column(JSON, default={})
    total_ttc = Column(Float, nullable=True)
    feedback = Column(JSON, default={})          # ← NOUVEAU : corrections de l'utilisateur