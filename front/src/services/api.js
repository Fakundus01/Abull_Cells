// src/services/api.js
const API_BASE_URL = "http://127.0.0.1:5000/api";

function getToken() {
  return localStorage.getItem("access_token");
}

export async function fetchProducts() {
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) {
    throw new Error("Error al cargar productos");
  }
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al iniciar sesión");
  }

  return data; // { access_token, user }
}

export async function createProduct(product, token) {
  const res = await fetch(`${API_BASE_URL}/admin/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al crear producto");
  }

  return data;
}

export async function updateProduct(id, product, token) {
  const res = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(product),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al actualizar producto");
  }

  return data;
}

export async function deleteProduct(id, token) {
  const res = await fetch(`${API_BASE_URL}/admin/products/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al eliminar producto");
  }

  return data;
}

export async function createOrder(payload) {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al crear la orden");
  }

  return data;
}

// NUEVO
export async function fetchOrders(token) {
  const res = await fetch(`${API_BASE_URL}/admin/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al obtener órdenes");
  }

  return data; // array de órdenes
}

export async function updateOrderStatus(orderId, status, token) {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al actualizar estado de la orden");
  }

  return data; // orden actualizada
}

export async function mockChargeCard({ amount, card }) {
  const res = await fetch(`${API_BASE_URL}/payments/mock-charge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, card }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || "Error al procesar el pago");
  }

  return data; // { status, transactionId, brand, last4 }
}

// 🔹 NUEVO: crear preferencia de Mercado Pago
export async function createMpPreference({ orderId }) {
  const token = getToken();
  console.log("[MP][front] creando preferencia con:", { orderId });

  const res = await fetch(`${API_BASE_URL}/payments/mp/create_preference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ orderId }),
  });

  const data = await res.json();
  console.log("[MP][front] respuesta de /create_preference:", data);

  if (!res.ok) {
    throw new Error(data.msg || "Error al crear preferencia de pago");
  }

  return data;
}




