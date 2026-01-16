// src/pages/Store.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProducts } from "../services/api";
import ProductCard from "../components/ProductCard";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error | ready
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");
  const [sort, setSort] = useState("relevancia");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setCategory(cat);
  }, [searchParams]);

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
        {t("store.badge")}
      </div>

      <h1 className="store-title">{t("store.title")}</h1>
      <p className="store-subtitle">{t("store.subtitle")}</p>
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
                {t("store.actions.loading")}
              </>
            ) : (
              <>
                <RefreshCw size={18} className="icon" />
                {t("store.actions.refresh")}
              </>
            )}
          </button>

          {hasFilters && (
            <button type="button" className="btn-secondary btn-icon" onClick={resetFilters}>
              <X size={18} className="icon" />
              {t("store.actions.clear")}
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <section className="store-filters store-filters--v2 card-animate">
        <div className="filter-group">
          <label className="filter-label">
            <Search size={16} className="icon" />
            {t("store.filters.searchLabel")}
          </label>

          <div className="input-with-icon">
            <Search size={16} className="icon muted" />
            <input
              type="text"
              placeholder={t("store.filters.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search.trim() !== "" && (
              <button
                type="button"
                className="clear-input"
                onClick={() => setSearch("")}
                aria-label={t("store.filters.clearSearch")}
              >
                <X size={16} className="icon" />
              </button>
            )}
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <SlidersHorizontal size={16} className="icon" />
            {t("store.filters.categoryLabel")}
          </label>

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "todos" ? t("store.filters.allCategories") : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <ArrowUpDown size={16} className="icon" />
           {t("store.filters.sortLabel")}
          </label>

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="relevancia">{t("store.filters.sort.relevance")}</option>
            <option value="precio-asc">{t("store.filters.sort.priceAsc")}</option>
            <option value="precio-desc">{t("store.filters.sort.priceDesc")}</option>
            <option value="nombre-asc">{t("store.filters.sort.nameAsc")}</option>
          </select>
        </div>

        <div className="results-chip">
          <span className="chip-title">{t("store.filters.resultsLabel")}</span>
          <span className="chip-value">
            {status === "ready" ? filtered.length : t("store.filters.resultsPlaceholder")}
          </span>
        </div>
      </section>

      {/* States */}
      {status === "loading" && (
        <div className="store-state card-animate">
          <Loader2 size={22} className="icon spin" />
          <div>
            <p className="state-title">{t("store.states.loadingTitle")}</p>
            <p className="state-subtitle">{t("store.states.loadingSubtitle")}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="store-state error card-animate">
          <AlertTriangle size={22} className="icon" />
          <div>
            <p className="state-title">{t("store.states.errorTitle")}</p>
            <p className="state-subtitle">{t("store.states.errorSubtitle")}</p>
            <button className="btn-primary btn-icon" onClick={load}>
              <RefreshCw size={18} className="icon" />
              {t("store.actions.retry")}
            </button>
          </div>
        </div>
      )}

      {status === "ready" && filtered.length === 0 && (
        <div className="store-state empty card-animate">
          <PackageSearch size={22} className="icon" />
          <div>
            <p className="state-title">{t("store.states.emptyTitle")}</p>
            <p className="state-subtitle">{t("store.states.emptySubtitle")}</p>
            {hasFilters && (
              <button className="btn-secondary btn-icon" onClick={resetFilters}>
                <X size={18} className="icon" />
               {t("store.actions.clearFilters")}
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
