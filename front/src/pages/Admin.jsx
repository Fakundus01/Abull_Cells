import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchOrders,
  updateOrderStatus,
} from "../services/api";

import {
  ShieldCheck,
  Package,
  ClipboardList,
  PlusCircle,
  Save,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Boxes,
  Image as ImageIcon,
  Hash,
  DollarSign,
  LayoutGrid,
  CalendarDays,
  CreditCard,
  X,
} from "lucide-react";

function Admin() {
  const { isAdmin, user, token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    price: "",
    category: "",
    imageUrl: "",
    description: "",
    stock: "",
    isOffer: false,
    offerLabel: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [editingId, setEditingId] = useState(null);

  // ✅ Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, name }
  const confirmDangerBtnRef = useRef(null);

  const PAGE_SIZE = 5;
  const [ordersPage, setOrdersPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingProducts(true);
        setLoadingOrders(true);
        const [prodData, orderData] = await Promise.all([
          fetchProducts(),
          fetchOrders(token),
        ]);
        setProducts(prodData);
        setOrders(orderData);
      } catch (err) {
        setError("No se pudieron cargar productos u órdenes.");
      } finally {
        setLoadingProducts(false);
        setLoadingOrders(false);
      }
    }

    if (isAdmin && token) loadData();
  }, [isAdmin, token]);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(""), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const isEditing = editingId != null;

  const headerSubtitle = useMemo(() => {
    const prod = products.length;
    const ord = orders.length;
    return `${prod} producto${prod === 1 ? "" : "s"} · ${ord} orden${
      ord === 1 ? "" : "es"
    }`;
  }, [products.length, orders.length]);

  // ✅ Modal: focus, ESC, scroll lock
  useEffect(() => {
    if (!confirmOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus botón peligro
    const t = setTimeout(() => confirmDangerBtnRef.current?.focus(), 30);

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeConfirm();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen]);

  if (!isAdmin) {
    return (
      <section className="home-section">
        <div className="admin-hero card-animate">
          <div className="admin-hero-icon" aria-hidden="true">
            <ShieldCheck size={28} />
          </div>
          <h1 className="admin-title">Panel de administración</h1>
          <p className="admin-subtitle">No tenés permisos para ver esta sección.</p>
          <Link to="/login" className="btn-primary btn-icon">
            <ShieldCheck size={18} className="icon" />
            Iniciar sesión como admin
          </Link>
        </div>
      </section>
    );
  }

  function resetForm() {
    setForm({
      name: "",
      slug: "",
      price: "",
      category: "",
      imageUrl: "",
      description: "",
      stock: "",
      isOffer: false,
      offerLabel: "",
    });
    setEditingId(null);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      setSaving(true);

      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock || 0),
      };

      if (editingId == null) {
        const created = await createProduct(payload, token);
        setProducts((prev) => [...prev, created]);
        setSuccessMsg("Producto creado correctamente.");
      } else {
        const updated = await updateProduct(editingId, payload, token);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        setSuccessMsg("Producto actualizado correctamente.");
      }

      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalOrderPages = useMemo(() => {
  return Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
}, [orders.length]);

useEffect(() => {
  // si borrás/actualizás y te quedás en una página inválida, ajusta
  setOrdersPage((p) => Math.min(Math.max(1, p), totalOrderPages));
}, [totalOrderPages]);

