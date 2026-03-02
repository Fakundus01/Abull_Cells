const DEFAULT_CHECKOUT_WHATSAPP_NUMBER = "1150983612";

function normalizeWhatsappPhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("54")) return digits;

  if (digits.length === 10) {
    // Número local AR sin código internacional ni prefijo móvil.
    return `549${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `54${digits.slice(1)}`;
  }

  return digits;
}

export function buildCheckoutWhatsappHref(message) {
  const configuredPhone =
    import.meta.env.VITE_CHECKOUT_WHATSAPP_NUMBER || DEFAULT_CHECKOUT_WHATSAPP_NUMBER;
  const phone = normalizeWhatsappPhone(configuredPhone);

  if (!phone) return null;

  const text = encodeURIComponent(message || "");
  return `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
}