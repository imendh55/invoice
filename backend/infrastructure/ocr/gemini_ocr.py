"""
infrastructure/ocr/gemini_ocr.py
Service OCR + extraction de champs via Google Gemini Vision.
Passage de l'image en bytes bruts (plus fiable que PIL).
"""
import json
import re
import mimetypes
from pathlib import Path
from typing import Any, Dict

import google.generativeai as genai

from core.config import get_settings

settings = get_settings()
genai.configure(api_key=settings.GEMINI_API_KEY)

_MODEL_NAME = "gemini-1.5-flash"


def _get_model() -> genai.GenerativeModel:
    return genai.GenerativeModel(_MODEL_NAME)


def _image_part(image_path: str) -> dict:
    """
    Lit le fichier image en bytes et retourne un dict Gemini inline_data.
    Plus fiable que PIL sur toutes les versions de google-generativeai.
    """
    path = Path(image_path)
    mime = mimetypes.guess_type(str(path))[0] or "image/png"
    if mime not in ("image/png", "image/jpeg", "image/webp", "image/gif"):
        mime = "image/png"
    data = path.read_bytes()
    return {"mime_type": mime, "data": data}


# ═══════════════════════════════════════════════════════════════
# ÉTAPE 1 : Texte brut OCR
# ═══════════════════════════════════════════════════════════════

def extract_text_gemini(image_path: str) -> str:
    try:
        model = _get_model()
        img   = _image_part(image_path)
        prompt = (
            "Tu es un expert OCR. Lis cette image de facture et retourne "
            "UNIQUEMENT le texte brut tel qu'il apparaît, en préservant "
            "la mise en page. N'ajoute aucun commentaire."
        )
        response = model.generate_content([prompt, img])
        text = response.text.strip()
        print(f"✅ Gemini OCR : {len(text)} caractères")
        return text
    except Exception as e:
        print(f"❌ Gemini OCR erreur : {type(e).__name__}: {e}")
        return ""


# ═══════════════════════════════════════════════════════════════
# ÉTAPE 2 : Extraction structurée JSON
# ═══════════════════════════════════════════════════════════════

EXTRACTION_PROMPT = """Tu es un expert comptable. Analyse cette image de facture.

RÈGLES :
- Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre.
- Pas de balises ```json```, pas de texte avant/après.
- Montants = nombres décimaux (ex: 1500.00), pas de strings.
- Champ absent = null (pas chaîne vide).
- Date = format YYYY-MM-DD.
- Extrais TOUTES les lignes produits/services du tableau.

JSON :
{
  "invoice_number": "N° facture ou null",
  "supplier": "Nom fournisseur ou null",
  "client": "Nom client ou null",
  "date": "YYYY-MM-DD ou null",
  "adresseFournisseur": "Adresse fournisseur ou null",
  "adresseClient": "Adresse client ou null",
  "total_ht": 0.00,
  "total_tva": 0.00,
  "total_ttc": 0.00,
  "produits": [
    {"nom": "désignation", "quantite": 1, "prixUnitaire": 0.00, "total": 0.00}
  ]
}"""


def extract_fields_gemini(image_path: str) -> Dict[str, Any]:
    """Extraction champs structurés + texte brut depuis l'image."""
    raw_text = extract_text_gemini(image_path)
    raw_response = ""
    try:
        model = _get_model()
        img   = _image_part(image_path)
        response = model.generate_content([EXTRACTION_PROMPT, img])
        raw_response = response.text.strip()
        print(f"📄 Gemini JSON brut (200 chars) : {raw_response[:200]}")

        clean = _clean_json(raw_response)
        data  = json.loads(clean)
        result = _normalize(data)
        result["raw_text"] = raw_text
        print(f"✅ Extraction OK : {len(result.get('produits', []))} produit(s), TTC={result.get('total_ttc')}")
        return result

    except json.JSONDecodeError as e:
        print(f"⚠️  JSON invalide ({e}) — réponse brute : {raw_response[:300]}")
        fb = _fallback_regex(raw_text)
        fb["raw_text"] = raw_text
        return fb

    except Exception as e:
        print(f"❌ Gemini erreur : {type(e).__name__}: {e}")
        empty = _empty_fields()
        empty["raw_text"] = raw_text
        return empty


