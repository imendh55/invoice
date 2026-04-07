"""
Schémas Pydantic pour les factures.
Définit les modèles de validation pour les requêtes/réponses API.
"""
from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ==================== SCHÉMAS DE BASE ====================

class InvoiceBase(BaseModel):
    """Champs communs pour les factures."""
    file_name: str = Field(..., min_length=1, max_length=255, description="Nom du fichier")
    file_path: Optional[str] = Field(None, description="Chemin du fichier")
    file_size: Optional[int] = Field(None, ge=0, description="Taille en octets")
    mime_type: Optional[str] = Field(None, description="Type MIME du fichier")

    # Données extraites par OCR
    supplier_name: Optional[str] = Field(None, description="Nom du fournisseur")
    supplier_address: Optional[str] = Field(None, description="Adresse du fournisseur")
    invoice_number: Optional[str] = Field(None, description="Numéro de facture")
    invoice_date: Optional[datetime] = Field(None, description="Date de la facture")
    due_date: Optional[datetime] = Field(None, description="Date d'échéance")

    # Montants
    subtotal: Optional[float] = Field(None, ge=0, description="Sous-total HT")
    tax_amount: Optional[float] = Field(None, ge=0, description="Montant TVA")
    total_amount: Optional[float] = Field(None, ge=0, description="Total TTC")
    currency: Optional[str] = Field(default="EUR", max_length=3, description="Devise")

    # Métadonnées
    status: Optional[str] = Field(default="en_attente", description="Statut de traitement")
    confidence_score: Optional[float] = Field(None, ge=0, le=1, description="Score de confiance OCR")

    model_config = ConfigDict(from_attributes=True)


# ==================== SCHÉMAS DE CRÉATION ====================

class InvoiceCreate(InvoiceBase):
    """Schéma pour créer une nouvelle facture."""
    # Tous les champs sont optionnels sauf file_name
    file_name: str = Field(..., min_length=1, max_length=255)

    @field_validator('currency')
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.upper()
        return v


class InvoiceUpload(BaseModel):
    """Schéma pour l'upload de fichier."""
    file_name: str = Field(..., min_length=1, max_length=255)
    file_path: str = Field(..., min_length=1)
    mime_type: Optional[str] = None
    file_size: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== SCHÉMAS DE MISE À JOUR ====================

class InvoiceUpdate(BaseModel):
    """Schéma pour mettre à jour une facture existante."""
    # Tous les champs sont optionnels (PATCH)
    file_name: Optional[str] = Field(None, min_length=1, max_length=255)
    file_path: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_address: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    subtotal: Optional[float] = Field(None, ge=0)
    tax_amount: Optional[float] = Field(None, ge=0)
    total_amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    status: Optional[str] = None
    confidence_score: Optional[float] = Field(None, ge=0, le=1)
    extracted_data: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== SCHÉMAS DE RÉPONSE ====================

class InvoiceResponse(InvoiceBase):
    """Schéma de réponse avec tous les champs + métadonnées système."""
    id: int = Field(..., description="ID unique de la facture")
    user_id: Optional[int] = Field(None, description="ID de l'utilisateur propriétaire")

    created_at: datetime = Field(..., description="Date de création")
    updated_at: Optional[datetime] = Field(None, description="Date de dernière modification")

    extracted_data: Optional[Dict[str, Any]] = Field(None, description="Données brutes extraites par OCR")
    validation_errors: Optional[List[str]] = Field(None, description="Erreurs de validation")

    model_config = ConfigDict(from_attributes=True)


# ==================== SCHÉMAS DE LISTE/PAGINATION ====================

class InvoiceListResponse(BaseModel):
    """Réponse paginée pour la liste des factures."""
    items: List[InvoiceResponse]
    total: int
    page: int
    limit: int
    pages: int

    model_config = ConfigDict(from_attributes=True)


class InvoiceStatsResponse(BaseModel):
    """Statistiques des factures."""
    total_invoices: int
    validated: int
    pending: int
    rejected: int
    total_amount: float
    validation_rate: float
    average_confidence: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


# ==================== SCHÉMAS DE RECHERCHE ====================

class InvoiceSearchRequest(BaseModel):
    """Paramètres de recherche avancée."""
    keyword: Optional[str] = Field(None, min_length=1, description="Mot-clé de recherche")
    status: Optional[str] = Field(None, description="Filtrer par statut")
    supplier: Optional[str] = Field(None, description="Filtrer par fournisseur")

    date_from: Optional[datetime] = Field(None, description="Date de début")
    date_to: Optional[datetime] = Field(None, description="Date de fin")

    amount_min: Optional[float] = Field(None, ge=0, description="Montant minimum")
    amount_max: Optional[float] = Field(None, ge=0, description="Montant maximum")

    page: int = Field(default=1, ge=1, description="Numéro de page")
    limit: int = Field(default=15, ge=1, le=100, description="Nombre de résultats par page")

    sort_by: str = Field(default="created_at", description="Champ de tri")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", description="Ordre de tri")

    model_config = ConfigDict(from_attributes=True)


# ==================== SCHÉMAS D'EXPORT ====================

class InvoiceExportRequest(BaseModel):
    """Paramètres pour l'export de factures."""
    format: str = Field(default="csv", pattern="^(csv|json|xlsx)$", description="Format d'export")
    invoice_ids: Optional[List[int]] = Field(None, description="IDs des factures à exporter")
    filters: Optional[InvoiceSearchRequest] = Field(None, description="Filtres de sélection")

    model_config = ConfigDict(from_attributes=True)


class InvoiceExportResponse(BaseModel):
    """Réponse d'export."""
    download_url: str = Field(..., description="URL de téléchargement")
    file_name: str = Field(..., description="Nom du fichier généré")
    expires_at: datetime = Field(..., description="Date d'expiration du lien")
    record_count: int = Field(..., description="Nombre d'enregistrements exportés")

    model_config = ConfigDict(from_attributes=True)
