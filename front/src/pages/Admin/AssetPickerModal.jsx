// src/pages/Admin/AssetPickerModal.jsx
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Loader2, X } from "lucide-react";

// Cuantas miniaturas por pagina dentro del modal. Con mas, en un celular hay
// que scrollear dentro del modal y se pierde la sensacion de "hojear".
const PAGE_SIZE = 12;

/**
 * Modal para elegir fotos de la biblioteca de Cloudinary.
 *
 * Pagina de a 12 en vez de scrollear una grilla infinita: en el celular es
 * mas facil hojear que perderse en un scroll largo.
 */
export default function AssetPickerModal({
  assets,
  loading,
  error,
  hasMore,
  onLoadMore,
  onClose,
  onContinue,
}) {
  const [picked, setPicked] = useState(() => new Set());
  const [hideUsed, setHideUsed] = useState(true);
  const [page, setPage] = useState(0);

  const visible = useMemo(
    () => (hideUsed ? assets.filter((a) => !a.usedBy) : assets),
    [assets, hideUsed]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  // Si al cambiar el filtro la pagina queda fuera de rango, se acota al vuelo.
  // Derivarlo en el render evita el setState dentro de un efecto, que provoca
  // un segundo render en cascada.
  const safePage = Math.min(page, totalPages - 1);
  const pageAssets = visible.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(publicId) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  function selectPage() {
    setPicked((prev) => {
      const next = new Set(prev);
      pageAssets.forEach((a) => next.add(a.publicId));
      return next;
    });
  }

  const chosen = assets.filter((a) => picked.has(a.publicId));

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card modal-animate modal-card--wide"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-icon" aria-hidden="true">
            <Images size={20} />
          </div>
          <div className="modal-head-text">
            <h3 id="picker-title" className="modal-title">
              Elegí las fotos
            </h3>
            <p className="modal-subtitle">
              {visible.length} disponibles · {picked.size} seleccionadas
            </p>
          </div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <label className="checkbox-row admin-checkbox">
            <input
              type="checkbox"
              checked={hideUsed}
              onChange={(e) => setHideUsed(e.target.checked)}
            />
            <span className="label-row">Ocultar las que ya usa un producto</span>
          </label>

          {error && <p className="bulk-error">{error}</p>}

          {loading && assets.length === 0 ? (
            <p className="admin-muted">
              <Loader2 size={16} className="icon spin" /> Cargando fotos...
            </p>
          ) : (
            <>
              <div className="picker-grid">
                {pageAssets.map((asset) => {
                  const isPicked = picked.has(asset.publicId);
                  return (
                    <button
                      key={asset.publicId}
                      type="button"
                      className={`asset-tile ${isPicked ? "is-picked" : ""} ${
                        asset.usedBy ? "is-used" : ""
                      }`}
                      onClick={() => toggle(asset.publicId)}
                      aria-pressed={isPicked}
                      title={asset.usedBy ? `Ya la usa: ${asset.usedBy.name}` : asset.filename}
                    >
                      <img src={asset.thumbUrl} alt={asset.filename} loading="lazy" />
                      {isPicked && <span className="asset-check">✓</span>}
                      {asset.usedBy && <span className="asset-used">en uso</span>}
                    </button>
                  );
                })}
              </div>

              {pageAssets.length === 0 && (
                <p className="admin-muted">
                  No quedan fotos libres. Destildá el filtro para ver todas.
                </p>
              )}

              <div className="picker-pager">
                <button
                  type="button"
                  className="btn-small btn-icon"
                  onClick={() => setPage(Math.max(0, safePage - 1))}
                  disabled={safePage === 0}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} className="icon" />
                </button>

                <span className="page-pill">
                  {safePage + 1}/{totalPages}
                </span>

                <button
                  type="button"
                  className="btn-small btn-icon"
                  onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
                  disabled={safePage >= totalPages - 1}
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} className="icon" />
                </button>

                <button type="button" className="btn-small" onClick={selectPage}>
                  Elegir toda la página
                </button>

                {hasMore && (
                  <button
                    type="button"
                    className="btn-small"
                    onClick={onLoadMore}
                    disabled={loading}
                  >
                    {loading ? "Cargando..." : "Traer más fotos"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary btn-small" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary btn-icon"
            onClick={() => onContinue(chosen)}
            disabled={chosen.length === 0}
          >
            Continuar con {chosen.length || ""}
          </button>
        </div>
      </div>
    </div>
  );
}
