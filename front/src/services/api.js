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

  const fetchOptions = {
    ...options,
    method,
    credentials: "include",
    headers,
  };

  // ✅ NO setear JSON si el body es FormData
  const isFormData = fetchOptions.body instanceof FormData;

  if (fetchOptions.body && !fetchOptions.headers["Content-Type"] && !isFormData) {
    fetchOptions.headers["Content-Type"] = "application/json";
  }

  // ✅ CSRF para métodos con escritura
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (needsCsrf) {
    const csrf = getCookie("csrf_access_token");
    if (csrf) fetchOptions.headers["X-CSRF-TOKEN"] = csrf;
  }

  const res = await fetch(url, fetchOptions);

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) data = await res.json();

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

export async function fetchAdminUsers() {
  return apiFetch("/admin/users", { method: "GET" });
}

export async function register(payload) {
  // payload: { name, email, password }
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((r) => r.user);
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

export function updateProduct(id, product) {
  return apiFetch(`/admin/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
}

export function deleteProduct(id) {
  return apiFetch(`/admin/products/${id}`, {
    method: "DELETE",
  });
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

export function createMpPreference({ orderId }) {
  return apiFetch("/payments/mp/create_preference", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
}

export function sendVerifyEmail() {
  return apiFetch("/auth/verify-email", { method: "POST" });
}

// ✅ Confirmar código (usa /auth/verify-email)
export async function confirmVerifyEmail(code) {
  return apiFetch("/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

// ✅ Reenviar código (usa /auth/resend-verify)
export async function resendVerifyEmail() {
  return apiFetch("/auth/resend-verify", {
    method: "POST",
    // sin body (o si querés, body: JSON.stringify({}) con Content-Type)
  });
}

// opcional: refrescar /me luego de verificar
export function fetchMe2() {
  return apiFetch("/auth/me", { method: "GET" }).then((r) => r.user);
}

export function fetchAddresses() {
  return apiFetch("/addresses", { method: "GET" });
}

export function createAddress(payload) {
  return apiFetch("/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateAddress(id, payload) {
  return apiFetch(`/addresses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteAddress(id) {
  return apiFetch(`/addresses/${id}`, { method: "DELETE" });
}

export function setDefaultAddress(id) {
  return apiFetch(`/addresses/${id}/default`, { method: "POST" });
}

// ✅ Contacto
export function sendContactMessage(payload) {
  const isFormData = payload instanceof FormData;

  return apiFetch("/contact", {
    method: "POST",
    ...(isFormData
      ? { body: payload } // multipart/form-data automático
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
  });
}



