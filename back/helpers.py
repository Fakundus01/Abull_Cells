import re

def parse_discount_percent(label: str):
    m = re.search(r"(\d{1,2})\s*%", str(label or ""))
    if not m:
        return None
    n = int(m.group(1))
    if n <= 0 or n >= 100:
        return None
    return n

def get_effective_price(product):
    base = int(product.price or 0)

    # Si algún día agregás offer_price en DB, lo soporta
    offer_price = getattr(product, "offer_price", None)
    if offer_price is not None:
        offer_price = int(offer_price)
        if 0 < offer_price < base:
            return offer_price

    # Si no existe offer_price, intenta por % desde offer_label / offerLabel
    offer_label = getattr(product, "offer_label", None) or getattr(product, "offerLabel", None) or ""
    pct = parse_discount_percent(offer_label)
    if pct is not None and base > 0:
        return max(0, round(base * (1 - pct / 100)))

    return base