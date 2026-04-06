from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from interface.api.routers.auth_router import router as auth_router
from interface.api.routers.invoice_router import router as invoice_router  # ✅ AJOUT
from infrastructure.database.models import Base
from core.db import engine
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="PharmaOCR API")

# ✅ Création des tables au démarrage
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Servir les fichiers uploadés (images et PDF)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Inclure les routers
app.include_router(auth_router, prefix="/api")
app.include_router(invoice_router, prefix="/api")  # ✅ AJOUT

@app.get("/")
def read_root():
    return {"message": "PharmaOCR API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
