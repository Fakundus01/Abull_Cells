// src/pages/Offers.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "../services/api";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import { Tag, Loader2, AlertTriangle, Percent } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

function Offers() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  async function load() {
    try {
      setStatus("loading");
      const data = await fetchProducts();
      setProducts(data || []);
      setStatus("ready");
    } catch (err) {
      console.error("[OFFERS] Error al cargar productos:", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const offers = useMemo(
    () =>
      products.filter(
        (p) =>
          p.isOffer === true ||
          p.is_offer === true ||
          p.offer_label ||
          p.offerLabel
      ),
    [products]
  );

  const totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
  const pagedOffers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return offers.slice(start, start + pageSize);
  }, [offers, page]);

  useEffect(() => {
    setPage(1);
  }, [offers.length]);

  return (
  <main className="home-section">
      <header className="section-head card-v2 card-pad card-animate">
        <div>
          <div className="badge">
            <Percent size={16} className="icon" />
            {t("offers.badge")}
          </div>
          <h1 className="section-title">{t("offers.title")}</h1>
          <p className="section-subtitle">{t("offers.subtitle")}</p>
      </div>
    </header>

    {status === "loading" && (
        <div className="state card-animate">
          <Loader2 size={22} className="icon spin" />
          <div>
            <p className="state-title">{t("offers.states.loadingTitle")}</p>
            <p className="state-subtitle">{t("offers.states.loadingSubtitle")}</p>
          </div>
      </div>
    )}

   {status === "error" && (
        <div className="state error card-animate">
          <AlertTriangle size={22} className="icon" />
          <div>
            <p className="state-title">{t("offers.states.errorTitle")}</p>
            <p className="state-subtitle">{t("offers.states.errorSubtitle")}</p>
          </div>
      </div>
    )}

   {status === "ready" && offers.length === 0 && (
        <div className="state card-animate">
          <Tag size={22} className="icon" />
          <div>
            <p className="state-title">{t("offers.states.emptyTitle")}</p>
            <p className="state-subtitle">{t("offers.states.emptySubtitle")}</p>
          </div>
      </div>
    )}

      {offers.length > 0 && (
        <div className="product-grid store-grid">
         {pagedOffers.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpen={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      )}
      
      {offers.length > pageSize && (
        <div className="store-pagination">
          <span className="store-pagination-label">
            {t("store.pagination.showing", {
              start: (page - 1) * pageSize + 1,
              end: Math.min(page * pageSize, offers.length),
              total: offers.length,
            })}
          </span>
          <div className="store-pagination-actions">
            <button
              type="button"
              className="btn-small"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              {t("store.pagination.prev")}
            </button>
            <span className="page-pill">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              className="btn-small"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              {t("store.pagination.next")}
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
 );
}

export default Offers;
