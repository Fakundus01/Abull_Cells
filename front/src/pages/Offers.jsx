// src/pages/Offers.jsx
import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../services/api";
import ProductCard from "../components/ProductCard";
import { Tag, Loader2, AlertTriangle, Percent } from "lucide-react";
import { Link } from "react-router-dom";

function Offers() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle");

  async function load() {
    try {
      setStatus("loading");
      const data = await getProducts();
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

  return (
  <main className="home-section">
    <header className="section-head card-v2 card-pad card-animate">
      <div>
        <div className="badge">
          <Percent size={16} className="icon" />
          Ofertas
        </div>
        <h1 className="section-title">Ofertas</h1>
        <p className="section-subtitle">Productos con descuentos especiales en Abul Cells.</p>
      </div>
    </header>

    {status === "loading" && (
      <div className="state card-animate">
        <Loader2 size={22} className="icon spin" />
        <div>
          <p className="state-title">Cargando ofertas…</p>
          <p className="state-subtitle">Buscando lo mejor para vos.</p>
        </div>
      </div>
    )}

    {status === "error" && (
      <div className="state error card-animate">
        <AlertTriangle size={22} className="icon" />
        <div>
          <p className="state-title">No pudimos cargar las ofertas</p>
          <p className="state-subtitle">Probá de nuevo en un instante.</p>
        </div>
      </div>
    )}

    {status === "ready" && offers.length === 0 && (
      <div className="state card-animate">
        <Tag size={22} className="icon" />
        <div>
          <p className="state-title">Por ahora no hay ofertas activas</p>
          <p className="state-subtitle">Volvé más tarde, siempre hay novedades.</p>
        </div>
      </div>
    )}

    {offers.length > 0 && (
      <div className="product-grid store-grid">
        {offers.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    )}
  </main>
);
}

export default Offers;
