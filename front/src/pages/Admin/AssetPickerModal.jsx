// src/pages/Admin/AssetPickerModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Layers,
  Link2,
  Loader2,
  Scissors,
  Upload,
  X,
} from "lucide-react";
import { uploadCloudinaryAssets } from "../../services/api";

// Cuantas miniaturas por pagina. Con mas, en un celular hay que scrollear
// dentro del modal y se pierde la sensacion de "hojear".
const PAGE_SIZE = 12;

// Lo que admite el modelo de producto.
const MAX_IMAGES_PER_PRODUCT = 5;

/**
 * Elegir fotos de la biblioteca y decidir cuales son del mismo producto.
 *
 * Son dos pasos dentro del mismo modal:
 *  1. elegir: grilla paginada, se marcan las fotos con las que se va a trabajar
 *  2. agrupar: las elegidas arrancan como un producto cada una y se pueden unir
 *
 * El agrupado va antes de la IA a proposito: asi se pide una sugerencia por
 * producto y no una por foto, que ademas de costar de mas genera descripciones
 * que se descartan.
 */
export default function AssetPickerModal({
  assets,
  loading,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  onUploaded,
  onClose,
  onContinue,
}) {
  const [step, setStep] = useState("elegir");
  const [picked, setPicked] = useState(() => new Set());
  const [hideUsed, setHideUsed] = useState(true);
  const [page, setPage] = useState(0);

  // Paso 2: cada grupo es un producto. Empiezan de a una foto.
  const [groups, setGroups] = useState([]);
  const [checked, setChecked] = useState(() => new Set());

  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const visible = useMemo(
    () => (hideUsed ? assets.filter((a) => !a.usedBy) : assets),
    [assets, hideUsed]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  // Si al cambiar el filtro la pagina queda fuera de rango, se acota al vuelo.
  // Derivarlo evita el setState dentro de un efecto, que renderiza dos veces.
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

  /**
   * Sube fotos nuevas a la biblioteca y las deja seleccionadas.
   *
   * Es el caso normal a futuro: sacás las fotos de los productos nuevos, las
   * subís todas juntas y seguís con el mismo flujo sin salir del panel.
   */
  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    setUploadMsg("");
    try {
      const data = await uploadCloudinaryAssets(files);
      const subidas = data.uploaded || [];
      const fallidas = data.errors || [];

      // Las nuevas quedan tildadas para no tener que buscarlas en la grilla.
      const nuevas = await onUploaded(subidas.map((u) => u.url));
      if (nuevas?.length) {
        setPicked((prev) => new Set([...prev, ...nuevas]));
        setPage(0);
      }

      setUploadMsg(
        `${subidas.length} foto${subidas.length === 1 ? "" : "s"} subida${
          subidas.length === 1 ? "" : "s"
        }` + (fallidas.length ? ` · ${fallidas.length} fallaron` : "") + "."
      );
    } catch (err) {
      setUploadMsg(err?.message || "No se pudieron subir las fotos.");
    } finally {
      setUploading(false);
    }
  }

  function goToGrouping() {
    // Se respeta el orden en que aparecen en la biblioteca, no el de tipeo.
    const chosen = assets.filter((a) => picked.has(a.publicId));
    setGroups(chosen.map((a) => [a]));
    setChecked(new Set());
    setStep("agrupar");
  }

  function toggleCheck(publicId) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  }

  /**
   * Une en un solo producto todos los grupos que tengan alguna foto tildada.
   *
   * Se absorbe el grupo entero y no solo la foto marcada: tildar una foto que
   * ya forma parte de un producto de 2 significa "unir ese producto con este",
   * no "sacarle esa foto".
   */
  function mergeChecked() {
    setGroups((prev) => {
      const involved = prev.filter((g) => g.some((a) => checked.has(a.publicId)));
      const untouched = prev.filter((g) => !g.some((a) => checked.has(a.publicId)));
      const target = involved.flat();

      if (involved.length < 2 || target.length > MAX_IMAGES_PER_PRODUCT) return prev;

      // Se inserta donde estaba el primer grupo tocado, para que la lista no salte.
      const firstIndex = prev.indexOf(involved[0]);
      const out = [...untouched];
      out.splice(Math.min(firstIndex, out.length), 0, target);
      return out;
    });
    setChecked(new Set());
  }

  /** Devuelve cada foto del grupo a producto propio. */
  function splitGroup(index) {
    setGroups((prev) => [
      ...prev.slice(0, index),
      ...prev[index].map((a) => [a]),
      ...prev.slice(index + 1),
    ]);
    setChecked(new Set());
  }

  const chosenCount = picked.size;
  const checkedCount = checked.size;
  const totalFotos = groups.reduce((acc, g) => acc + g.length, 0);

  // Cuantos productos y cuantas fotos quedarian si se uniera lo tildado ahora.
  const involvedGroups = groups.filter((g) => g.some((a) => checked.has(a.publicId)));
  const wouldBePhotos = involvedGroups.reduce((acc, g) => acc + g.length, 0);
  const canMerge =
    involvedGroups.length >= 2 && wouldBePhotos <= MAX_IMAGES_PER_PRODUCT;

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
            {step === "elegir" ? <Images size={20} /> : <Layers size={20} />}
          </div>
          <div className="modal-head-text">
            <h3 id="picker-title" className="modal-title">
              {step === "elegir" ? "Elegí las fotos" : "¿Cuáles son del mismo producto?"}
            </h3>
            <p className="modal-subtitle">
              {step === "elegir"
                ? `${visible.length} disponibles · ${chosenCount} seleccionadas`
                : `${groups.length} producto${groups.length === 1 ? "" : "s"} con ` +
                  `${totalFotos} foto${totalFotos === 1 ? "" : "s"}`}
            </p>
          </div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {step === "elegir" && (
            <>
              <label className="checkbox-row admin-checkbox">
                <input
                  type="checkbox"
                  checked={hideUsed}
                  onChange={(e) => setHideUsed(e.target.checked)}
                />
                <span className="label-row">Ocultar las que ya usa un producto</span>
              </label>

              <div className="picker-upload">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleUpload}
                  hidden
                />
                <button
                  type="button"
                  className="btn-small btn-icon"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="icon spin" /> Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="icon" /> Subir fotos nuevas
                    </>
                  )}
                </button>
                {uploadMsg && <span className="admin-muted">{uploadMsg}</span>}
              </div>

              {error && (
                <div className="bulk-notice bulk-notice--warn">
                  <span>{error}</span>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={onRetry}
                    disabled={loading}
                  >
                    {loading ? "Reintentando..." : "Reintentar"}
                  </button>
                </div>
              )}

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
                          title={
                            asset.usedBy ? `Ya la usa: ${asset.usedBy.name}` : asset.filename
                          }
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
            </>
          )}

          {step === "agrupar" && (
            <>
              <p className="admin-card-desc">
                Cada foto es un producto. Si dos o más son del mismo, tildalas y
                tocá <strong>Unir</strong>. Después la IA describe una vez por
                producto, no por foto.
              </p>

              <div className="group-list">
                {groups.map((group, index) => (
                  <div
                    key={group[0].publicId}
                    className={`group-card ${group.length > 1 ? "is-multi" : ""}`}
                  >
                    <div className="group-card-head">
                      <span className="group-card-num">
                        Producto {index + 1}
                        {group.length > 1 && (
                          <span className="group-card-count">{group.length} fotos</span>
                        )}
                      </span>
                      {group.length > 1 && (
                        <button
                          type="button"
                          className="btn-small btn-icon"
                          onClick={() => splitGroup(index)}
                          title="Volver a separarlas en productos distintos"
                        >
                          <Scissors size={14} className="icon" />
                          Separar
                        </button>
                      )}
                    </div>

                    <div className="group-card-photos">
                      {group.map((asset) => {
                        const isChecked = checked.has(asset.publicId);
                        return (
                          <button
                            key={asset.publicId}
                            type="button"
                            className={`asset-tile ${isChecked ? "is-picked" : ""}`}
                            onClick={() => toggleCheck(asset.publicId)}
                            aria-pressed={isChecked}
                            title={asset.filename}
                          >
                            <img src={asset.thumbUrl} alt={asset.filename} loading="lazy" />
                            {isChecked && <span className="asset-check">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="group-merge-bar">
                <button
                  type="button"
                  className="btn-primary btn-icon"
                  onClick={mergeChecked}
                  disabled={!canMerge}
                  title={
                    involvedGroups.length < 2
                      ? "Tildá fotos de al menos dos productos"
                      : wouldBePhotos > MAX_IMAGES_PER_PRODUCT
                        ? `Quedarían ${wouldBePhotos} fotos y el máximo es ${MAX_IMAGES_PER_PRODUCT}`
                        : undefined
                  }
                >
                  <Link2 size={16} className="icon" />
                  {canMerge
                    ? `Unir en 1 producto de ${wouldBePhotos} fotos`
                    : "Unir en un producto"}
                </button>

                {checkedCount > 0 && (
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => setChecked(new Set())}
                  >
                    Destildar
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-actions">
          {step === "agrupar" ? (
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setStep("elegir")}
            >
              Volver a elegir
            </button>
          ) : (
            <button type="button" className="btn-secondary btn-small" onClick={onClose}>
              Cancelar
            </button>
          )}

          {step === "elegir" ? (
            <button
              type="button"
              className="btn-primary btn-icon"
              onClick={goToGrouping}
              disabled={chosenCount === 0}
            >
              Continuar con {chosenCount || ""}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary btn-icon"
              onClick={() => onContinue(groups)}
              disabled={groups.length === 0}
            >
              Describir {groups.length} con IA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
