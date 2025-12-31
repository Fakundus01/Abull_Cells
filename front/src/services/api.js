import { getCookie } from "./helpers.js";

const API_BASE_URL = "http://localhost:5000/api";

export async function refreshSession() {
  const csrf = getCookie("csrf_refresh_token");

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-TOKEN": csrf },
  });

  return res.ok;
}

// ✅ wrapper con refresh automático
async function apiFetch(path, options = {}, retry = true) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const method = (options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };

  // ✅ Siempre cookies
  const fetchOptions = {
    ...options,
    method,
    credentials: "include",
    headers,
  };

  // ✅ CSRF para métodos con escritura
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (needsCsrf) {
    const csrf = getCookie("csrf_access_token");
    if (csrf) fetchOptions.headers["X-CSRF-TOKEN"] = csrf;
  }

  const res = await fetch(url, fetchOptions);

  // Intentamos leer json siempre que se pueda
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) data = await res.json();

  // ✅ Si token expiró: refrescar y reintentar 1 vez
  if (res.status === 401 && retry) {
    const msg = (data?.msg || "").toLowerCase();
    const expired =
      msg.includes("expired") ||
      msg.includes("expirado") ||
      msg.includes("token has expired");

    if (expired) {
      const ok = await refreshSession();
      if (ok) return apiFetch(path, options, false);
    }
  }

  if (!res.ok) {
    throw new Error(data?.msg || `HTTP ${res.status}`);
  }

  return data;
}

export function fetchProducts() {
  return apiFetch("/products");
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "No autenticado");
  return data.user;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al iniciar sesión");
  return data; // { user }
}

export async function logout() {
  const res = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || "Error al cerrar sesión");
  return true;
}

export function createProduct(product) {
  return apiFetch("/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id, product) {
  const csrf = getCookie("csrf_access_token");

  const res = await apiFetch(`/admin/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrf,
    },
    body: JSON.stringify(product),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al actualizar producto");
  return data;
}

export async function deleteProduct(id) {
  const csrf = getCookie("csrf_access_token");

  const res = await apiFetch(`/admin/products/${id}`, {
    method: "DELETE",
    headers: { "X-CSRF-TOKEN": csrf },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al eliminar producto");
  return data;
}

export function createOrder(payload) {
  return apiFetch("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchOrders() {
  return apiFetch("/admin/orders");
}

export async function updateOrderStatus(orderId, status) {
  const csrf = getCookie("csrf_access_token");

  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrf,
    },
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al actualizar estado");
  return data;
}

export async function createMpPreference({ orderId }) {
  const csrf = getCookie("csrf_access_token");

  const res = await apiFetch("/payments/mp/create_preference", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": csrf,
    },
    body: JSON.stringify({ orderId }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Error al crear preferencia MP");
  return data;
}

