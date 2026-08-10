import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ShoppingCart, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import { getOfferMeta } from "../utils/pricing";
import { DEFAULT_PRODUCT_IMAGE, resolveImageUrl } from "../utils/imageUrl";

function ProductModal({ product, onClose }) {
  const { t } = useLanguage();
  const { addToCart, items } = useCart();
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState("right");
  const [justAdded, setJustAdded] = useState(false);

  const images = useMemo(() => {
    if (!product) return [];
    const list = Array.isArray(product.images) ? product.images : [];
    const main = product.imageUrl || product.image_url || "";
    const merged = [...list];
    if (main && !merged.includes(main)) merged.unshift(main);
    const resolved = merged.map((url) => resolveImageUrl(url)).filter(Boolean);
    return resolved.length ? resolved : [DEFAULT_PRODUCT_IMAGE];
  }, [product]);

  const { hasOffer, basePrice, finalPrice, offerLabel } = useMemo(
    () => getOfferMeta(product),
    [product]
  );

  useEffect(() => {
    setActiveIndex(0);
    setSlideDirection("right");
  }, [images]);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), 900);
    return () => clearTimeout(timeout);
  }, [justAdded]);

  if (!product) return null;

  const activeImage = images[activeIndex] || DEFAULT_PRODUCT_IMAGE;
  const cartItem = items.find((i) => i.id === product?.id);
  const qtyInCart = cartItem?.quantity ?? 0;
  const maxStock = Number(product?.stock ?? 0);
  const hasCap = Number.isFinite(maxStock) && maxStock > 0;
  const isMaxQty = hasCap && qtyInCart >= maxStock;
  const isOut = Number(product?.stock ?? 0) <= 0;

  const fmt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-AR");
  };

  const handleSelectImage = (index, direction = "right") => {
    if (!images.length || index === activeIndex) return;
    const safeIndex = (index + images.length) % images.length;
    setSlideDirection(direction);
    setActiveIndex(safeIndex);
  };

  const handleNext = () => handleSelectImage(activeIndex + 1, "right");
  const handlePrev = () => handleSelectImage(activeIndex - 1, "left");

  const handleAddOne = () => {
    if (isMaxQty || isOut) return;

    addToCart(
      {
        id: product.id,
        name: product.name,
        price: Number(finalPrice),
        originalPrice: hasOffer ? Number(basePrice) : null,
        offerLabel: hasOffer ? offerLabel : null,
        imageUrl: activeImage,
        stock: Number.isFinite(Number(product?.stock)) ? Number(product?.stock) : undefined,
      },
      1
    );

    setJustAdded(true);
  };

  return (
    <div className="product-modal-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="product-modal-card" onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="product-modal-close"
          onClick={onClose}
          aria-label={t("productModal.close")}
          title={t("productModal.close")}
        >
          <X size={18} />
        </button>

        <div className="product-modal-content">
          <div className="product-modal-gallery">
            <div className="product-modal-main-frame">
              <img
                key={`${activeImage}-${slideDirection}`}
                src={activeImage}
                alt={product.name || t("productCard.noImage")}
                className={`product-modal-main-img slide-${slideDirection}`}
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                }}
              />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="product-modal-arrow left"
                    onClick={handlePrev}
                    aria-label={t("productModal.prevImage") ?? "Imagen anterior"}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    className="product-modal-arrow right"
                    onClick={handleNext}
                    aria-label={t("productModal.nextImage") ?? "Imagen siguiente"}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 ? (
              <div className="product-modal-thumbs">
                {images.map((img, index) => (
                  <button
                    type="button"
                    key={img}
                    className={[
                      "product-modal-thumb",
                      img === activeImage ? "active" : "",
                    ].join(" ")}
                    onClick={() => handleSelectImage(index, index > activeIndex ? "right" : "left")}
                  >
                    <img
                      src={img}
                      alt={product.name || t("productCard.noImage")}
                      onError={(event) => {
                        event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="product-modal-muted">{t("productModal.noImages")}</p>
            )}
          </div>

          <div className="product-modal-details">
            <h2 className="product-modal-title">{product.name}</h2>
            {product.category && (
              <span className="product-category-pill">{product.category}</span>
            )}
            {product.description && (
              <p className="product-modal-description">{product.description}</p>
            )}

            <div className="product-modal-price">
              {hasOffer ? (
                <>
                  <span className="product-price old">${fmt(basePrice)}</span>
                  <span className="product-price new">${fmt(finalPrice)}</span>
                </>
              ) : (
                <span className="product-price">${fmt(finalPrice)}</span>
              )}
            </div>

             <div className="product-modal-actions">
              <button
                type="button"
                className={[
                  "btn-primary",
                  "btn-icon",
                  "btn-full",
                  "product-modal-add",
                  justAdded ? "added" : "",
                ].join(" ")}
                onClick={handleAddOne}
                disabled={isMaxQty || isOut}
                title={isMaxQty ? t("productCard.maxStock") : t("productCard.addToCart")}
              >
                {isMaxQty || isOut ? (
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
      </div>
    </div>
  );
}

export default ProductModal;