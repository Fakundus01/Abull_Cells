// src/pages/Store.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "../services/api";
import ProductCard from "../components/ProductCard";
import {
  Store as StoreIcon,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  RefreshCw,
  X,
  Loader2,
  AlertTriangle,
  PackageSearch,
} from "lucide-react";

function Store() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error | ready
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [sort, setSort] = useState("relevancia");

  async function load() {
  try {
    setStatus("loading");
    const data = await fetchProducts();
    setProducts(data || []);
    setStatus("ready");
  } catch (err) {
    console.error("[STORE] Error al cargar productos:", err);
    setStatus("error");
  }
}

  useEffect(() => {
    load();
  }, []);


  const categories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["todos", ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];

    if (category !== "todos") {
      list = list.filter(
        (p) => (p.category || "").toLowerCase() === category.toLowerCase()
      );
    }

    if (search.trim() !== "") {
      const term = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(term) ||
          ((p.description || "").toLowerCase().includes(term))
      );
    }

    if (sort === "precio-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "precio-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "nombre-asc") list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, category, search, sort]);

  const hasFilters =
    search.trim() !== "" || category !== "todos" || sort !== "relevancia";

  function resetFilters() {
    setSearch("");
    setCategory("todos");
    setSort("relevancia");
  }

  return (
    <main className="home-section store-page">
      <header className="store-header store-header--v2 card-animate">
        <div className="store-title-wrap">
    <div>
      <div className="store-badge">
        <StoreIcon size={18} className="icon" />
        Tienda
      </div>

      <h1 className="store-title">Tienda</h1>
      <p className="store-subtitle">Explorá todos los productos de Abul Cells.</p>
    </div>
  </div>

        <div className="store-header-actions">
          <button
            type="button"
            className="btn-secondary btn-icon"
            onClick={load}
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <>
                <Loader2 size={18} className="icon spin" />
                Cargando...
              </>
            ) : (
              <>
                <RefreshCw size={18} className="icon" />
                Actualizar
              </>
            )}
          </button>

          {hasFilters && (
            <button type="button" className="btn-secondary btn-icon" onClick={resetFilters}>
              <X size={18} className="icon" />
              Limpiar
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <section className="store-filters store-filters--v2 card-animate">
        <div className="filter-group">
          <label className="filter-label">
            <Search size={16} className="icon" />
            Buscar
          </label>

          <div className="input-with-icon">
            <Search size={16} className="icon muted" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim() !== "" && (
              <button
                type="button"
                className="clear-input"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
              >
                <X size={16} className="icon" />
              </button>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <SlidersHorizontal size={16} className="icon" />
            Categoría
          </label>

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "todos" ? "Todas las categorías" : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <ArrowUpDown size={16} className="icon" />
            Orden
          </label>

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="relevancia">Relevancia</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre-asc">Nombre: A-Z</option>
          </select>
        </div>

        <div className="results-chip">
          <span className="chip-title">Resultados</span>
          <span className="chip-value">
            {status === "ready" ? filtered.length : "—"}
          </span>
        </div>
      </section>

      {/* States */}
      {status === "loading" && (
        <div className="store-state card-animate">
          <Loader2 size={22} className="icon spin" />
          <div>
            <p className="state-title">Cargando productos…</p>
            <p className="state-subtitle">Aguantá un toque, ya aparece el catálogo.</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="store-state error card-animate">
          <AlertTriangle size={22} className="icon" />
          <div>
            <p className="state-title">Ocurrió un error al cargar los productos</p>
            <p className="state-subtitle">Probá de nuevo. Si persiste, revisamos el endpoint.</p>
            <button className="btn-primary btn-icon" onClick={load}>
              <RefreshCw size={18} className="icon" />
              Reintentar
            </button>
          </div>
        </div>
      )}

      {status === "ready" && filtered.length === 0 && (
        <div className="store-state empty card-animate">
          <PackageSearch size={22} className="icon" />
          <div>
            <p className="state-title">No encontramos productos con esos filtros</p>
            <p className="state-subtitle">
              Probá cambiar la categoría o limpiar la búsqueda.
            </p>
            {hasFilters && (
              <button className="btn-secondary btn-icon" onClick={resetFilters}>
                <X size={18} className="icon" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {status === "ready" && filtered.length > 0 && (
        <div className="product-grid store-grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}

export default Store;
