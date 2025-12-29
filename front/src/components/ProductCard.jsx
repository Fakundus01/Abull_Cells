// src/components/ProductCard.jsx
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { ShoppingCart, Flame, Image as ImageIcon, Check } from "lucide-react";

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const {
    id,
    name,
    description,
    price,
    category,
    stock,
    imageUrl,
    image_url,
    isOffer,
    is_offer,
    offer_label,
    offerLabel,
  } = product;

  const finalImage = imageUrl || image_url || "";

  const isOfferActive =
    isOffer === true ||
    is_offer === true ||
    Boolean(offer_label || offerLabel);

  const offerText = offer_label || offerLabel || "Oferta";

  const disabled = stock === 0;

  const stockVariant = useMemo(() => {
    if (typeof stock !== "number") return "unknown";
    if (stock <= 0) return "out";
    if (stock <= 3) return "low";
    return "ok";
  }, [stock]);

  function handleAddToCart() {
    addToCart(
      {
        id,
        name,
        price,
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
        {isOfferActive && (
          <span className="product-offer-badge product-offer-badge--v2">
            <Flame size={14} className="icon" />
            {offerText}
          </span>
        )}

        {stockVariant === "out" && (
          <span className="product-out-badge">Sin stock</span>
        )}

        {finalImage ? (
          <img src={finalImage} alt={name} className="product-card-image product-card-image--v2" />
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

          {category && (
            <span className="product-category-pill">
              {category}
            </span>
          )}
        </div>

        {description && (
          <p className="product-description">
            {description.length > 90 ? description.slice(0, 90) + "..." : description}
          </p>
        )}

        <div className="product-card-footer product-card-footer--v2">
          <div className="price-block">
            <p className="product-price">
              ${price?.toLocaleString("es-AR")}
            </p>

            {typeof stock === "number" && (
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
