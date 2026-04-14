"""
ocr_ereceipt.py
---------------
Parses Woolworths e-receipt PDFs into structured item data using
coordinate-based word extraction (pdfplumber).

Each returned item:
    {
        "name":       str,
        "qty":        int,
        "unit_price": float,
        "total":      float,
        "category":   str
    }
"""

import re
import pdfplumber
from typing import Optional


# ---------------------------------------------------------------------------
# Regexes
# ---------------------------------------------------------------------------

PRICE_RE    = re.compile(r'^\$?(\d+\.\d{2})$')
QTY_LINE_RE = re.compile(r'^Qty\s+(\d+)\s*@\s*\$?([\d.]+)\s*each', re.IGNORECASE)
KG_LINE_RE  = re.compile(r'^([\d.]+)\s*kg\s*@\s*\$?([\d.]+)/kg', re.IGNORECASE)

SKIP_PATTERNS = [
    re.compile(
        r'^(Chilled|Cooking|Dairy|Drinks|Fruit|Health|Meat|Serviced|Toiletries|'
        r'Bakery|Frozen|Pantry|Pet|Baby|Household|Alcohol).*:$',
        re.IGNORECASE,
    ),
    re.compile(
        r'^(Subtotal|Collection fee|Paper bags|Our WW|INVOICE TOTAL|'
        r'TOTAL including|Paid Amount|CreditCard|Refund Amount|Description)\b',
        re.IGNORECASE,
    ),
    re.compile(r'^-{5,}'),
    re.compile(
        r'^(For all|This tax|Thank you|WOOLWORTHS GROUP|TAX INVOICE|ABN\s+\d|'
        r'Order Details|Invoice/Order|Date\s+\d|Pick up|Woolworths Online)',
        re.IGNORECASE,
    ),
    re.compile(r'^[A-Z0-9]{5,}-[A-Z0-9]+$'),  # barcode refs e.g. CL9D9-6PZ22G
]

SUMMARY_STOP_RE = re.compile(
    r'^(Subtotal|Collection fee|Paper bags|Our WW|INVOICE TOTAL)',
    re.IGNORECASE,
)


def _is_skip(text: str) -> bool:
    t = text.strip()
    return any(pat.search(t) for pat in SKIP_PATTERNS)


def _extract_price(text: str) -> Optional[float]:
    m = PRICE_RE.match(text.strip().lstrip('$'))
    return float(m.group(1)) if m else None


def _is_category_header(text: str) -> bool:
    return bool(re.match(r'^[A-Z][A-Za-z ,&]+:$', text.strip()))


# ---------------------------------------------------------------------------
# Coordinate-based line builder
# ---------------------------------------------------------------------------

def _build_lines(page) -> list[dict]:
    """
    Group words into logical lines by vertical position.
    Words on the right 15% of the page are treated as the price column.
    """
    price_x_threshold = page.width * 0.85
    words = page.extract_words(x_tolerance=3, y_tolerance=3)

    rows: dict[int, list[dict]] = {}
    for w in words:
        row_key = round(w['top'])
        rows.setdefault(row_key, []).append(w)

    lines = []
    for row_key in sorted(rows.keys()):
        row_words = sorted(rows[row_key], key=lambda w: w['x0'])
        left_words  = [w for w in row_words if w['x0'] <= price_x_threshold]
        right_words = [w for w in row_words if w['x0'] >  price_x_threshold]

        left_text  = ' '.join(w['text'] for w in left_words).strip()
        right_text = ' '.join(w['text'] for w in right_words).strip()

        price = _extract_price(right_text) if right_text else None
        lines.append({'text': left_text, 'price': price})

    return lines


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def parse_ereceipt(pdf_path: str) -> list[dict]:
    """Parse a Woolworths e-receipt PDF and return purchased items."""
    all_lines: list[dict] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            all_lines.extend(_build_lines(page))

    items: list[dict] = []
    current_category  = "Uncategorised"
    i = 0

    while i < len(all_lines):
        line  = all_lines[i]
        text  = line['text'].strip()
        price = line['price']

        if SUMMARY_STOP_RE.match(text):
            break

        if not text:
            i += 1
            continue

        if _is_category_header(text) and price is None:
            current_category = text.rstrip(':')
            i += 1
            continue

        if _is_skip(text) and price is None:
            i += 1
            continue

        if price is not None:
            name       = text.lstrip('* ').strip()
            qty        = 1
            unit_price = price
            total      = price

            j = i + 1
            while j < len(all_lines):
                next_text  = all_lines[j]['text'].strip()
                next_price = all_lines[j]['price']

                if next_price is not None:
                    break
                if not next_text:
                    j += 1
                    continue

                m_qty = QTY_LINE_RE.match(next_text)
                if m_qty:
                    qty        = int(m_qty.group(1))
                    unit_price = float(m_qty.group(2))
                    total      = price
                    j += 1
                    break

                m_kg = KG_LINE_RE.match(next_text)
                if m_kg:
                    kg_weight   = float(m_kg.group(1))
                    rate_per_kg = float(m_kg.group(2))
                    qty        = 1
                    unit_price = round(rate_per_kg * kg_weight, 2)
                    total      = price
                    j += 1
                    break

                break

            items.append({
                'name':       name,
                'qty':        qty,
                'unit_price': unit_price,
                'total':      total,
                'category':   current_category,
            })
            i = j
            continue

        i += 1

    return items
