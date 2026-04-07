from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from core.db import get_db
from interface.dependencies.auth import get_current_admin
from infrastructure.database.models import User, InvoiceModel
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


# ============================================================
# STATS GLOBALES — GET /api/admin/stats
# ============================================================
@router.get("/stats")
def admin_stats(
    db: Session = Depends(get_db),
    _: str = Depends(get_current_admin)
):
    # ── Utilisateurs ────────────────────────────────────────
    total_users  = db.query(User).count()
    admin_count  = db.query(User).filter(User.role == "admin").count()
    user_count   = total_users - admin_count

    # Nouveaux utilisateurs cette semaine
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_week = db.query(User).filter(User.created_at >= week_ago).count()

    # ── Factures ────────────────────────────────────────────
    total_invoices = db.query(InvoiceModel).count()
    validated      = db.query(InvoiceModel).filter(InvoiceModel.status == "validated").count()
    rejected       = db.query(InvoiceModel).filter(InvoiceModel.status == "rejected").count()
    uploaded       = db.query(InvoiceModel).filter(InvoiceModel.status == "uploaded").count()
    extracted      = db.query(InvoiceModel).filter(InvoiceModel.status == "extracted").count()

    # Nouvelles factures cette semaine
    new_invoices_week = db.query(InvoiceModel).filter(
        InvoiceModel.upload_date >= week_ago
    ).count()

    # Taux de succès
    success_rate = round((validated / total_invoices * 100), 1) if total_invoices > 0 else 0

    # ── Données mensuelles (6 derniers mois) ────────────────
    monthly_data = []
    for i in range(5, -1, -1):
        month_start = datetime.utcnow().replace(day=1) - timedelta(days=30 * i)
        month_end   = month_start + timedelta(days=31)
        month_end   = month_end.replace(day=1)

        count = db.query(InvoiceModel).filter(
            InvoiceModel.upload_date >= month_start,
            InvoiceModel.upload_date < month_end
        ).count()

        validated_count = db.query(InvoiceModel).filter(
            InvoiceModel.upload_date >= month_start,
            InvoiceModel.upload_date < month_end,
            InvoiceModel.status == "validated"
        ).count()

        monthly_data.append({
            "month": month_start.strftime("%b"),
            "total": count,
            "validated": validated_count,
        })

    # ── Total montant TTC ────────────────────────────────────
    total_ttc_result = db.query(func.sum(InvoiceModel.total_ttc)).scalar()
    total_ttc = round(total_ttc_result, 2) if total_ttc_result else 0

    # ── Utilisateurs récents ─────────────────────────────────
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()

    # ── Factures récentes ────────────────────────────────────
    recent_invoices = db.query(InvoiceModel).order_by(
        InvoiceModel.upload_date.desc()
    ).limit(5).all()

    return {
        "users": {
            "total":       total_users,
            "admins":      admin_count,
            "users":       user_count,
            "newThisWeek": new_users_week,
        },
        "invoices": {
            "total":        total_invoices,
            "validated":    validated,
            "rejected":     rejected,
            "uploaded":     uploaded,
            "extracted":    extracted,
            "newThisWeek":  new_invoices_week,
            "successRate":  success_rate,
            "totalTTC":     total_ttc,
        },
        "monthlyData": monthly_data,
        "recentUsers": [user_to_dict(u) for u in recent_users],
        "recentInvoices": [
            {
                "id":        inv.id,
                "fileName":  inv.filename,
                "status":    inv.status,
                "totalTTC":  inv.total_ttc,
                "createdAt": inv.upload_date.isoformat() if inv.upload_date else None,
            }
            for inv in recent_invoices
        ],
    }


# ============================================================
# USERS — CRUD
# ============================================================
@router.get("/users")
def list_users(
    page:   int            = Query(1,  ge=1),
    limit:  int            = Query(20, ge=1, le=100),
    search: Optional[str]  = Query(None),
    role:   Optional[str]  = Query(None),
    db:     Session        = Depends(get_db),
    _:      str            = Depends(get_current_admin)
):
    q = db.query(User)
    if search:
        q = q.filter(
            (User.nom.ilike(f"%{search}%")) |
            (User.prenom.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    if role:
        q = q.filter(User.role == role)

    total       = q.count()
    users       = q.offset((page - 1) * limit).limit(limit).all()
    total_pages = max(1, (total + limit - 1) // limit)

    return {
        "items":      [user_to_dict(u) for u in users],
        "total":      total,
        "page":       page,
        "limit":      limit,
        "totalPages": total_pages,
    }


@router.post("/users")
def create_user(
    data: CreateUserRequest,
    db:   Session = Depends(get_db),
    _:    str     = Depends(get_current_admin)
):
    if db.query(User).filter(User.email == data.email).first():
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


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    data:    UpdateUserRequest,
    db:      Session = Depends(get_db),
    _:       str     = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if data.nom is not None:             user.nom = data.nom
    if data.prenom is not None:          user.prenom = data.prenom
    if data.role is not None:            user.role = data.role
    if data.dateAnniversaire is not None: user.dateAnniversaire = data.dateAnniversaire
    if data.cin is not None:             user.cin = data.cin

    db.commit()
    db.refresh(user)
    return user_to_dict(user)


@router.delete("/users/{user_id}")
def delete_user(
    user_id:       int,
    db:            Session = Depends(get_db),
    current_admin: str     = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    if user.email == current_admin:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé"}