# ═══════════════════════════════════════════════════════════════
# ÉTAPE 3 : Validation
# ═══════════════════════════════════════════════════════════════

def validate_invoice_gemini(extracted_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        model = _get_model()
        data_clean = {k: v for k, v in extracted_data.items() if k != "raw_text"}
        prompt = (
            "Expert comptable : vérifie la cohérence de cette facture.\n"
            f"Données : {json.dumps(data_clean, ensure_ascii=False)}\n\n"
            "Réponds UNIQUEMENT avec ce JSON (sans markdown) :\n"
            '{"is_valid":true,"confidence_score":0.85,"errors":[],"warnings":[],'
            '"suggestions":{"total_ht":null,"total_tva":null,"total_ttc":null}}'
        )
        response = model.generate_content(prompt)
        return json.loads(_clean_json(response.text.strip()))
    except Exception as e:
        print(f"⚠️  Validation échouée : {e}")
        return {
            "is_valid": True, "confidence_score": 0.6,
            "errors": [], "warnings": ["Validation indisponible"],
            "suggestions": {},
        }


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _clean_json(raw: str) -> str:
    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\s*```$',          '', raw, flags=re.MULTILINE)
    return raw.strip()


def _to_float(v) -> float | None:
    if v is None:
        return None
    try:
        s = str(v)
        for sym in ('€', '$', 'DT', 'TND', 'MAD', 'DA', '£', ' '):
            s = s.replace(sym, '')
        return float(s.replace(',', '.').strip())
    except Exception:
        return None


def _normalize(data: Dict[str, Any]) -> Dict[str, Any]:
    ht  = _to_float(data.get("total_ht")  or data.get("totalHT"))
    tva = _to_float(data.get("total_tva") or data.get("tva"))
    ttc = _to_float(data.get("total_ttc") or data.get("totalTTC"))

    if ht  and tva and not ttc: ttc = round(ht + tva, 2)
    if ht  and ttc and not tva: tva = round(ttc - ht, 2)
    if tva and ttc and not ht:  ht  = round(ttc - tva, 2)

    produits = []
    for p in (data.get("produits") or []):
        produits.append({
            "nom":          str(p.get("nom", "")),
            "quantite":     _to_float(p.get("quantite"))   or 1.0,
            "prixUnitaire": _to_float(p.get("prixUnitaire") or p.get("prix_unitaire")) or 0.0,
            "total":        _to_float(p.get("total"))       or 0.0,
        })

    num      = data.get("invoice_number") or data.get("numeroFacture")
    supplier = data.get("supplier")       or data.get("fournisseur")

    return {
        "invoice_number": num,      "numeroFacture": num,
        "supplier":  supplier,      "fournisseur":   supplier,
        "client":    data.get("client"),
        "date":      data.get("date"),
        "adresseFournisseur": data.get("adresseFournisseur"),
        "adresseClient":      data.get("adresseClient"),
        "total_ht":  ht,  "totalHT":  ht,
        "total_tva": tva, "tva":      tva,
        "total_ttc": ttc, "totalTTC": ttc,
        "produits":  produits,
    }


def _empty_fields() -> Dict[str, Any]:
    return {
        "invoice_number": None, "numeroFacture": None,
        "supplier":  None, "fournisseur":  None,
        "client":    None, "date":         None,
        "adresseFournisseur": None, "adresseClient": None,
        "total_ht":  None, "totalHT":  None,
        "total_tva": None, "tva":      None,
        "total_ttc": None, "totalTTC": None,
        "produits":  [],   "raw_text": "",
    }


def _fallback_regex(text: str) -> Dict[str, Any]:
    try:
        from application.use_cases.extract_fields import extract_fields
        return extract_fields(text)
    except Exception:
        return _empty_fields()
