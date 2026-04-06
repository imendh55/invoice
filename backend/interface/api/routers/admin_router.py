from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from core.db import get_db
from interface.dependencies.auth import get_current_admin
from infrastructure.database.models import User
from passlib.context import CryptContext

router = APIRouter(prefix="/admin", tags=["Admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "nom": user.nom,
        "prenom": user.prenom,
        "email": user.email,
        "role": user.role,
        "dateAnniversaire": user.dateAnniversaire,
        "cin": user.cin,
        "createdAt": user.created_at.isoformat(),
    }

class CreateUserRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    password: str
    role: str = "user"
    dateAnniversaire: Optional[str] = None
    cin: Optional[str] = None

class UpdateUserRequest(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    role: Optional[str] = None
    dateAnniversaire: Optional[str] = None
    cin: Optional[str] = None

# GET /admin/users
@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin)
):
    query = db.query(User)
    if search:
        query = query.filter(
            (User.nom.ilike(f"%{search}%")) |
            (User.prenom.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    if role:
        query = query.filter(User.role == role)

    total = query.count()
    users = query.offset((page - 1) * limit).limit(limit).all()
    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "items": [user_to_dict(u) for u in users],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": total_pages,
    }

# POST /admin/users
@router.post("/users")
def create_user(
    data: CreateUserRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin)
):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    new_user = User(
        username=data.email,
        email=data.email,
        nom=data.nom,
        prenom=data.prenom,
        hashed_password=pwd_context.hash(data.password),
        role=data.role,
        dateAnniversaire=data.dateAnniversaire,
        cin=data.cin,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return user_to_dict(new_user)

# PUT /admin/users/{id}
@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data: UpdateUserRequest,
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if data.nom is not None: user.nom = data.nom
    if data.prenom is not None: user.prenom = data.prenom
    if data.role is not None: user.role = data.role
    if data.dateAnniversaire is not None: user.dateAnniversaire = data.dateAnniversaire
    if data.cin is not None: user.cin = data.cin

    db.commit()
    db.refresh(user)
    return user_to_dict(user)

# DELETE /admin/users/{id}
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: str = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.email == current_admin:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé"}

# GET /admin/stats
@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin)
):
    from infrastructure.database.models import InvoiceModel
    total_users = db.query(User).count()
    admin_count = db.query(User).filter(User.role == "admin").count()
    total_invoices = db.query(InvoiceModel).count()
    return {
        "totalUsers": total_users,
        "adminCount": admin_count,
        "userCount": total_users - admin_count,
        "totalInvoices": total_invoices,
    }
