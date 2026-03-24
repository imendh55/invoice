from fastapi import FastAPI
from interface.api.routers.auth_router import router as auth_router
from interface.api.routers.invoice_router import router as invoice_router

# Import pour créer les tables
from infrastructure.database.models import Base
from infrastructure.database.database import engine

app = FastAPI(title="Invoice AI - Ton PFE")

# Création automatique des tables au démarrage
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(invoice_router)

@app.get("/")
def home():
    return {"message": "🎉 Étape 4 terminée ! Base de données prête !"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)