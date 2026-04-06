from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from infrastructure.database.models import Base
from core.db import engine
from fastapi.staticfiles import StaticFiles

# ✅ Créer les tables avant tout
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PharmaOCR API", version="1.0.0")

# ✅ CORS AVANT les routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Servir les fichiers uploadés (images et PDF)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ✅ Routers — chacun dans un try/except pour isoler les erreurs
try:
    from interface.api.routers.auth_router import router as auth_router
    app.include_router(auth_router, prefix="/api")
    print("✅ Auth router OK")
except Exception as e:
    print(f"❌ Auth router ERREUR : {e}")

try:
    from interface.api.routers.invoice_router import router as invoice_router
    app.include_router(invoice_router, prefix="/api")
    print("✅ Invoice router OK")
except Exception as e:
    print(f"❌ Invoice router ERREUR : {e}")

try:
    from interface.api.routers.admin_router import router as admin_router
    app.include_router(admin_router, prefix="/api")
    print("✅ Admin router OK")
except Exception as e:
    print(f"⚠️  Admin router non chargé : {e}")

@app.get("/")
def read_root():
    return {"message": "PharmaOCR API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
