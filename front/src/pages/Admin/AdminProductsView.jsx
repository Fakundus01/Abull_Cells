// src/components/admin/AdminProductsView.jsx
import { useLanguage } from "../../context/LanguageContext";
import { resolveImageUrl } from "../../utils/imageUrl";
export default function AdminProductsView({
  products,
  pagedProducts,
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
  productsPage,
  totalProductPages,
  pageSize,
  onPrevPage,
  onNextPage,
  icons,
  cardAnimateClass = "",
}) {
   const { t } = useLanguage();
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
  const totalProducts = products.length;
  const offersCount = products.filter((p) => p.isOffer).length;
  const lowStockCount = products.filter((p) => Number(p.stock || 0) <= 5).length;

  return (
    <div className="admin-grid">
      {/* Formulario */}
      <div className={`admin-card admin-form-card ${isEditing ? "editing" : ""} ${cardAnimateClass}`}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            {isEditing ? (
              <>
                <Pencil size={18} className="icon" /> {t("admin.products.form.editTitle")}
              </>
            ) : (
              <>
                <PlusCircle size={18} className="icon" /> {t("admin.products.form.newTitle")}
              </>
            )}
          </h2>

          {isEditing && (
            <span className="admin-chip">
              <Hash size={14} className="icon" /> {t("admin.products.form.idLabel", { id: editingId })}
            </span>
          )}
        </div>

        <p className="admin-card-desc">
          {isEditing
            ? t("admin.products.form.editDescription")
            : t("admin.products.form.newDescription")}
        </p>

        <form className="form-card admin-form" onSubmit={onSubmit}>
          <label>
            <span className="label-row">
              <Package size={16} className="icon" /> {t("admin.products.form.name")}
            </span>
            <input name="name" value={form.name} onChange={onChange} required />
          </label>

          <label>
            <span className="label-row">
              <Hash size={16} className="icon" /> {t("admin.products.form.slug")}
            </span>
            <input name="slug" value={form.slug} onChange={onChange} required />
          </label>

          <div className="admin-form-row">
            <label>
              <span className="label-row">
                <DollarSign size={16} className="icon" /> {t("admin.products.form.price")}
              </span>
              <input type="number" name="price" value={form.price} onChange={onChange} required />
            </label>

            <label>
              <span className="label-row">
                <Boxes size={16} className="icon" /> {t("admin.products.form.stock")}
              </span>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={onChange}
                placeholder={t("admin.products.form.stockPlaceholder")}
              />
            </label>
          </div>

          <label>
            <span className="label-row">
              <Tag size={16} className="icon" /> {t("admin.products.form.category")}
            </span>
            <input
              name="category"
              value={form.category}
              onChange={onChange}
              placeholder={t("admin.products.form.categoryPlaceholder")}
            />
          </label>

         <label>
            <span className="label-row">
              <ImageIcon size={16} className="icon" /> {t("admin.products.form.imageFile")}
            </span>
            <input
              type="file"
              name="imageFile"
              accept="image/png, image/jpeg, image/webp"
              onChange={onChange}
            />
            <small className="field-hint">{t("admin.products.form.imageFileHint")}</small>
          </label>

          <label>
            <span className="label-row">
              <ImageIcon size={16} className="icon" /> {t("admin.products.form.imageUrl")}
            </span>
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={onChange}
              placeholder={t("admin.products.form.imageUrlPlaceholder")}
            />
          </label>

          <label>
            <span className="label-row">{t("admin.products.form.description")}</span>
            <textarea name="description" value={form.description} onChange={onChange} rows={3} />
          </label>

          <label className="checkbox-row admin-checkbox">
            <input type="checkbox" name="isOffer" checked={form.isOffer} onChange={onChange} />
            <span className="label-row">
              <Tag size={16} className="icon" /> {t("admin.products.form.isOffer")}
            </span>
          </label>

          {form.isOffer && (
            <label>
              <span className="label-row">
                <Tag size={16} className="icon" /> {t("admin.products.form.offerLabel")}
              </span>
              <input
                name="offerLabel"
                value={form.offerLabel}
                onChange={onChange}
                placeholder={t("admin.products.form.offerPlaceholder")}
              />
            </label>
          )}

          <div className="admin-form-actions">
            <button className="btn-primary btn-icon" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={18} className="icon spin" />
                  {t("admin.products.form.saving")}
                </>
              ) : isEditing ? (
                <>
                  <Save size={18} className="icon" />
                  {t("admin.products.form.save")}
                </>
              ) : (
                <>
                  <PlusCircle size={18} className="icon" />
                  {t("admin.products.form.create")}
                </>
              )}
            </button>

            {isEditing && (
              <button type="button" className="btn-secondary btn-icon" onClick={onReset}>
                <XCircle size={18} className="icon" />
                {t("admin.products.form.cancel")}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Productos */}
      <div className={`admin-card ${cardAnimateClass}`}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <Package size={18} className="icon" /> {t("admin.products.list.title")}
          </h2>
        </div>

        <div className="admin-products-summary">
          <div className="summary-pill">
            <span>{t("admin.products.summary.total")}</span>
            <strong>{totalProducts}</strong>
          </div>
          <div className="summary-pill highlight">
            <span>{t("admin.products.summary.offers")}</span>
            <strong>{offersCount}</strong>
          </div>
          <div className="summary-pill warning">
            <span>{t("admin.products.summary.lowStock")}</span>
            <strong>{lowStockCount}</strong>
          </div>
        </div>

        {loadingProducts ? (
          <p className="admin-muted">
            <Loader2 size={16} className="icon spin" /> {t("admin.products.list.loading")}
          </p>
        ) : products.length === 0 ? (
          <p className="admin-muted">{t("admin.products.list.empty")}</p>
        ) : (
            <>
            <div className="admin-products-table modern">
              <div className="admin-products-header">
                <span>{t("admin.products.list.headers.name")}</span>
                <span>{t("admin.products.list.headers.category")}</span>
                <span>{t("admin.products.list.headers.price")}</span>
                <span>{t("admin.products.list.headers.stock")}</span>
                <span>{t("admin.products.list.headers.offer")}</span>
                <span>{t("admin.products.list.headers.actions")}</span>
              </div>
               {pagedProducts.map((p) => (
                <div key={p.id} className="admin-products-row">
                  <span className="product-cell">
                    <span className="product-thumb">
                      {p.imageUrl ? (
                        <img src={resolveImageUrl(p.imageUrl)} alt={p.name} loading="lazy" />
                      ) : (
                        <span className="product-thumb-placeholder" aria-hidden="true">
                          <Package size={16} />
                        </span>
                      )}
                    </span>
                    <span className="product-name">
                      <span className="cell-strong">{p.name}</span>
                      <span className="cell-muted">#{p.id}</span>
                    </span>
                  </span>
                  <span className="cell-muted">{p.category || t("admin.products.list.uncategorized")}</span>
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
                        {p.offerLabel || t("admin.products.list.offer")}
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
             <div className="admin-pagination">
              <span className="admin-muted">
                {t("admin.pagination.showing", {
                  start: products.length === 0 ? 0 : (productsPage - 1) * pageSize + 1,
                  end: Math.min(productsPage * pageSize, products.length),
                  total: products.length,
                })}
              </span>

              <div className="admin-pagination-actions">
                <button type="button" className="btn-small" onClick={onPrevPage} disabled={productsPage === 1}>
                  {t("admin.pagination.prev")}
                </button>   
                <span className="page-pill">
                  {productsPage}/{totalProductPages}                      
                </span>

                <button
                  type="button"
                  className="btn-small"
                  onClick={onNextPage}
                  disabled={productsPage === totalProductPages}
                >
                  {t("admin.pagination.next")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
