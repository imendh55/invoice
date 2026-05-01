import re
from datetime import datetime
from typing import List, Dict, Any, Optional


def safe_float(value: str) -> Optional[float]:
    if not value:
        return None
    try:
        cleaned = (str(value)
                   .replace('\u202f', '').replace('\xa0', '').replace('\u00a0', '')
                   .replace(' ', '').replace(',', '.').replace('€', '').strip())
        return float(cleaned)
    except Exception:
        return None


def extract_products(text: str) -> List[Dict[str, Any]]:
    """
    Extrait les lignes de produits depuis le texte OCR.
    Gère 4 formats différents dont le format PIPE Tesseract.
    """
    products: List[Dict[str, Any]] = []

    # ── Stratégie 1 : Format pipe Tesseract ──────────────────
    # "1 | Grand btun escargot pour manger 100.00 4100.00"
    # "2 | Amoxicilline 500mg   50   12.00   600.00"
    pipe1 = re.compile(
        r'^\s*\d*\s*\|+\s*'
        r'([A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s\-\/\.\(\)°\%,\']{1,80}?)\s+'
        r'(\d+(?:[,.]\d+)?)\s+'
        r'(\d+(?:[,.]\d+)?)\s+'
        r'(\d+(?:[,.]\d+)?)\s*\|?\s*€?\s*$',
        re.MULTILINE
    )
    for m in pipe1.finditer(text):
        nom = m.group(1).strip().rstrip('|').strip()
        qte = safe_float(m.group(2))
        pu  = safe_float(m.group(3))
        tot = safe_float(m.group(4))
        if not nom or len(nom) < 2: continue
        if any(k in nom.lower() for k in ['total', 'tva', 'sous-total', 'montant', 'ttc', 'ht', 'désignation', 'designation', 'prix unit', 'qté', 'quantit']): continue
        if qte and qte > 0 and pu is not None and pu >= 0:
            products.append({"nom": nom, "quantite": float(qte), "prixUnitaire": float(pu), "total": float(tot) if tot else round(float(qte)*float(pu), 2)})

    if products: return products

    # ── Stratégie 2 : Pipes entre chaque colonne ─────────────
    # "| Doliprane 1000mg | 100 | 5.50 | 550.00 |"
    pipe2 = re.compile(
        r'\|?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\-\/\.\(\)°\%,\']{2,60}?)\s*\|'
        r'\s*(\d+(?:[,.]\d+)?)\s*\|'
        r'\s*(\d+(?:[,.]\d+)?)\s*\|'
        r'\s*(\d+(?:[,.]\d+)?)\s*\|?',
        re.MULTILINE
    )
    for m in pipe2.finditer(text):
        nom = m.group(1).strip()
        qte = safe_float(m.group(2))
        pu  = safe_float(m.group(3))
        tot = safe_float(m.group(4))
        if not nom or len(nom) < 2: continue
        if any(k in nom.lower() for k in ['total', 'tva', 'désignation', 'designation', 'prix', 'qté', 'montant']): continue
        if qte and pu:
            products.append({"nom": nom, "quantite": float(qte), "prixUnitaire": float(pu), "total": float(tot) if tot else round(float(qte)*float(pu), 2)})

    if products: return products

    # ── Stratégie 3 : Bloc tableau après en-tête ─────────────
    hdr = re.search(
        r'(?:D[ÉE]SIGNATION|DESIGNATION|Description|Produit|Article)'
        r'.*?(?:QT[ÉE]|Qté|Quantit[ée]|Qt\.?)'
        r'.*?(?:PRIX|Prix|P\.U\.?|Unitaire)'
        r'.*?(?:MONTANT|Montant|Total|HT)',
        text, re.IGNORECASE | re.DOTALL
    )
    bstart = hdr.end() if hdr else 0
    tend   = re.search(r'(?:Total\s*H\.?T\.?|Sous[\s\-]total|TOTAL\s*H\.?T\.?)', text[bstart:], re.IGNORECASE)
    block  = text[bstart: bstart + tend.start() if tend else len(text)]

    p3 = re.compile(
        r'^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\-\/\.\(\)°\%,\']{2,60}?)\s+'
        r'(\d+(?:[,.]\d*)?)\s+'
        r'(\d+(?:[,.]\d+)?)\s*€?\s+'
        r'(\d+(?:[,.]\d+)?)\s*€?\s*$',
        re.MULTILINE
    )
    for m in p3.finditer(block):
        nom = m.group(1).strip()
        if len(nom) < 2: continue
        if any(k in nom.lower() for k in ['total', 'tva', 'sous', 'montant', 'ttc', 'ht', 'désig', 'desig']): continue
        qte = safe_float(m.group(2)); pu = safe_float(m.group(3)); tot = safe_float(m.group(4))
        if qte and pu and qte > 0:
            products.append({"nom": nom, "quantite": float(qte), "prixUnitaire": float(pu), "total": float(tot) if tot else round(float(qte)*float(pu), 2)})

    if products: return products

    # ── Stratégie 4 : 4 colonnes numériques sur une ligne ────
    p4 = re.compile(
        r'^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s\-\/\.\(\)°\%,\']{2,60}?)\s+'
        r'(\d+(?:[,.]\d+)?)\s+'
        r'(\d+(?:[,.]\d+)?)\s+'
        r'(\d+(?:[,.]\d+)?)\s*€?\s*$',
        re.MULTILINE
    )
    for m in p4.finditer(text):
        nom = m.group(1).strip()
        qte = safe_float(m.group(2)); pu = safe_float(m.group(3)); tot = safe_float(m.group(4))
        if not nom or len(nom) < 3 or not qte or not pu: continue
        if any(k in nom.lower() for k in ['total', 'tva', 'sous-total', 'montant', 'ttc', 'ht']): continue
        if qte > 0 and pu > 0:
            products.append({"nom": nom, "quantite": float(qte), "prixUnitaire": float(pu), "total": float(tot) if tot else round(float(qte)*float(pu), 2)})

    return products


