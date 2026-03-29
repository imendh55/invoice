import re
from datetime import datetime

def safe_float(value: str):
    if not value:
        return None
    try:
        return float(value.replace(',', '.').strip())
    except:
        return None

def extract_fields(text: str) -> dict:
    """Extrait les champs avec regex (version simple et stable)"""
    data = {
        "invoice_number": None,
        "supplier": None,
        "date": None,
        "total_ht": None,
        "total_tva": None,
        "total_ttc": None,
        "raw_text": text[:500]
    }

    # Numéro facture
    num_match = re.search(r'(?:Facture|N°|Numéro|N°\s*)[:\-]?\s*([A-Z0-9\-]+)', text, re.I)
    if num_match:
        data["invoice_number"] = num_match.group(1)

    # Fournisseur
    supplier_match = re.search(r'(?:Fournisseur|Client|Émetteur|From)[:\-]?\s*([^\n]{3,40})', text, re.I)
    if supplier_match:
        data["supplier"] = supplier_match.group(1).strip()

    # Date
    date_match = re.search(r'(\d{2}[/-]\d{2}[/-]\d{4})', text)
    if date_match:
        try:
            data["date"] = datetime.strptime(date_match.group(1).replace('/', '-'), '%d-%m-%Y').strftime('%Y-%m-%d')
        except:
            pass

    # Montants
    ttc_match = re.search(r'(?:Total TTC|TOTAL TTC|Montant TTC|Total à payer)[:\s]*([0-9.,]+)', text, re.I)
    if ttc_match:
        data["total_ttc"] = safe_float(ttc_match.group(1))

    tva_match = re.search(r'(?:TVA|Taxe)[:\s]*([0-9.,]+)', text, re.I)
    if tva_match:
        data["total_tva"] = safe_float(tva_match.group(1))

    ht_match = re.search(r'(?:Total HT|HT)[:\s]*([0-9.,]+)', text, re.I)
    if ht_match:
        data["total_ht"] = safe_float(ht_match.group(1))

    return data
