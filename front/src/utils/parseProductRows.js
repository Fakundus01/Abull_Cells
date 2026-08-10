// src/utils/parseProductRows.js
//
// Convierte texto tabular (pegado desde Excel/Sheets o un archivo CSV) en filas
// de producto listas para previsualizar y editar antes de guardarlas.

/** Campos que entiende el importador, en el orden posicional por defecto. */
export const FIELD_ORDER = [
  "name",
  "price",
  "stock",
  "category",
  "description",
  "offerLabel",
];

/**
 * Sinónimos aceptados por columna. Se comparan normalizados (sin acentos,
 * minúsculas), así que "Precio", "PRECIO" y "precio " caen todos en `price`.
 */
const HEADER_ALIASES = {
  name: ["nombre", "name", "producto", "titulo", "title", "descripcion corta"],
  price: ["precio", "price", "valor", "importe", "costo"],
  stock: ["stock", "cantidad", "qty", "quantity", "unidades"],
  category: ["categoria", "category", "rubro", "tipo"],
  description: ["descripcion", "description", "detalle", "detalles"],
  offerLabel: ["oferta", "offer", "etiqueta", "offerlabel", "promo"],
};

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas de acento sueltas tras el NFD
    .trim()
    .toLowerCase();
}

/**
 * Detecta el separador contando ocurrencias fuera de comillas.
 * El tab gana siempre: es lo que produce un pegado desde Excel.
 */
function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  if (sample.includes("\t")) return "\t";
  const counts = { ";": 0, ",": 0 };
  let inQuotes = false;
  for (const char of sample) {
    if (char === '"') inQuotes = !inQuotes;
    else if (!inQuotes && char in counts) counts[char] += 1;
  }
  return counts[";"] > counts[","] ? ";" : ",";
}

/**
 * Scanner de CSV/TSV que respeta comillas, comillas escapadas ("") y saltos de
 * línea dentro de un campo entrecomillado.
 */
function splitRows(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);

  return rows.filter((cells) => cells.some((c) => String(c).trim() !== ""));
}

/**
 * ¿La primera fila son encabezados? Lo es si al menos dos celdas coinciden con
 * algún alias conocido. Con una sola coincidencia hay riesgo de comerse un
 * producto que justo se llame "Oferta".
 */
function looksLikeHeader(cells) {
  const allAliases = Object.values(HEADER_ALIASES).flat();
  const hits = cells.filter((cell) => allAliases.includes(normalizeHeader(cell)));
  return hits.length >= 2;
}

function mapHeaderToFields(cells) {
  return cells.map((cell) => {
    const normalized = normalizeHeader(cell);
    const entry = Object.entries(HEADER_ALIASES).find(([, aliases]) =>
      aliases.includes(normalized)
    );
    return entry ? entry[0] : null;
  });
}

export function makeEmptyRow(overrides = {}) {
  return {
    name: "",
    price: "",
    stock: "",
    category: "",
    description: "",
    offerLabel: "",
    // Se completa cuando la fila nace de una imagen ya subida a Cloudinary.
    imageUrl: "",
    thumbUrl: "",
    ...overrides,
  };
}

/**
 * Parsea texto tabular a filas de producto.
 *
 * @returns {{rows: Array<object>, usedHeader: boolean, delimiter: string}}
 */
export function parseProductRows(text) {
  const clean = String(text || "").trim();
  if (!clean) return { rows: [], usedHeader: false, delimiter: "" };

  const delimiter = detectDelimiter(clean);
  const raw = splitRows(clean, delimiter);
  if (raw.length === 0) return { rows: [], usedHeader: false, delimiter };

  let fields = FIELD_ORDER;
  let body = raw;
  const usedHeader = looksLikeHeader(raw[0]);

  if (usedHeader) {
    const mapped = mapHeaderToFields(raw[0]);
    // Las columnas que no reconocemos quedan en null y se ignoran al leer.
    fields = mapped;
    body = raw.slice(1);
  }

  const rows = body.map((cells) => {
    const row = makeEmptyRow();
    cells.forEach((cell, index) => {
      const field = fields[index];
      if (!field) return;
      row[field] = String(cell).trim();
    });
    return row;
  });

  return { rows, usedHeader, delimiter };
}

/** Mismo criterio de precio que el backend, para validar antes de enviar. */
export function parsePriceLoose(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const text = String(value).replace(/[^\d,.-]/g, "").trim();
  if (!text || ["-", ".", ","].includes(text)) return null;

  const decimals = text.match(/[.,](\d{1,2})$/);
  if (decimals) {
    const whole = text.slice(0, decimals.index).replace(/[.,]/g, "") || "0";
    const parsed = Number(`${whole}.${decimals[1]}`);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  const parsed = Number(text.replace(/[.,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Devuelve un objeto {campo: mensaje} con los problemas de la fila. */
export function validateRow(row) {
  const errors = {};

  if (!String(row.name || "").trim()) {
    errors.name = "Falta el nombre";
  }

  const price = parsePriceLoose(row.price);
  if (price === null) {
    errors.price = "Precio inválido";
  } else if (price < 0) {
    errors.price = "No puede ser negativo";
  }

  if (String(row.stock || "").trim() !== "") {
    const stock = Number(String(row.stock).replace(/[^\d-]/g, ""));
    if (!Number.isFinite(stock)) errors.stock = "Stock inválido";
    else if (stock < 0) errors.stock = "No puede ser negativo";
  }

  return errors;
}
