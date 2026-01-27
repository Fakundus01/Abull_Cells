import { API_BASE_URL } from "../services/api";
import productPlaceholder from "../assets/product-placeholder.svg";

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const DEFAULT_PRODUCT_IMAGE = productPlaceholder;

export function resolveImageUrl(url, fallback = "") {
  if (!url) return fallback || "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;
  return url;
}