import { API_BASE_URL } from "../services/api";

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export function resolveImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;
  return url;
}