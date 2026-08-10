// src/utils/pricing.js

export function parseDiscountPercent(label) {
  const m = String(label || "").match(/(\d{1,2})\s*%/);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return null;
  return n;
}

export function getOfferMeta(product) {
  const basePrice = Number(product?.price ?? 0);

  const offerLabel = product?.offerLabel ?? product?.offer_label ?? "";
  const offerPriceRaw = product?.offerPrice ?? product?.offer_price;

  const offerPrice =
    offerPriceRaw == null ? null : Number(offerPriceRaw);

  // Caso 1: backend manda offer_price
  if (Number.isFinite(offerPrice) && offerPrice > 0 && offerPrice < basePrice) {
    return {
      hasOffer: true,
      basePrice,
      finalPrice: offerPrice,
      offerLabel,
      discountPercent: null,
    };
  }

  // Caso 2: backend NO manda offer_price, calculo por %
  const pct = parseDiscountPercent(offerLabel);
  if (pct != null && basePrice > 0) {
    const discounted = Math.round(basePrice * (1 - pct / 100));
    return {
      hasOffer: discounted < basePrice,
      basePrice,
      finalPrice: Math.max(0, discounted),
      offerLabel,
      discountPercent: pct,
    };
  }

  // Sin oferta
  return {
    hasOffer: false,
    basePrice,
    finalPrice: basePrice,
    offerLabel,
    discountPercent: null,
  };
}
