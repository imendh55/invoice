"""
Router API pour la gestion des factures.
Dépend de l'infrastructure pour l'implémentation concrète.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from datetime import datetime
import os
from pathlib import Path
import time

from core.db import get_db
from infrastructure.repository.invoice_repo_sql import SqlInvoiceRepository
from interface.api.schemas.invoice_schema import InvoiceResponse, InvoiceCreate, InvoiceUpdate
from interface.dependencies.auth import get_current_user
from infrastructure.database.models import InvoiceModel

router = APIRouter(prefix="/invoices", tags=["Invoices"])


# Dépendance pour obtenir le repository
def get_invoice_repository(db: Session = Depends(get_db)) -> SqlInvoiceRepository:
    """Factory pour obtenir une instance du repository."""
    return SqlInvoiceRepository(db=db)


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Créer une nouvelle facture."""
    try:
        saved = repo.save(invoice_data)
        return saved
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création: {str(e)}"
        )


@router.get("/", response_model=List[InvoiceResponse])
async def list_invoices(
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Lister les factures avec pagination et filtre optionnel."""
    return repo.list_all(limit=limit, status=status_filter)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Récupérer une facture par son ID."""
    invoice = repo.get_by_id(invoice_id)
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture #{invoice_id} non trouvée"
        )
    return invoice


@router.get("/search", response_model=List[InvoiceResponse])
async def search_invoices(
    keyword: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Recherche simple par mot-clé."""
    return repo.search(keyword=keyword, limit=limit)


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_invoice_file(
    file: UploadFile = File(...),
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Uploader un fichier de facture pour traitement OCR."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom de fichier manquant"
        )

    if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.pdf')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format de fichier non supporté"
        )

    try:
        # 1. Sauvegarder le fichier
        uploads_dir = Path("uploads")
        uploads_dir.mkdir(exist_ok=True)

        # Générer un nom unique
        timestamp = int(time.time())
        ext = Path(file.filename).suffix
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = uploads_dir / safe_filename

        # Lire et écrire le contenu
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        file_size = len(content)

        # 2. Créer l'entrée en base de données
        # Utiliser les bons noms de champs selon le modèle
        db_invoice = InvoiceModel(
            filename=safe_filename,  # ← Utiliser 'filename' pas 'file_name'
            file_path=f"uploads/{safe_filename}",
            file_size=file_size,
            status="uploaded",
            extracted_data={},
            total_amount=None,
            supplier_name=None,
            invoice_number=None,
            invoice_date=None
        )

        repo.db.add(db_invoice)
        repo.db.commit()
        repo.db.refresh(db_invoice)

        return {
            "id": db_invoice.id,
            "filename": safe_filename,
            "status": "uploaded",
            "message": "Fichier uploadé avec succès"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'upload: {str(e)}"
        )


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Mettre à jour une facture existante."""
    existing = repo.get_by_id(invoice_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture #{invoice_id} non trouvée"
        )

    # Fusion des données
    update_data = invoice_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    return repo.update(existing)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Supprimer une facture."""
    success = repo.delete(invoice_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facture #{invoice_id} non trouvée"
        )


@router.get("/stats")
async def get_invoice_stats(
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Récupérer les statistiques des factures."""
    return repo.get_stats()


@router.get("/recent", response_model=List[InvoiceResponse])
async def get_recent_invoices(
    limit: int = Query(5, ge=1, le=20),
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Récupérer les dernières factures (pour dashboard)."""
    return repo.get_recent(limit=limit)


@router.post("/advanced-search")
async def advanced_search(
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    status_filter: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    supplier: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    repo: SqlInvoiceRepository = Depends(get_invoice_repository),
    current_user: Any = Depends(get_current_user)
):
    """Recherche avancée avec filtres multiples et pagination."""
    filters = {
        "status": status_filter,
        "date_from": date_from,
        "date_to": date_to,
        "supplier": supplier,
        "amount_min": amount_min,
        "amount_max": amount_max
    }
    # Filtrer les valeurs None
    filters = {k: v for k, v in filters.items() if v is not None}

    items, total = repo.advanced_search(
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        **filters
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }
