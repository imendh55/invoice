from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from interface.api.routers.auth_router import router as auth_router
from interface.api.routers.invoice_router import router as invoice_router

from infrastructure.database.models import Base
from core.db import engine

app = FastAPI(title="PharmaOCR - Backend", version="1.0")

# ====================== CORS (très important) ======================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Inclure les routers avec le préfixe /api
app.include_router(auth_router, prefix="/api")
app.include_router(invoice_router, prefix="/api")

@app.get("/")
def home():
    return {"message": "✅ Backend PharmaOCR est en ligne"}