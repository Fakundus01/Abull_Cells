// src/pages/Admin.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import {
  createProduct,
  fetchAdminProducts,
  fetchOrders,
  fetchAdminUsers,
  setProductActive,
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
  Printer,
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
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  // ✅ Views: products | payments | users | profits
  const [tab, setTab] = useState("products");

  // Products
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productsPage, setProductsPage] = useState(1);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    price: "",
    stock: "",
    category: "",
    imageUrl: "",
    imageFiles: [],
    existingImages: [],
    mainImageIndex: null,
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
  const [usersPage, setUsersPage] = useState(1);

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
        <h1>{t("admin.accessDenied.title")}</h1>
        <p>{t("admin.accessDenied.subtitle")}</p>
        <Link className="btn-primary btn-icon" to="/">
           {t("admin.accessDenied.back")}
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
      const data = await fetchAdminProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setProducts([]);
      setError(e?.message || t("admin.errors.loadProducts"));
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
      setError(e?.message || t("admin.errors.loadOrders"));
    } finally{
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
      setError(e?.message || t("admin.errors.loadUsers"));
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
  // Derived: Users paging
  // -------------------------
  const totalUserPages = useMemo(() => {
    return Math.max(1, Math.ceil((users?.length || 0) / PAGE_SIZE));
  }, [users?.length]);

  useEffect(() => {
    setUsersPage((p) => Math.min(Math.max(1, p), totalUserPages));
  }, [totalUserPages]);

  const pagedUsers = useMemo(() => {
    const start = (usersPage - 1) * PAGE_SIZE;
    return (users || []).slice(start, start + PAGE_SIZE);
  }, [users, usersPage]);

  // -------------------------
  // Derived: Products paging
  // -------------------------
  const totalProductPages = useMemo(() => {
    return Math.max(1, Math.ceil((products?.length || 0) / PAGE_SIZE));
  }, [products?.length]);

  useEffect(() => {
    setProductsPage((p) => Math.min(Math.max(1, p), totalProductPages));
  }, [totalProductPages]);

  const pagedProducts = useMemo(() => {
    const start = (productsPage - 1) * PAGE_SIZE;
    return (products || []).slice(start, start + PAGE_SIZE);
  }, [products, productsPage]);

  // -------------------------
  // Products handlers
  // -------------------------
  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === "file") {
      const files = Array.from(e.target.files || []);
      setForm((prev) => {
        const existing = Array.isArray(prev.imageFiles) ? prev.imageFiles : [];
        const combined = [...existing, ...files];
        const deduped = combined.filter(
          (file, index, arr) =>
            index ===
            arr.findIndex(
              (item) =>
                item.name === file.name &&
                item.lastModified === file.lastModified &&
                item.size === file.size
            )
        );
        const limited = deduped.slice(0, 5);
        let mainImageIndex = prev.mainImageIndex;
        if (mainImageIndex != null && mainImageIndex >= limited.length) {
          mainImageIndex = limited.length > 0 ? 0 : null;
        }
        if (mainImageIndex == null && !prev.imageUrl && limited.length > 0) {
          mainImageIndex = 0;
        }
        return {
          ...prev,
          [name]: limited,
          mainImageIndex,
        };
      });
      e.target.value = "";
      return;
    }
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
      imageFiles: [],
      existingImages: [],
      mainImageIndex: null,
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
      imageFiles: [],
      existingImages: Array.isArray(p.images) ? p.images : p.imageUrl ? [p.imageUrl] : [],
      mainImageIndex: null,
      description: p.description || "",
      isOffer: !!p.isOffer,
      offerLabel: p.offerLabel || "",
    });
    setSuccessMsg("");
    setError("");
  }

  function handleSelectMainImage(selection) {
    setForm((prev) => {
      if (selection?.type === "existing") {
        return {
          ...prev,
          imageUrl: selection.url || "",
          mainImageIndex: null,
        };
      }
      if (selection?.type === "new") {
        return {
          ...prev,
          imageUrl: "",
          mainImageIndex: Number.isInteger(selection.index) ? selection.index : null,
        };
      }
      return prev;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      setSaving(true);

      const hasImageFiles = Array.isArray(form.imageFiles) && form.imageFiles.length > 0;
      const payload = hasImageFiles ? new FormData() : {
        name: form.name,
        slug: form.slug,
        price: Number(form.price || 0),
        stock: Number(form.stock || 0),
        category: form.category,
        imageUrl: form.imageUrl,
        description: form.description,
        isOffer: form.isOffer,
        offerLabel: form.offerLabel,
        mainImageIndex: form.mainImageIndex ?? undefined,
      };

      if (hasImageFiles) {
        payload.append("name", form.name);
        payload.append("slug", form.slug);
        payload.append("price", String(form.price || 0));
        payload.append("stock", String(form.stock || 0));
        payload.append("category", form.category || "");
        payload.append("description", form.description || "");
        payload.append("offerLabel", form.offerLabel || "");
        payload.append("imageUrl", form.imageUrl || "");
        payload.append("isOffer", String(form.isOffer));
        if (form.mainImageIndex != null) {
          payload.append("mainImageIndex", String(form.mainImageIndex));
        }
        form.imageFiles.forEach((file) => {
          payload.append("images", file);
        });
      }

      if (isEditing && editingId) {
        await updateProduct(editingId, payload);
        setSuccessMsg(t("admin.notifications.productUpdated"));
      } else {
        await createProduct(payload);
        setSuccessMsg(t("admin.notifications.productCreated"));
      }

      await loadProducts();
      resetForm();
    } catch (err) {
      setError(err?.message || t("admin.errors.saveProduct"));
    } finally {
      setSaving(false);
    }
  }

  function openConfirmDeactivate(p) {
    setConfirmTarget(p);
    setConfirmOpen(true);
    setTimeout(() => confirmDangerBtnRef.current?.focus(), 0);
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setConfirmTarget(null);
    setConfirmLoading(false);
  }

  async function confirmDeactivate() {
    if (!confirmTarget?.id) return;
    setConfirmLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await setProductActive(confirmTarget.id, false);
      setSuccessMsg(t("admin.notifications.productDeactivated"));
      await loadProducts();
      closeConfirm();
    } catch (err) {
      setError(err?.message || t("admin.errors.toggleProduct"));
      setConfirmLoading(false);
    }
  }

  async function handleActivateProduct(product) {
    if (!product?.id) return;
    setError("");
    setSuccessMsg("");

    try {
      await setProductActive(product.id, true);
      setSuccessMsg(t("admin.notifications.productActivated"));
      await loadProducts();
    } catch (err) {
      setError(err?.message || t("admin.errors.toggleProduct"));
    }
  }

  // -------------------------
  // Orders handlers
  // -------------------------
  async function handleOrderStatusChange(orderId, newStatus) {
    setError("");
    setSuccessMsg("");

    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      setSuccessMsg(t("admin.notifications.orderUpdated"));
    } catch (err) {
      setError(err?.message || t("admin.errors.updateOrderStatus"));
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
   if (tab === "products") return t("admin.headerSubtitle.products", { count: products.length });
    if (tab === "payments") return t("admin.headerSubtitle.payments", { count: orders.length });
    if (tab === "users") return t("admin.headerSubtitle.users");
    if (tab === "profits") return t("admin.headerSubtitle.profits");
    return "";
  }, [tab, products.length, orders.length, t]);

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
               {t("admin.title")}
              </h1>

              <p className="admin-subtitle">
                {t("admin.subtitle", { name: user?.name })}
              </p>

              <div className="admin-kpis">
                {tab === "products" && (
                  <>
                    <span className="admin-kpi">
                      <Package size={16} className="icon" />{" "}
                      {t("admin.kpis.products", { count: products.length })}
                    </span>
                    <span className="admin-kpi subtle">{t("admin.kpis.catalog")}</span>
                  </>
                )}

                {tab === "payments" && (
                  <>
                    <span className="admin-kpi">
                      <ClipboardList size={16} className="icon" />{" "}
                      {t("admin.kpis.orders", { count: orders.length })}
                    </span>
                    <span className="admin-kpi subtle">{t("admin.kpis.payments")}</span>
                  </>
                )}

                {tab === "users" && (
                  <>
                    <span className="admin-kpi">
                      <ShieldCheck size={16} className="icon" />{" "}
                      {t("admin.kpis.users", { count: users.length })}
                    </span>
                    <span className="admin-kpi subtle">{headerSubtitle}</span>
                  </>
                )}

                {tab === "profits" && (
                  <>
                    <span className="admin-kpi">
                      <DollarSign size={16} className="icon" />{" "}
                      {t("admin.kpis.today", {
                        amount: Number(revenueToday).toLocaleString("es-AR"),
                      })}
                    </span>
                    <span className="admin-kpi">
                      <DollarSign size={16} className="icon" />{" "}
                      {t("admin.kpis.week", {
                        amount: Number(revenueWeek).toLocaleString("es-AR"),
                      })}
                    </span>
                    <span className="admin-kpi">
                      <DollarSign size={16} className="icon" />{" "}
                      {t("admin.kpis.month", {
                        amount: Number(revenueMonth).toLocaleString("es-AR"),
                      })}
                    </span>
                    <span className="admin-kpi subtle">
                      {t("admin.kpis.year", {
                        amount: Number(revenueYear).toLocaleString("es-AR"),
                      })}
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
          pagedProducts={pagedProducts}
          loadingProducts={loadingProducts}
          saving={saving}
          isEditing={isEditing}
          editingId={editingId}
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onReset={resetForm}
          onEdit={handleEditClick}
          onSelectMainImage={handleSelectMainImage}
          onDeactivate={openConfirmDeactivate}
          onActivate={handleActivateProduct}
          productsPage={productsPage}
              totalProductPages={totalProductPages}
              pageSize={PAGE_SIZE}
              onPrevPage={() => setProductsPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setProductsPage((p) => Math.min(totalProductPages, p + 1))}
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
                CheckCircle2,
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
              icons={{ ClipboardList, Loader2, CreditCard, CalendarDays, Printer }}
              cardAnimateClass="card-animate"
            />
          )}

          {/* ✅ USERS */}
          {tab === "users" && (
            <AdminUsersView
              users={users}
              pagedUsers={pagedUsers}
              loadingUsers={loadingUsers}
              usersPage={usersPage}
              totalUserPages={totalUserPages}
              pageSize={PAGE_SIZE}
              onPrevPage={() => setUsersPage((p) => Math.max(1, p - 1))}
              onNextPage={() => setUsersPage((p) => Math.min(totalUserPages, p + 1))}
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
                      {t("admin.confirm.title")}
                    </h3>
                    <p className="modal-subtitle">
                      {t("admin.confirm.subtitle", {
                        name: confirmTarget?.name ?? t("admin.confirm.fallbackItem"),
                      })}
                    </p>
                  </div>

                  <button
                    className="modal-x"
                    type="button"
                    onClick={closeConfirm}
                    aria-label={t("admin.confirm.close")}
                  >
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
                   {t("admin.confirm.cancel")}
                  </button>

                  <button
                    type="button"
                    className="btn-small btn-danger btn-icon"
                    onClick={confirmDeactivate}
                    disabled={confirmLoading}
                    ref={confirmDangerBtnRef}
                  >
                    {confirmLoading ? (
                      <>
                        <Loader2 size={18} className="icon spin" />
                        {t("admin.confirm.deactivating")}
                      </>
                    ) : (
                      <>
                        <XCircle size={18} className="icon" />
                        {t("admin.confirm.confirm")}
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
          <div className="admin-sidebar-title">{t("admin.sidebar.title")}</div>

          <button
            type="button"
            className={`admin-nav-btn ${tab === "products" ? "active" : ""}`}
            onClick={() => {
              clearFlash();
              setTab("products");
            }}
          >
            <Package size={18} className="icon" />
            {t("admin.sidebar.products")}
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
             {t("admin.sidebar.payments")}
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
            {t("admin.sidebar.users")}
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
            {t("admin.sidebar.profits")}
          </button>
        </aside>
      </div>
    </section>
  );
}
