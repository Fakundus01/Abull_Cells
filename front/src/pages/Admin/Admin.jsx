// src/pages/Admin.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import {
  createProduct,
  deleteProduct,
  fetchOrders,
  fetchAdminUsers,
  fetchProducts,
  updateOrderStatus,
  updateProduct,
} from "../../services/api";

import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Package,
  Pencil,
  PlusCircle,
  Save,
  ShieldCheck,
  Tag,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import AdminProductsView from "./AdminProductsView";
import AdminPaymentsView from "./AdminPaymentsView";
import AdminUsersView from "./AdminUsersView";
import AdminProfitsView from "./AdminProfitsView";

const PAGE_SIZE = 5;

export default function Admin() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ✅ Views: products | payments | users | profits
  const [tab, setTab] = useState("products");

  // Products
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    price: "",
    stock: "",
    category: "",
    imageUrl: "",
    description: "",
    isOffer: false,
    offerLabel: "",
  });

  // Orders (Payments)
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  // Users
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Feedback
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Confirm delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const confirmDangerBtnRef = useRef(null);

  // -------------------------
  // Guards
  // -------------------------
  if (!isAdmin) {
    return (
      <section className="home-section card-animate">
        <h1>Acceso denegado</h1>
        <p>No tenés permisos para ver esta sección.</p>
        <Link className="btn-primary btn-icon" to="/">
          Volver
        </Link>
      </section>
    );
  }

  // -------------------------
  // Loaders
  // -------------------------
  async function loadProducts() {
    try {
      setLoadingProducts(true);
      const data = await fetchProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setProducts([]);
      setError(e?.message || "No se pudieron cargar los productos.");
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadOrders() {
    try {
      setLoadingOrders(true);
      const data = await fetchOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setOrders([]);
      setError(e?.message || "No se pudieron cargar las órdenes.");
    } finally {
      setLoadingOrders(false);
    }
  }

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const data = await fetchAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]);
      setError(e?.message || "No se pudieron cargar los usuarios.");
    } finally {
      setLoadingUsers(false);
    }
  }

  // Load base data once
  useEffect(() => {
    if (!isAdmin) return;
    loadProducts();
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Load users on demand
  useEffect(() => {
    if (!isAdmin) return;
    if (tab !== "users") return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  // -------------------------
  // Derived: Orders paging
  // -------------------------
  const totalOrderPages = useMemo(() => {
    return Math.max(1, Math.ceil((orders?.length || 0) / PAGE_SIZE));
  }, [orders?.length]);

  useEffect(() => {
    // keep in range when dataset changes
    setOrdersPage((p) => Math.min(Math.max(1, p), totalOrderPages));
  }, [totalOrderPages]);

  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * PAGE_SIZE;
    return (orders || []).slice(start, start + PAGE_SIZE);
  }, [orders, ordersPage]);

  // -------------------------
  // Products handlers
  // -------------------------
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setIsEditing(false);
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      price: "",
      stock: "",
      category: "",
      imageUrl: "",
      description: "",
      isOffer: false,
      offerLabel: "",
    });
  }

  function handleEditClick(p) {
    setIsEditing(true);
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      slug: p.slug || "",
      price: p.price ?? "",
      stock: p.stock ?? "",
      category: p.category || "",
      imageUrl: p.imageUrl || "",
      description: p.description || "",
      isOffer: !!p.isOffer,
      offerLabel: p.offerLabel || "",
    });
    setSuccessMsg("");
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      setSaving(true);

      const payload = {
        ...form,
        price: Number(form.price || 0),
        stock: Number(form.stock || 0),
      };

      if (isEditing && editingId) {
        await updateProduct(editingId, payload);
        setSuccessMsg("Producto actualizado.");
      } else {
        await createProduct(payload);
        setSuccessMsg("Producto creado.");
      }

      await loadProducts();
      resetForm();
    } catch (err) {
      setError(err?.message || "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  function openConfirmDelete(p) {
    setConfirmTarget(p);
    setConfirmOpen(true);
    setTimeout(() => confirmDangerBtnRef.current?.focus(), 0);
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setConfirmTarget(null);
    setConfirmLoading(false);
  }

  async function confirmDelete() {
    if (!confirmTarget?.id) return;
    setConfirmLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await deleteProduct(confirmTarget.id);
      setSuccessMsg("Producto eliminado.");
      await loadProducts();
      closeConfirm();
    } catch (err) {
      setError(err?.message || "No se pudo eliminar el producto.");
      setConfirmLoading(false);
    }
  }

  // -------------------------
  // Orders handlers
  // -------------------------
  async function handleOrderStatusChange(orderId, newStatus) {
    setError("");
    setSuccessMsg("");

    try {
      await updateOrderStatus(orderId, { status: newStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setSuccessMsg("Estado de la orden actualizado.");
    } catch (err) {
      setError(err?.message || "No se pudo actualizar el estado.");
    }
  }

  // -------------------------
  // Profits derived
  // -------------------------
  const paidOrders = useMemo(() => {
    return (orders || []).filter((o) => String(o.status).toLowerCase() === "paid");
  }, [orders]);

  const now = useMemo(() => new Date(), []);
  function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function formatShortDate(d) {
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  }
  function formatShortMonth(d) {
    const month = d.toLocaleDateString("es-AR", { month: "short" });
    const year = String(d.getFullYear()).slice(-2);
    return `${month} ${year}`;
  }

  const revenueToday = useMemo(() => {
    const today = startOfDay(new Date());
    return paidOrders.reduce((acc, o) => {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) return acc;
      if (isSameDay(dt, today)) return acc + Number(o.totalAmount || 0);
      return acc;
    }, 0);
  }, [paidOrders]);

  const revenueWeek = useMemo(() => {
    const d = startOfDay(new Date());
    const from = new Date(d);
    from.setDate(from.getDate() - 6);
    return paidOrders.reduce((acc, o) => {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) return acc;
      const day = startOfDay(dt);
      if (day >= from && day <= d) return acc + Number(o.totalAmount || 0);
      return acc;
    }, 0);
  }, [paidOrders]);

  const revenueMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    return paidOrders.reduce((acc, o) => {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) return acc;
      if (dt.getFullYear() === y && dt.getMonth() === m)
        return acc + Number(o.totalAmount || 0);
      return acc;
    }, 0);
  }, [paidOrders]);

  const revenueYear = useMemo(() => {
    const y = new Date().getFullYear();
    return paidOrders.reduce((acc, o) => {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) return acc;
      if (dt.getFullYear() === y) return acc + Number(o.totalAmount || 0);
      return acc;
    }, 0);
  }, [paidOrders]);

  const revenue14d = useMemo(() => {
    const today = startOfDay(new Date());
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, total: 0 });
    }
    const map = new Map(days.map((x) => [x.date, x]));
    for (const o of paidOrders) {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) continue;
      const key = startOfDay(dt).toISOString().slice(0, 10);
      const it = map.get(key);
      if (it) it.total += Number(o.totalAmount || 0);
    }
    return days;
  }, [paidOrders]);

  const revenueWeekSeries = useMemo(() => {
    const today = startOfDay(new Date());
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: formatShortDate(d), total: 0 });
    }
    const map = new Map(days.map((x) => [x.key, x]));
    for (const o of paidOrders) {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) continue;
      const key = startOfDay(dt).toISOString().slice(0, 10);
      const it = map.get(key);
      if (it) it.total += Number(o.totalAmount || 0);
    }
    return days;
  }, [paidOrders]);

  const revenueMonthSeries = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: formatShortMonth(d), total: 0 });
    }
    const map = new Map(months.map((x) => [x.key, x]));
    for (const o of paidOrders) {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const it = map.get(key);
      if (it) it.total += Number(o.totalAmount || 0);
    }
    return months;
  }, [paidOrders]);

  const revenueYearSeries = useMemo(() => {
    const now = new Date();
    const years = [];
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i;
      years.push({ key: String(year), label: String(year), total: 0 });
    }
    const map = new Map(years.map((x) => [x.key, x]));
    for (const o of paidOrders) {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt) continue;
      const key = String(dt.getFullYear());
      const it = map.get(key);
      if (it) it.total += Number(o.totalAmount || 0);
    }
    return years;
  }, [paidOrders]);

  // -------------------------
  // UI bits
  // -------------------------
  const headerSubtitle = useMemo(() => {
    if (tab === "products") return `${products.length} productos`;
    if (tab === "payments") return `${orders.length} órdenes`;
    if (tab === "users") return `Gestión de usuarios`;
    if (tab === "profits") return `Ingresos con órdenes pagadas`;
    return "";
  }, [tab, products.length, orders.length]);

  function clearFlash() {
    setError("");
    setSuccessMsg("");
  }

  // -------------------------
  // RETURN
  // -------------------------
  return (
    <section className="admin-page">
      <div className="admin-shell">
        {/* MAIN */}
        <div className="admin-main">
          <header className="admin-top card-animate">
            <div className="admin-top-left">
              <h1 className="admin-title">
                <LayoutGrid size={22} className="icon" />
                Panel de administración
              </h1>

              <p className="admin-subtitle">
                Hola, <strong>{user?.name}</strong>. Gestioná Abul Cells.
              </p>

              <div className="admin-kpis">
                {tab === "products" && (
                  <>
                    <span className="admin-kpi">
                      <Package size={16} className="icon" /> {products.length} productos
                    </span>
                    <span className="admin-kpi subtle">Gestión de catálogo</span>
                  </>
                )}

                {tab === "payments" && (
                  <>
                    <span className="admin-kpi">
                      <ClipboardList size={16} className="icon" /> {orders.length} órdenes
                    </span>
                    <span className="admin-kpi subtle">Pagos y estados</span>
                  </>
                )}

                {tab === "users" && (
                  <>
                    <span className="admin-kpi">
                      <ShieldCheck size={16} className="icon" /> {users.length} usuarios
                    </span>
                    <span className="admin-kpi subtle">{headerSubtitle}</span>
                  </>
                )}

                {tab === "profits" && (
                  <>
                    <span className="admin-kpi">
                      <DollarSign size={16} className="icon" /> Hoy: $
                      {Number(revenueToday).toLocaleString("es-AR")}
                    </span>
                    <span className="admin-kpi">
                      <DollarSign size={16} className="icon" /> Semana: $
                      {Number(revenueWeek).toLocaleString("es-AR")}
                    </span>
                    <span className="admin-kpi">
                      <DollarSign size={16} className="icon" /> Mes: $
                      {Number(revenueMonth).toLocaleString("es-AR")}
                    </span>
                    <span className="admin-kpi subtle">
                      Año: ${Number(revenueYear).toLocaleString("es-AR")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </header>

          {(error || successMsg) && (
            <div className="admin-toast-wrap">
              {error && (
                <div className="admin-toast error card-animate" role="alert">
                  <AlertTriangle size={18} className="icon" />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className="admin-toast success card-animate" role="status">
                  <CheckCircle2 size={18} className="icon" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* ✅ PRODUCTS */}
          {tab === "products" && (
            <AdminProductsView
              products={products}
              loadingProducts={loadingProducts}
              saving={saving}
              isEditing={isEditing}
              editingId={editingId}
              form={form}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onReset={resetForm}
              onEdit={handleEditClick}
              onDelete={openConfirmDelete}
              icons={{
                Package,
                Pencil,
                PlusCircle,
                Hash,
                DollarSign,
                Boxes,
                Tag,
                ImageIcon,
                Loader2,
                Save,
                XCircle,
              }}
              cardAnimateClass="card-animate"
            />
          )}

          {/* ✅ PAYMENTS */}
          {tab === "payments" && (
            <AdminPaymentsView
              orders={orders}
              pagedOrders={pagedOrders}
              loadingOrders={loadingOrders}
              ordersPage={ordersPage}
              totalOrderPages={totalOrderPages}
              pageSize={PAGE_SIZE}
              onChangeStatus={handleOrderStatusChange}
              onPrevPage={() => setOrdersPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setOrdersPage((p) => Math.min(totalOrderPages, p + 1))}
              icons={{ ClipboardList, Loader2, CreditCard, CalendarDays }}
              cardAnimateClass="card-animate"
            />
          )}

          {/* ✅ USERS */}
          {tab === "users" && (
            <AdminUsersView
              users={users}
              loadingUsers={loadingUsers}
              onReload={loadUsers}
              icons={{ ShieldCheck, Loader2 }}
              cardAnimateClass="card-animate"
            />
          )}

          {/* ✅ PROFITS */}
          {tab === "profits" && (
            <AdminProfitsView
              revenueToday={revenueToday}
              revenueWeek={revenueWeek}
              revenueMonth={revenueMonth}
              revenueYear={revenueYear}
              revenue14d={revenue14d}
              revenueWeekSeries={revenueWeekSeries}
              revenueMonthSeries={revenueMonthSeries}
              revenueYearSeries={revenueYearSeries}
              icons={{ ClipboardList }}
              cardAnimateClass="card-animate"
            />
          )}

          {/* ✅ Confirm Modal */}
          {confirmOpen && (
            <div
              className="modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeConfirm();
              }}
            >
              <div className="modal-card modal-animate" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <div className="modal-icon danger" aria-hidden="true">
                    <AlertTriangle size={20} />
                  </div>

                  <div className="modal-head-text">
                    <h3 id="confirm-title" className="modal-title">
                      Confirmar eliminación
                    </h3>
                    <p className="modal-subtitle">
                      Vas a eliminar{" "}
                      <strong>{confirmTarget?.name ?? "este producto"}</strong>. Esta
                      acción no se puede deshacer.
                    </p>
                  </div>

                  <button className="modal-x" type="button" onClick={closeConfirm} aria-label="Cerrar">
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-icon"
                    onClick={closeConfirm}
                    disabled={confirmLoading}
                  >
                    <XCircle size={18} className="icon" />
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="btn-small btn-danger btn-icon"
                    onClick={confirmDelete}
                    disabled={confirmLoading}
                    ref={confirmDangerBtnRef}
                  >
                    {confirmLoading ? (
                      <>
                        <Loader2 size={18} className="icon spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} className="icon" />
                        Sí, eliminar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR RIGHT */}
        <aside className="admin-sidebar card-animate">
          <div className="admin-sidebar-title">Navegación</div>

          <button
            type="button"
            className={`admin-nav-btn ${tab === "products" ? "active" : ""}`}
            onClick={() => {
              clearFlash();
              setTab("products");
            }}
          >
            <Package size={18} className="icon" />
            Productos
          </button>

          <button
            type="button"
            className={`admin-nav-btn ${tab === "payments" ? "active" : ""}`}
            onClick={() => {
              clearFlash();
              setTab("payments");
            }}
          >
            <CreditCard size={18} className="icon" />
            Pagos
          </button>

          <button
            type="button"
            className={`admin-nav-btn ${tab === "users" ? "active" : ""}`}
            onClick={() => {
              clearFlash();
              setTab("users");
            }}
          >
            <ShieldCheck size={18} className="icon" />
            Usuarios
          </button>

          <button
            type="button"
            className={`admin-nav-btn ${tab === "profits" ? "active" : ""}`}
            onClick={() => {
              clearFlash();
              setTab("profits");
            }}
          >
            <ClipboardList size={18} className="icon" />
            Ganancias
          </button>
        </aside>
      </div>
    </section>
  );
}
