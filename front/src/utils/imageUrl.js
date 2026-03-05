import { API_BASE_URL } from "../services/api";
import productPlaceholder from "../assets/product-placeholder.svg";

const BACKEND_BASE_URL = String(API_BASE_URL || "").replace(/\/api\/?$/, "");

export const DEFAULT_PRODUCT_IMAGE = productPlaceholder;

export function resolveImageUrl(url, fallback = "") {
  const normalizedUrl = String(url || "").trim();
  if (!normalizedUrl) return fallback || DEFAULT_PRODUCT_IMAGE;

  if (/^https?:\/\//i.test(normalizedUrl)) return normalizedUrl;

  if (normalizedUrl.startsWith("/")) {
    const base = BACKEND_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}${normalizedUrl}`;
  }

  return normalizedUrl;
}