def extract_fields(text: str) -> dict:
    """
    Extrait tous les champs d'une facture depuis le texte OCR.
    Retourne un dict compatible frontend (camelCase) + backend (snake_case).
    """
    data: Dict[str, Any] = {
        "invoice_number": None, "numeroFacture": None,
        "supplier": None,       "fournisseur": None,
        "client": None,         "date": None,
        "adresseFournisseur": None, "adresseClient": None,
        "total_ht": None,  "totalHT": None,
        "total_tva": None, "tva": None,
        "total_ttc": None, "totalTTC": None,
        "produits": [],
        "raw_text": text[:2000],
    }

    if not text:
        return data

    # ── Numéro de facture ─────────────────────────────────────
    for pat in [
        r'Facture\s*[Nn]°?\s*[:\-]?\s*([A-Z]{0,4}[\-\.]?\d{3,}[\-\.]?\w*)',
        r'[Nn]°\s*[Ff]acture\s*[:\-]?\s*([A-Z]{0,4}[\-]?\d{3,}[\-]?\w*)',
        r'[Nn]°\s*[:\-]?\s*([A-Z]{2,4}[\-\.]\d{3,})',
        r'(?:Invoice|Facture)\s*(?:number|num|n°)?\s*[:\-]?\s*([A-Z0-9]{2,}[\-\.]\d{3,})',
        r'(?:Facture|Invoice)\s+([A-Z]{1,4}[\.\-]?\d{3,})',
        r'[Nn]°?\s*([A-Z]{1,3}[\.\-]\d{3,})',
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            v = m.group(1).strip()
            data["invoice_number"] = v; data["numeroFacture"] = v
            break

    # ── Fournisseur ───────────────────────────────────────────
    for pat in [
        r'(?:Fournisseur|Vendor|Émetteur|Émis par|From)\s*[:\-]?\s*([^\n]{3,60})',
        r'^([A-Z][A-Za-zÀ-ÿ\s&\.\-]{5,50}(?:SARL|SAS|SA|EURL|SNC|BV|Ltd|GmbH))\s*(?:\n|$)',
    ]:
        m = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
        if m:
            v = m.group(1).strip()
            if len(v) > 2 and not any(k in v.lower() for k in ['facture', 'invoice', 'date', 'total', 'client']):
                data["supplier"] = v; data["fournisseur"] = v
                break

    # ── Client ────────────────────────────────────────────────
    for pat in [
        r'(?:Factur[ée]\s*[&\+]?\s*Envoy[ée]\s*[àa]|Client|Destinataire|Bill\s+to|À\s+l\'attention)\s*[:\-]?\s*([^\n]{3,60})',
        r'(?:Envoy[ée]\s*[àa]|Adress[ée]\s*[àa])\s*[:\-]?\s*([^\n]{3,60})',
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            v = m.group(1).strip()
            if len(v) > 2:
                data["client"] = v
                break

    # ── Date ──────────────────────────────────────────────────
    for pat in [
        r'(?:Date\s*(?:de\s*(?:la\s*)?facture)?|Date\s*[:\-])\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
        r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
        r'(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})',
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw = m.group(1)
            norm = raw.replace('-', '/').replace('.', '/')
            for fmt in ('%d/%m/%Y', '%Y/%m/%d', '%m/%d/%Y'):
                try:
                    data["date"] = datetime.strptime(norm, fmt).strftime('%Y-%m-%d')
                    break
                except Exception:
                    pass
            if data["date"]:
                break

    # ── Total HT ─────────────────────────────────────────────
    for pat in [
        r'(?:Total\s*H\.?T\.?|Sous[\s\-]total\s*H\.?T\.?|Montant\s*H\.?T\.?)\s*[:\s]*([0-9][0-9\s]*[,\.]\d{2})\s*€?',
        r'(?:Total\s*H\.?T\.?)\s*[:\s]*([\d\s]+[,\.]\d{2})',
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            v = safe_float(m.group(1))
            if v and v > 0:
                data["total_ht"] = v; data["totalHT"] = v
                break

    # ── TVA ───────────────────────────────────────────────────
    for pat in [
        r'(?:TVA|T\.V\.A\.?)\s*(?:\(?[\d,\.]+\s*%\)?)\s*[:\s]*([0-9][0-9\s]*[,\.]\d{2})\s*€?',
        r'(?:TVA|T\.V\.A\.?|Taxe)\s*[:\s]+([0-9][0-9\s]*[,\.]\d{2})\s*€?',
        r'(?:TVA)\s*[:\s]*([\d\s]+[,\.]\d{2})',
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            v = safe_float(m.group(1))
            if v and v > 0:
                data["total_tva"] = v; data["tva"] = v
                break

    # ── Total TTC ─────────────────────────────────────────────
    for pat in [
        r'(?:NET\s*[àÀA]\s*PAYER|Total\s*T\.?T\.?C\.?|Montant\s*TTC|Total\s*[àa]\s*payer)\s*[:\s]*([0-9][0-9\s]*[,\.]\d{2})\s*€?',
        r'(?:NET\s*[àÀA]\s*PAYER|Total\s*T\.?T\.?C\.?)\s*[:\s]*([\d\s]+[,\.]\d{2})',
        r'TOTAL\s*[:\s]*([0-9][0-9\s]*[,\.]\d{2})\s*€?',
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            v = safe_float(m.group(1))
            if v and v > 0:
                data["total_ttc"] = v; data["totalTTC"] = v
                break

    # ── Produits ──────────────────────────────────────────────
    products = extract_products(text)
    data["produits"] = products

    # ── Recalculs automatiques ────────────────────────────────
    if products:
        computed_ht = round(sum(p["total"] for p in products), 2)
        if computed_ht > 0 and not data["total_ht"]:
            data["total_ht"] = computed_ht; data["totalHT"] = computed_ht

    if data["total_ht"] and data["total_tva"] and not data["total_ttc"]:
        ttc = round(data["total_ht"] + data["total_tva"], 2)
        data["total_ttc"] = ttc; data["totalTTC"] = ttc

    if data["total_ttc"] and data["total_ht"] and not data["total_tva"]:
        tva = round(data["total_ttc"] - data["total_ht"], 2)
        data["total_tva"] = tva; data["tva"] = tva

    return data
