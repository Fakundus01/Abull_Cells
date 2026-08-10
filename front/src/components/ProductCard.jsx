// src/components/ProductCard.jsx
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { ShoppingCart, Flame, Check } from "lucide-react";
import { getOfferMeta } from "../utils/pricing";
import { useLanguage } from "../context/LanguageContext";
import { DEFAULT_PRODUCT_IMAGE, resolveImageUrl } from "../utils/imageUrl";

function ProductCard({ product, onOpen }) {
  const { t } = useLanguage();
  const { addToCart, decrementFromCart, items } = useCart();

  const cartItem = items.find((i) => i.id === product?.id);
  const qtyInCart = cartItem?.quantity ?? 0;

  const maxStock = Number(product?.stock ?? 0);
  const hasCap = Number.isFinite(maxStock) && maxStock > 0;
  const isMaxQty = hasCap && qtyInCart >= maxStock;

  const [justAdded, setJustAdded] = useState(false);

  const { id, name, description, category, stock, imageUrl, image_url } = product || {};

  const { hasOffer, basePrice, finalPrice, offerLabel } = useMemo(
    () => getOfferMeta(product),
    [product]
  );

   const finalImage = resolveImageUrl(imageUrl || image_url || "", DEFAULT_PRODUCT_IMAGE);
  const stockVariant = useMemo(() => {
    const s = Number(stock);
    if (!Number.isFinite(s)) return "unknown";
    if (s <= 0) return "out";
    if (s <= 3) return "low";
    return "ok";
  }, [stock]);

  const categoryLabel = useMemo(() => {
    const raw = String(category || "").trim();
    if (!raw) return "";
    const normalized = raw.toLowerCase();
    if (normalized === "celulares") return t("store.categories.phones");
    if (normalized === "notebooks") return t("store.categories.laptops");
    if (normalized === "periféricos" || normalized === "perifericos") {
      return t("store.categories.peripherals");
    }
    if (normalized === "audio") return t("store.categories.audio");
    if (normalized === "gaming") return t("store.categories.gaming");
    if (normalized === "accesorios") return t("store.categories.accessories");
    return raw;
  }, [category, t]);

  const fmt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-AR");
  };

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 900);
    return () => clearTimeout(t);
  }, [justAdded]);

  const handleAddOne = () => {
    if (isMaxQty) return;

    addToCart(
      {
        id,
        name,
        price: Number(finalPrice),
        originalPrice: hasOffer ? Number(basePrice) : null,
        offerLabel: hasOffer ? offerLabel : null,
        imageUrl: finalImage,
        stock: Number.isFinite(Number(stock)) ? Number(stock) : undefined,
      },
      1
    );

    setJustAdded(true);
  };

  return (
    <article className="product-card product-card--v2 card-animate">
      <div className="product-card-image-wrapper product-card-image-wrapper--v2">
        {hasOffer && (
          <span className="product-offer-badge product-offer-badge--v2">
            <Flame size={14} className="icon" />
            {offerLabel || t("productCard.offer")}
          </span>
        )}

         {stockVariant === "out" && (
          <span className="product-out-badge">{t("productCard.outOfStock")}</span>
        )}

         <button
          type="button"
          className="product-card-image-button"
          onClick={onOpen}
          aria-label={name || t("productCard.noImage")}
        >
           <img
            src={finalImage}
            alt={name || t("productCard.noImage")}
            className="product-card-image product-card-image--v2"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
            }}
          />
        </button>
      </div>

      <div className="product-card-body product-card-body--v2">
        <div className="product-head">
          <h3 className="product-title">{name}</h3>
          {categoryLabel && <span className="product-category-pill">{categoryLabel}</span>}
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
                {stockVariant === "ok" && t("productCard.stock.ok", { stock })}
                {stockVariant === "low" && t("productCard.stock.low", { stock })}
                {stockVariant === "out" && t("productCard.outOfStock")}
              </span>
            )}
          </div>

          <div className="qty-control">
            {qtyInCart > 0 && (
              <button
                type="button"
                className="qty-btn"
                onClick={() => decrementFromCart(product.id, 1)}
                aria-label={t("productCard.removeOne")}
                title={t("productCard.removeOne")}
              >
                −
              </button>
            )}

            <button
              type="button"
              className={[
                "btn-primary",
                "btn-small",
                "btn-icon",
                "add-btn",
                justAdded ? "added" : "",
              ].join(" ")}
              onClick={handleAddOne}
              disabled={isMaxQty || stockVariant === "out"}
              title={isMaxQty ? t("productCard.maxStock") : t("productCard.addToCart")}
            >
              {isMaxQty || stockVariant === "out" ? (
                t("productCard.outOfStock")
              ) : justAdded ? (
                <>
                  <Check size={18} className="icon" />
                  {t("productCard.added")}
                </>
              ) : (
                <>
                  <ShoppingCart size={18} className="icon" />
                  {t("productCard.add")}
                </>
              )}

              {qtyInCart > 0 && <span className="qty-badge">x{qtyInCart}</span>}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
