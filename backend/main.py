from fastapi import FastAPI
from interface.api.routers.auth_router import router as auth_router
from interface.api.routers.invoice_router import router as invoice_router

from infrastructure.database.models import Base

from core.db import engine

app = FastAPI(title="Invoice AI System", version="1.0.0")

Base.metadata.create_all(bind=engine)

app.include_router(auth_router, prefix="/api")
app.include_router(invoice_router, prefix="/api")

@app.get("/")
def home():
    return {"message": "✅ Invoice AI System is running - Accède à /docs"}
