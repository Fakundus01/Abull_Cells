// src/components/ProductCard.jsx
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { ShoppingCart, Flame, Image as ImageIcon, Check } from "lucide-react";
import { getOfferMeta } from "../utils/pricing";

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const {
    id,
    name,
    description,
    category,
    stock,
    imageUrl,
    image_url,
  } = product || {};

  // ✅ oferta (según TU helper)
  const { hasOffer, basePrice, finalPrice, offerLabel } = useMemo(
    () => getOfferMeta(product),
    [product]
  );

  const finalImage = imageUrl || image_url || "";

  const disabled = Number(stock) === 0;

  const stockVariant = useMemo(() => {
    const s = Number(stock);
    if (!Number.isFinite(s)) return "unknown";
    if (s <= 0) return "out";
    if (s <= 3) return "low";
    return "ok";
  }, [stock]);

  const fmt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-AR");
  };

  function handleAddToCart() {
    // ✅ al carrito va el precio FINAL (oferta) + guardamos original para tachar
    addToCart(
      {
        id,
        name,
        price: Number(finalPrice), // ✅ este se paga
        originalPrice: hasOffer ? Number(basePrice) : null, // ✅ para tachar en carrito/checkout
        offerLabel: hasOffer ? offerLabel : null,
        imageUrl: finalImage,
      },
      1
    );

    setJustAdded(true);
  }

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 900);
    return () => clearTimeout(t);
  }, [justAdded]);

  return (
    <article className="product-card product-card--v2 card-animate">
      <div className="product-card-image-wrapper product-card-image-wrapper--v2">
        {hasOffer && (
          <span className="product-offer-badge product-offer-badge--v2">
            <Flame size={14} className="icon" />
            {offerLabel || "Oferta"}
          </span>
        )}

        {stockVariant === "out" && <span className="product-out-badge">Sin stock</span>}

        {finalImage ? (
          <img
            src={finalImage}
            alt={name}
            className="product-card-image product-card-image--v2"
          />
        ) : (
          <div className="product-card-image placeholder placeholder--v2">
            <ImageIcon size={18} className="icon" />
            <span>Sin imagen</span>
          </div>
        )}
      </div>

      <div className="product-card-body product-card-body--v2">
        <div className="product-head">
          <h3 className="product-title">{name}</h3>

          {category && <span className="product-category-pill">{category}</span>}
        </div>

        {description && (
          <p className="product-description">
            {description.length > 90 ? description.slice(0, 90) + "..." : description}
          </p>
        )}

        <div className="product-card-footer product-card-footer--v2">
          <div className="price-block">
            {hasOffer ? (
              <div className="price-stack">
                <p className="product-price old">${fmt(basePrice)}</p>
                <p className="product-price new">${fmt(finalPrice)}</p>
              </div>
            ) : (
              <p className="product-price">${fmt(finalPrice)}</p>
            )}

            {Number.isFinite(Number(stock)) && (
              <span
                className={[
                  "stock-pill",
                  stockVariant === "ok" ? "ok" : "",
                  stockVariant === "low" ? "low" : "",
                  stockVariant === "out" ? "out" : "",
                ].join(" ")}
              >
                {stockVariant === "ok" && `Stock: ${stock}`}
                {stockVariant === "low" && `Últimas ${stock}`}
                {stockVariant === "out" && "Sin stock"}
              </span>
            )}
          </div>

          <button
            type="button"
            className={[
              "btn-primary",
              "btn-small",
              "btn-icon",
              "add-btn",
              justAdded ? "added" : "",
            ].join(" ")}
            onClick={handleAddToCart}
            disabled={disabled}
          >
            {disabled ? (
              "Sin stock"
            ) : justAdded ? (
              <>
                <Check size={18} className="icon" />
                Agregado
              </>
            ) : (
              <>
                <ShoppingCart size={18} className="icon" />
                Agregar
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
