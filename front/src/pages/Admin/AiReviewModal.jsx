// src/pages/Admin/AiReviewModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  Link2,
  Loader2,
  Scissors,
  Sparkles,
  X,
} from "lucide-react";
import { aiSuggestProducts } from "../../services/api";
import { parsePriceLoose } from "../../utils/parseProductRows";

// El backend acepta 12 imagenes por request de IA y hasta 5 por producto.
const AI_BATCH = 12;
const MAX_IMAGES_PER_PRODUCT = 5;

const CATEGORIES = [
  "Fundas",
  "Cargadores",
  "Cables",
  "Audio",
  "Gaming",
  "Periféricos",
  "Protectores",
  "Accesorios",
];

/**
 * Revisión de los productos que se van a crear a partir de las fotos elegidas.
 *
 * Arranca con un producto por foto y permite unir: si la foto que estás viendo
 * es otra vista del producto anterior, se fusiona en él. Es el orden natural
 * porque recién acá, con la foto y el título a la vista, se sabe cuáles son el
 * mismo producto.
 *
 * La IA propone título, descripción y categoría; el precio siempre lo pone la
 * persona.
 */
export default function AiReviewModal({ assets, onClose, onDone }) {
  const [entries, setEntries] = useState(() =>
    assets.map((a) => ({
      id: a.publicId,
      images: [{ url: a.url, thumbUrl: a.thumbUrl }],
      mainIndex: 0,
      name: "",
      description: "",
      category: "",
      price: "",
      stock: "",
      aiError: "",
    }))
  );
  const [index, setIndex] = useState(0);
  const [aiState, setAiState] = useState("idle"); // idle | running | done | error
  const [aiError, setAiError] = useState("");
  const [cost, setCost] = useState(null);
  const startedRef = useRef(false);

  const current = entries[index];

  const missing = useMemo(
    () =>
      entries.filter(
        (e) => !String(e.name).trim() || parsePriceLoose(e.price) === null
      ).length,
    [entries]
  );

  async function runAi() {
    setAiState("running");
    setAiError("");
    let totalCost = 0;

    try {
      // Se piden sugerencias por la imagen principal de cada producto.
      const targets = entries.map((e) => ({
        id: e.id,
        url: e.images[e.mainIndex]?.url || e.images[0].url,
      }));

      for (let start = 0; start < targets.length; start += AI_BATCH) {
        const data = await aiSuggestProducts(targets.slice(start, start + AI_BATCH));
        totalCost += data?.usage?.costUsd || 0;

        setEntries((prev) => {
          const byId = new Map((data.results || []).map((r) => [r.id, r]));
          return prev.map((entry) => {
            const result = byId.get(entry.id);
            if (!result) return entry;
            if (result.error) return { ...entry, aiError: result.error };
            return {
              ...entry,
              // No pisa lo que el admin ya haya escrito a mano.
              name: entry.name || result.name || "",
              description: entry.description || result.description || "",
              category: entry.category || result.category || "",
              aiError: "",
            };
          });
        });
      }
      setCost(totalCost);
      setAiState("done");
    } catch (err) {
      setAiError(err?.message || "No se pudieron generar las sugerencias.");
      setAiState("error");
    }
  }

  // Arranca sola: el admin eligió las fotos justamente para que las complete.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runAi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update(field, value) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  }

  /**
   * Fusiona el producto actual dentro del anterior: sus imágenes pasan a ser
   * fotos secundarias y la ficha desaparece de la lista.
   */
  function mergeIntoPrevious() {
    if (index === 0) return;
    setEntries((prev) => {
      const target = prev[index - 1];
      const source = prev[index];
      if (target.images.length + source.images.length > MAX_IMAGES_PER_PRODUCT) {
        return prev;
      }
      const merged = {
        ...target,
        images: [...target.images, ...source.images],
        // Se recuerda de dónde vino cada foto para poder separarla después.
        mergedFrom: [...(target.mergedFrom || []), source.id],
      };
      return [...prev.slice(0, index - 1), merged, ...prev.slice(index + 1)];
    });
    setIndex((i) => i - 1);
  }

  /** Saca la última foto agregada y la vuelve a dejar como producto aparte. */
  function splitLast() {
    setEntries((prev) => {
      const entry = prev[index];
      if (entry.images.length < 2) return prev;

      const images = entry.images.slice(0, -1);
      const detached = entry.images[entry.images.length - 1];
      const restoredId = (entry.mergedFrom || []).slice(-1)[0] || detached.url;

      const kept = {
        ...entry,
        images,
        mainIndex: Math.min(entry.mainIndex, images.length - 1),
        mergedFrom: (entry.mergedFrom || []).slice(0, -1),
      };
      const nuevo = {
        id: restoredId,
        images: [detached],
        mainIndex: 0,
        name: "",
        description: "",
        category: entry.category,
        price: "",
        stock: "",
        aiError: "",
      };
      return [...prev.slice(0, index), kept, nuevo, ...prev.slice(index + 1)];
    });
  }

  const priceValue = parsePriceLoose(current?.price);
  const nameMissing = !String(current?.name || "").trim();
  const priceMissing = priceValue === null;
  const canMerge =
    index > 0 &&
    entries[index - 1].images.length + current.images.length <= MAX_IMAGES_PER_PRODUCT;

  const totalFotos = entries.reduce((acc, e) => acc + e.images.length, 0);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-title"
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
            <Sparkles size={20} />
          </div>
          <div className="modal-head-text">
            <h3 id="ai-title" className="modal-title">
              Completá los datos
            </h3>
            <p className="modal-subtitle">
              {aiState === "running"
                ? "La IA está mirando las fotos..."
                : `${entries.length} producto${entries.length === 1 ? "" : "s"} con ` +
                  `${totalFotos} foto${totalFotos === 1 ? "" : "s"}` +
                  (missing ? ` · faltan ${missing}` : " · todo listo")}
            </p>
          </div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {aiState === "running" && (
            <p className="bulk-notice">
              <Loader2 size={16} className="icon spin" /> Generando títulos y
              descripciones. Podés ir completando precios mientras.
            </p>
          )}

          {aiState === "error" && (
            <div className="bulk-notice bulk-notice--warn">
              <AlertTriangle size={16} className="icon" /> {aiError}{" "}
              <button type="button" className="btn-small" onClick={runAi}>
                Reintentar
              </button>
            </div>
          )}

          {aiState === "done" && cost !== null && (
            <p className="bulk-hint">
              Sugerencias listas. Costo de esta tanda: USD {cost.toFixed(4)}.
            </p>
          )}

          {current && (
            <div className="ai-entry">
              <div className="ai-entry-media">
                <div className="ai-entry-image">
                  <img src={current.images[current.mainIndex]?.thumbUrl} alt="" />
                  {current.aiError && (
                    <span className="ai-entry-badge">Sin sugerencia</span>
                  )}
                </div>

                {current.images.length > 1 && (
                  <>
                    <div className="ai-entry-thumbs">
                      {current.images.map((img, i) => (
                        <button
                          key={img.url}
                          type="button"
                          className={`ai-thumb ${i === current.mainIndex ? "is-main" : ""}`}
                          onClick={() => update("mainIndex", i)}
                          title={i === current.mainIndex ? "Foto principal" : "Usar como principal"}
                        >
                          <img src={img.thumbUrl} alt="" />
                        </button>
                      ))}
                    </div>
                    <p className="bulk-hint">
                      {current.images.length} fotos. Tocá una para que sea la
                      principal en la tienda.
                    </p>
                  </>
                )}
              </div>

              <div className="ai-entry-fields">
                <label className="bulk-field">
                  <span>Nombre</span>
                  <input
                    value={current.name}
                    onChange={(e) => update("name", e.target.value)}
                    className={nameMissing ? "is-invalid" : ""}
                    placeholder="Parlante Bluetooth 8&quot;"
                  />
                  {nameMissing && <small className="bulk-error">Falta el nombre</small>}
                </label>

                <div className="ai-entry-row">
                  <label className="bulk-field">
                    <span>Precio</span>
                    <input
                      value={current.price}
                      onChange={(e) => update("price", e.target.value)}
                      className={priceMissing ? "is-invalid" : ""}
                      inputMode="decimal"
                      placeholder="Ej. 12500"
                    />
                    {priceMissing ? (
                      <small className="bulk-error">Ponelo vos</small>
                    ) : (
                      <small className="bulk-hint">
                        ${priceValue.toLocaleString("es-AR")}
                      </small>
                    )}
                  </label>

                  <label className="bulk-field">
                    <span>Stock</span>
                    <input
                      value={current.stock}
                      onChange={(e) => update("stock", e.target.value)}
                      inputMode="numeric"
                      placeholder="0"
                    />
                  </label>
                </div>

                <label className="bulk-field">
                  <span>Categoría</span>
                  <select
                    value={current.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="bulk-field">
                  <span>Descripción</span>
                  <textarea
                    rows={3}
                    value={current.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Qué es y qué trae"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Agrupar varias fotos en un mismo producto */}
          <div className="ai-merge-bar">
            <button
              type="button"
              className="btn-small btn-icon"
              onClick={mergeIntoPrevious}
              disabled={!canMerge}
              title={
                index === 0
                  ? "No hay producto anterior"
                  : !canMerge
                    ? `Máximo ${MAX_IMAGES_PER_PRODUCT} fotos por producto`
                    : undefined
              }
            >
              <Link2 size={15} className="icon" />
              Es otra foto del anterior
            </button>

            {current?.images.length > 1 && (
              <button
                type="button"
                className="btn-small btn-icon"
                onClick={splitLast}
                title="Vuelve a separar la última foto como producto aparte"
              >
                <Scissors size={15} className="icon" />
                Separar la última
              </button>
            )}
          </div>

          <div className="picker-pager">
            <button
              type="button"
              className="btn-small btn-icon"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              aria-label="Producto anterior"
            >
              <ChevronLeft size={16} className="icon" />
            </button>

            <span className="page-pill">
              {index + 1}/{entries.length}
            </span>

            <button
              type="button"
              className="btn-small btn-icon"
              onClick={() => setIndex((i) => Math.min(entries.length - 1, i + 1))}
              disabled={index >= entries.length - 1}
              aria-label="Producto siguiente"
            >
              <ChevronRight size={16} className="icon" />
            </button>

            {/* Con 12 productos, buscar el incompleto pasando de a uno es tedioso. */}
            {missing > 0 && (
              <button
                type="button"
                className="btn-small"
                onClick={() => {
                  const next = entries.findIndex(
                    (e) => !String(e.name).trim() || parsePriceLoose(e.price) === null
                  );
                  if (next >= 0) setIndex(next);
                }}
              >
                Ir al que falta
              </button>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary btn-small" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary btn-icon"
            onClick={() => onDone(entries)}
            disabled={missing > 0 || aiState === "running"}
            title={missing > 0 ? "Completá nombre y precio de todos" : undefined}
          >
            <Check size={16} className="icon" />
            Agregar {entries.length} al lote
          </button>
        </div>
      </div>
    </div>
  );
}