const pagedOrders = useMemo(() => {
  const start = (ordersPage - 1) * PAGE_SIZE;
  return orders.slice(start, start + PAGE_SIZE);
}, [orders, ordersPage]);

  function handleEditClick(product) {
    setError("");
    setSuccessMsg("");
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      slug: product.slug || "",
      price: String(product.price ?? ""),
      category: product.category || "",
      imageUrl: product.imageUrl || "",
      description: product.description || "",
      stock: String(product.stock ?? ""),
      isOffer: !!product.isOffer,
      offerLabel: product.offerLabel || "",
    });
  }

  // ✅ Abrir modal confirmación
  function openConfirmDelete(product) {
    setError("");
    setSuccessMsg("");
    setConfirmTarget({ id: product.id, name: product.name });
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (confirmLoading) return;
    setConfirmOpen(false);
    setConfirmTarget(null);
  }

  // ✅ Confirmar delete real
  async function confirmDelete() {
    if (!confirmTarget?.id) return;

    try {
      setConfirmLoading(true);
      setError("");
      setSuccessMsg("");

      await deleteProduct(confirmTarget.id, token);
      setProducts((prev) => prev.filter((p) => p.id !== confirmTarget.id));

      if (editingId === confirmTarget.id) resetForm();

      setSuccessMsg("Producto eliminado correctamente.");
      closeConfirm();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleOrderStatusChange(orderId, newStatus) {
    try {
      setError("");
      setSuccessMsg("");
      const updated = await updateOrderStatus(orderId, newStatus, token);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setSuccessMsg(`Estado de la orden #${orderId} actualizado a ${newStatus}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-top card-animate">
        <div className="admin-top-left">
          <h1 className="admin-title">
            <LayoutGrid size={22} className="icon" />
            Panel de administración
          </h1>
          <p className="admin-subtitle">
            Hola, <strong>{user?.name}</strong>. Gestioná productos y órdenes de Abul Cells.
          </p>
          <div className="admin-kpis">
            <span className="admin-kpi">
              <Package size={16} className="icon" /> {products.length} productos
            </span>
            <span className="admin-kpi">
              <ClipboardList size={16} className="icon" /> {orders.length} órdenes
            </span>
            <span className="admin-kpi subtle">{headerSubtitle}</span>
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

      <div className="admin-grid">
        {/* Formulario */}
        <div className={`admin-card admin-form-card ${isEditing ? "editing" : ""} card-animate`}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              {isEditing ? (
                <>
                  <Pencil size={18} className="icon" /> Editar producto
                </>
              ) : (
                <>
                  <PlusCircle size={18} className="icon" /> Nuevo producto
                </>
              )}
            </h2>

            {isEditing && (
              <span className="admin-chip">
                <Hash size={14} className="icon" /> ID {editingId}
              </span>
            )}
          </div>

          <p className="admin-card-desc">
            {isEditing
              ? "Modificá los datos del producto y guardá los cambios."
              : "Completá los datos para agregar un producto a la tienda."}
          </p>

          <form className="form-card admin-form" onSubmit={handleSubmit}>
            <label>
              <span className="label-row">
                <Package size={16} className="icon" /> Nombre
              </span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>

            <label>
              <span className="label-row">
                <Hash size={16} className="icon" /> Slug (identificador único)
              </span>
              <input name="slug" value={form.slug} onChange={handleChange} required />
            </label>

            <div className="admin-form-row">
              <label>
                <span className="label-row">
                  <DollarSign size={16} className="icon" /> Precio (ARS)
                </span>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                <span className="label-row">
                  <Boxes size={16} className="icon" /> Stock
                </span>
                <input
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                  placeholder="0"
                />
              </label>
            </div>

            <label>
              <span className="label-row">
                <Tag size={16} className="icon" /> Categoría
              </span>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Celulares, Notebooks, Accesorios..."
              />
            </label>

            <label>
              <span className="label-row">
                <ImageIcon size={16} className="icon" /> URL de imagen
              </span>
              <input
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </label>

            <label>
              <span className="label-row">Descripción</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
              />
            </label>

            <label className="checkbox-row admin-checkbox">
              <input
                type="checkbox"
                name="isOffer"
                checked={form.isOffer}
                onChange={handleChange}
              />
              <span className="label-row">
                <Tag size={16} className="icon" /> Marcar como oferta
              </span>
            </label>

            {form.isOffer && (
              <label>
                <span className="label-row">
                  <Tag size={16} className="icon" /> Etiqueta de oferta
                </span>
                <input
                  name="offerLabel"
                  value={form.offerLabel}
                  onChange={handleChange}
                  placeholder="10% OFF, OFERTA, etc."
                />
              </label>
            )}

            <div className="admin-form-actions">
              <button className="btn-primary btn-icon" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="icon spin" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  <>
                    <Save size={18} className="icon" />
                    Guardar cambios
                  </>
                ) : (
                  <>
                    <PlusCircle size={18} className="icon" />
                    Crear producto
                  </>
                )}
              </button>

              {isEditing && (
                <button type="button" className="btn-secondary btn-icon" onClick={resetForm}>
                  <XCircle size={18} className="icon" />
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Productos */}
        <div className="admin-card card-animate">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <Package size={18} className="icon" /> Productos actuales
            </h2>
          </div>

          {loadingProducts ? (
            <p className="admin-muted">
              <Loader2 size={16} className="icon spin" /> Cargando productos...
            </p>
          ) : products.length === 0 ? (
            <p className="admin-muted">No hay productos cargados todavía.</p>
          ) : (
            <div className="admin-products-table modern">
              <div className="admin-products-header">
                <span>Nombre</span>
                <span>Categoría</span>
                <span>Precio</span>
                <span>Stock</span>
                <span>Oferta</span>
                <span>Acciones</span>
              </div>

              {products.map((p) => (
                <div key={p.id} className="admin-products-row">
                  <span className="cell-strong">{p.name}</span>
                  <span className="cell-muted">{p.category}</span>
                  <span>${p.price.toLocaleString("es-AR")}</span>
                  <span>
                    <span className={`stock-pill ${p.stock > 0 ? "ok" : "low"}`}>
                      <Boxes size={14} className="icon" />
                      {p.stock}
                    </span>
                  </span>
                  <span>
                    {p.isOffer ? (
                      <span className="offer-pill">
                        <Tag size={14} className="icon" />
                        {p.offerLabel || "Oferta"}
                      </span>
                    ) : (
                      <span className="cell-muted">—</span>
                    )}
                  </span>

                  <span className="admin-actions">
                    <button
                      type="button"
                      className="btn-small btn-icon"
                      onClick={() => handleEditClick(p)}
                    >
                      <Pencil size={16} className="icon" />
                    </button>
                    <button
                      type="button"
                      className="btn-small btn-danger btn-icon"
                      onClick={() => openConfirmDelete(p)}
                    >
                      <Trash2 size={16} className="icon" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Órdenes */}
        <div className="admin-card card-animate" style={{ gridColumn: "1 / -1" }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              <ClipboardList size={18} className="icon" /> Órdenes recientes
            </h2>
          </div>

          {loadingOrders ? (
            <p className="admin-muted">
              <Loader2 size={16} className="icon spin" /> Cargando órdenes...
            </p>
          ) : orders.length === 0 ? (
            <p className="admin-muted">Todavía no hay órdenes registradas.</p>
          ) : (
            <div className="admin-orders-table modern">
              <div className="admin-orders-header">
                <span>#</span>
                <span>Cliente</span>
                <span>Método</span>
                <span>Fecha</span>
                <span>Estado</span>
                <span>Total</span>
              </div>

              {pagedOrders.map((o) => (
                <div key={o.id} className="admin-orders-row">
                  <span className="cell-strong">#{o.id}</span>
                  <span>{o.customerName}</span>

                  <span className="cell-muted">
                    <CreditCard size={14} className="icon" /> {o.paymentMethod}
                  </span>

                  <span className="cell-muted">
                    <CalendarDays size={14} className="icon" />{" "}
                    {o.createdAt ? new Date(o.createdAt).toLocaleString("es-AR") : "—"}
                  </span>

                  <span>
                    <select
                      className={`status-select ${o.status}`}
                      value={o.status}
                      onChange={(e) => handleOrderStatusChange(o.id, e.target.value)}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </span>

                  <span className="cell-strong">${o.totalAmount.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-pagination">
  <span className="admin-muted">
    Mostrando{" "}
    <strong>
      {orders.length === 0 ? 0 : (ordersPage - 1) * PAGE_SIZE + 1}
    </strong>
    {" "}–{" "}
    <strong>
      {Math.min(ordersPage * PAGE_SIZE, orders.length)}
    </strong>
    {" "}de{" "}
    <strong>{orders.length}</strong>
  </span>

  <div className="admin-pagination-actions">
    <button
      type="button"
      className="btn-small"
      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
      disabled={ordersPage === 1}
    >
      Anterior
    </button>

    <span className="page-pill">
      {ordersPage}/{totalOrderPages}
    </span>

    <button
      type="button"
      className="btn-small"
      onClick={() => setOrdersPage((p) => Math.min(totalOrderPages, p + 1))}
      disabled={ordersPage === totalOrderPages}
    >
      Siguiente
    </button>
  </div>
</div>

      {/* ✅ Confirm Modal */}
      {confirmOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onMouseDown={(e) => {
            // click afuera cierra
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
                  <strong>{confirmTarget?.name ?? "este producto"}</strong>. Esta acción
                  no se puede deshacer.
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
    </section>
  );
}

export default Admin;
