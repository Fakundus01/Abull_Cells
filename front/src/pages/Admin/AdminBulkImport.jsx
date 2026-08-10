// src/pages/Admin/AdminBulkImport.jsx
import { useMemo, useRef, useState } from "react";
import {
  ClipboardPaste,
  FileSpreadsheet,
  Loader2,
  Plus,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  makeEmptyRow,
  parseProductRows,
  parsePriceLoose,
  validateRow,
} from "../../utils/parseProductRows";

const EJEMPLO = [
  "Funda silicona iPhone 15\t12500\t20\tFundas",
  "Cargador 20W USB-C\t8900\t35\tCargadores",
  "Cable USB-C 1m\t4990\t50\tCables",
].join("\n");

/**
 * Alta masiva de productos. Tres formas de entrar datos (pegar, CSV, manual)
 * que convergen en la misma tabla editable, para revisar antes de guardar.
 *
 * Pensado para usarse desde el celular: la previsualizacion son tarjetas
 * apiladas, no una tabla con scroll horizontal.
 */
export default function AdminBulkImport({ onCancel, onSave, saving }) {
  const [source, setSource] = useState("paste");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState("");
  const [serverErrors, setServerErrors] = useState({});
  const fileRef = useRef(null);

  const rowErrors = useMemo(() => rows.map((row) => validateRow(row)), [rows]);
  const invalidCount = rowErrors.filter((e) => Object.keys(e).length > 0).length;
  const validCount = rows.length - invalidCount;

  const total = useMemo(
    () =>
      rows.reduce((acc, row) => {
        const price = parsePriceLoose(row.price) || 0;
        const stock = Number(String(row.stock).replace(/[^\d-]/g, "")) || 0;
        return acc + price * stock;
      }, 0),
    [rows]
  );

  function ingest(text, origin) {
    const { rows: parsed, usedHeader } = parseProductRows(text);
    if (parsed.length === 0) {
      setNotice("No se encontró ninguna fila con datos.");
      return;
    }
    setRows((prev) => [...prev, ...parsed]);
    setServerErrors({});
    setNotice(
      `${parsed.length} fila${parsed.length === 1 ? "" : "s"} agregada${
        parsed.length === 1 ? "" : "s"
      } desde ${origin}${usedHeader ? " (se detectó fila de encabezados)" : ""}.`
    );
  }

  function handleParsePaste() {
    ingest(rawText, "el texto pegado");
    setRawText("");
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      ingest(text, file.name);
    } catch {
      setNotice("No se pudo leer el archivo.");
    }
    event.target.value = "";
  }

  function updateRow(index, field, value) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
    setServerErrors((prev) => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setServerErrors({});
  }

  async function handleSave() {
    const result = await onSave(rows);
    // El backend es todo-o-nada: si vuelve con errores, los mapeamos por indice
    // para marcar exactamente las filas que hay que corregir.
    if (result?.errors?.length) {
      const byIndex = {};
      result.errors.forEach((e) => {
        byIndex[e.index] = e.msg;
      });
      setServerErrors(byIndex);
      setNotice("");
    } else if (result?.ok) {
      setRows([]);
      setServerErrors({});
      setNotice("");
    }
  }

  return (
    <div className="admin-card bulk-import">
      <div className="admin-card-header">
        <h2 className="admin-card-title">
          <Table2 size={18} className="icon" /> Carga masiva
        </h2>
        <button
          type="button"
          className="btn-small btn-icon"
          onClick={onCancel}
          aria-label="Cerrar carga masiva"
        >
          <X size={16} className="icon" />
        </button>
      </div>

      <div className="bulk-source-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={source === "paste"}
          className={`bulk-tab ${source === "paste" ? "is-active" : ""}`}
          onClick={() => setSource("paste")}
        >
          <ClipboardPaste size={16} className="icon" /> Pegar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === "file"}
          className={`bulk-tab ${source === "file" ? "is-active" : ""}`}
          onClick={() => setSource("file")}
        >
          <FileSpreadsheet size={16} className="icon" /> Archivo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === "manual"}
          className={`bulk-tab ${source === "manual" ? "is-active" : ""}`}
          onClick={() => setSource("manual")}
        >
          <Plus size={16} className="icon" /> Manual
        </button>
      </div>

      {source === "paste" && (
        <div className="bulk-source-body">
          <p className="admin-card-desc">
            Copiá las filas desde Excel, Google Sheets o el bloc de notas y pegalas acá.
            Orden esperado: <strong>nombre, precio, stock, categoría, descripción</strong>.
            Si la primera fila tiene los títulos de las columnas, se detecta sola.
          </p>
          <textarea
            className="bulk-textarea"
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={EJEMPLO}
            aria-label="Pegar filas de productos"
          />
          <div className="bulk-source-actions">
            <button
              type="button"
              className="btn-primary btn-icon"
              onClick={handleParsePaste}
              disabled={!rawText.trim()}
            >
              <Upload size={16} className="icon" /> Analizar
            </button>
            <button
              type="button"
              className="btn-small"
              onClick={() => setRawText(EJEMPLO)}
            >
              Usar ejemplo
            </button>
          </div>
        </div>
      )}

      {source === "file" && (
        <div className="bulk-source-body">
          <p className="admin-card-desc">
            Subí un archivo <strong>.csv</strong> exportado desde Excel o Sheets. Se
            aceptan separadores coma, punto y coma o tabulación.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            onChange={handleFile}
            aria-label="Archivo CSV de productos"
          />
        </div>
      )}

      {source === "manual" && (
        <div className="bulk-source-body">
          <p className="admin-card-desc">
            Agregá filas vacías y completalas a mano. Útil para cargar unos pocos
            productos sin salir de la app.
          </p>
          <button
            type="button"
            className="btn-primary btn-icon"
            onClick={() => {
              setRows((prev) => [...prev, makeEmptyRow()]);
              setNotice("");
            }}
          >
            <Plus size={16} className="icon" /> Agregar fila
          </button>
        </div>
      )}

      {notice && <p className="bulk-notice">{notice}</p>}

      {rows.length > 0 && (
        <>
          <div className="bulk-summary">
            <div className="summary-pill">
              <span>Filas</span>
              <strong>{rows.length}</strong>
            </div>
            <div className={`summary-pill ${invalidCount ? "warning" : "highlight"}`}>
              <span>{invalidCount ? "Con errores" : "Listas"}</span>
              <strong>{invalidCount || validCount}</strong>
            </div>
            <div className="summary-pill">
              <span>Valor de stock</span>
              <strong>${total.toLocaleString("es-AR")}</strong>
            </div>
          </div>

          <div className="bulk-rows">
            {rows.map((row, index) => {
              const errors = rowErrors[index];
              const serverError = serverErrors[index];
              const hasError = Object.keys(errors).length > 0 || serverError;

              return (
                <div
                  key={index}
                  className={`bulk-row ${hasError ? "has-error" : ""}`}
                >
                  <div className="bulk-row-head">
                    <span className="bulk-row-num">#{index + 1}</span>
                    <button
                      type="button"
                      className="btn-small btn-danger btn-icon"
                      onClick={() => removeRow(index)}
                      aria-label={`Quitar fila ${index + 1}`}
                    >
                      <Trash2 size={14} className="icon" />
                    </button>
                  </div>

                  <label className="bulk-field bulk-field--wide">
                    <span>Nombre</span>
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(index, "name", e.target.value)}
                      className={errors.name ? "is-invalid" : ""}
                      placeholder="Funda silicona iPhone 15"
                    />
                    {errors.name && <small className="bulk-error">{errors.name}</small>}
                  </label>

                  <label className="bulk-field">
                    <span>Precio</span>
                    <input
                      value={row.price}
                      onChange={(e) => updateRow(index, "price", e.target.value)}
                      className={errors.price ? "is-invalid" : ""}
                      inputMode="decimal"
                      placeholder="12500"
                    />
                    {errors.price ? (
                      <small className="bulk-error">{errors.price}</small>
                    ) : (
                      row.price !== "" && (
                        <small className="bulk-hint">
                          ${(parsePriceLoose(row.price) || 0).toLocaleString("es-AR")}
                        </small>
                      )
                    )}
                  </label>

                  <label className="bulk-field">
                    <span>Stock</span>
                    <input
                      value={row.stock}
                      onChange={(e) => updateRow(index, "stock", e.target.value)}
                      className={errors.stock ? "is-invalid" : ""}
                      inputMode="numeric"
                      placeholder="0"
                    />
                    {errors.stock && <small className="bulk-error">{errors.stock}</small>}
                  </label>

                  <label className="bulk-field">
                    <span>Categoría</span>
                    <input
                      value={row.category}
                      onChange={(e) => updateRow(index, "category", e.target.value)}
                      placeholder="Fundas"
                    />
                  </label>

                  {serverError && (
                    <p className="bulk-error bulk-error--server">{serverError}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bulk-footer">
            <button
              type="button"
              className="btn-small btn-icon"
              onClick={() => {
                setRows((prev) => [...prev, makeEmptyRow()]);
                setNotice("");
              }}
            >
              <Plus size={16} className="icon" /> Agregar fila
            </button>

            <div className="bulk-footer-actions">
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => {
                  setRows([]);
                  setServerErrors({});
                  setNotice("");
                }}
              >
                Vaciar
              </button>
              <button
                type="button"
                className="btn-primary btn-icon"
                onClick={handleSave}
                disabled={saving || rows.length === 0 || invalidCount > 0}
                title={
                  invalidCount > 0
                    ? "Corregí las filas marcadas antes de guardar"
                    : undefined
                }
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="icon spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="icon" /> Guardar {rows.length}{" "}
                    producto{rows.length === 1 ? "" : "s"}
                  </>
                )}
              </button>
            </div>
          </div>

          {invalidCount > 0 && (
            <p className="bulk-blocker">
              Hay {invalidCount} fila{invalidCount === 1 ? "" : "s"} con errores. Se
              guardan todas juntas o ninguna, así que corregilas antes de continuar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
