"""
Script pour créer un compte admin dans la base de données.
Exécuter depuis le dossier backend :
    python create_admin.py
"""
import sys
import os

# Ajouter le dossier backend au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from core.db import engine, SessionLocal
from infrastructure.database.models import Base, User

# Créer les tables si elles n'existent pas
Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Configuration du compte admin ──────────────────────────
ADMIN_EMAIL    = "admin@pharmaocr.com"
ADMIN_PASSWORD = "Admin1234!"
ADMIN_NOM      = "Administrateur"
ADMIN_PRENOM   = "Super"
# ───────────────────────────────────────────────────────────

def create_admin():
    db: Session = SessionLocal()
    try:
        # Vérifier si l'admin existe déjà
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            if existing.role != "admin":
                existing.role = "admin"
                db.commit()
                print(f"✅ Compte existant promu admin : {ADMIN_EMAIL}")
            else:
                print(f"ℹ️  Admin déjà existant : {ADMIN_EMAIL}")
            return

        # Créer le compte admin
        admin = User(
            username=ADMIN_EMAIL,
            email=ADMIN_EMAIL,
            nom=ADMIN_NOM,
            prenom=ADMIN_PRENOM,
            hashed_password=pwd_context.hash(ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("=" * 50)
        print("✅ Compte admin créé avec succès !")
        print(f"   Email    : {ADMIN_EMAIL}")
        print(f"   Password : {ADMIN_PASSWORD}")
        print(f"   Role     : {admin.role}")
        print(f"   ID       : {admin.id}")
        print("=" * 50)
        print("➡️  Connectez-vous sur http://localhost:3000/login")

    except Exception as e:
        print(f"❌ Erreur : {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
