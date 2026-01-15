// src/components/admin/AdminProductsView.jsx
export default function AdminProductsView({
  products,
  loadingProducts,
  saving,
  isEditing,
  editingId,
  form,
  onChange,
  onSubmit,
  onReset,
  onEdit,
  onDelete,
  icons,
  cardAnimateClass = "",
}) {
  const {
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
  } = icons;

  return (
    <div className="admin-grid">
      {/* Formulario */}
      <div className={`admin-card admin-form-card ${isEditing ? "editing" : ""} ${cardAnimateClass}`}>
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

        <form className="form-card admin-form" onSubmit={onSubmit}>
          <label>
            <span className="label-row">
              <Package size={16} className="icon" /> Nombre
            </span>
            <input name="name" value={form.name} onChange={onChange} required />
          </label>

          <label>
            <span className="label-row">
              <Hash size={16} className="icon" /> Slug (identificador único)
            </span>
            <input name="slug" value={form.slug} onChange={onChange} required />
          </label>

          <div className="admin-form-row">
            <label>
              <span className="label-row">
                <DollarSign size={16} className="icon" /> Precio (ARS)
              </span>
              <input type="number" name="price" value={form.price} onChange={onChange} required />
            </label>

            <label>
              <span className="label-row">
                <Boxes size={16} className="icon" /> Stock
              </span>
              <input type="number" name="stock" value={form.stock} onChange={onChange} placeholder="0" />
            </label>
          </div>

          <label>
            <span className="label-row">
              <Tag size={16} className="icon" /> Categoría
            </span>
            <input
              name="category"
              value={form.category}
              onChange={onChange}
              placeholder="Celulares, Notebooks, Accesorios..."
            />
          </label>

          <label>
            <span className="label-row">
              <ImageIcon size={16} className="icon" /> URL de imagen
            </span>
            <input name="imageUrl" value={form.imageUrl} onChange={onChange} placeholder="https://..." />
          </label>

          <label>
            <span className="label-row">Descripción</span>
            <textarea name="description" value={form.description} onChange={onChange} rows={3} />
          </label>

          <label className="checkbox-row admin-checkbox">
            <input type="checkbox" name="isOffer" checked={form.isOffer} onChange={onChange} />
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
                onChange={onChange}
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
              <button type="button" className="btn-secondary btn-icon" onClick={onReset}>
                <XCircle size={18} className="icon" />
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Productos */}
      <div className={`admin-card ${cardAnimateClass}`}>
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
                <span>${Number(p.price || 0).toLocaleString("es-AR")}</span>

                <span>
                  <span className={`stock-pill ${Number(p.stock || 0) > 0 ? "ok" : "low"}`}>
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
                  <button type="button" className="btn-small btn-icon" onClick={() => onEdit(p)}>
                    <Pencil size={16} className="icon" />
                  </button>
                  <button type="button" className="btn-small btn-danger btn-icon" onClick={() => onDelete(p)}>
                    {/* el icon trash viene en Admin.jsx */}
                    <span aria-hidden="true">🗑️</span>
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
