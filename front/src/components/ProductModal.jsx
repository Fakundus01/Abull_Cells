import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { getOfferMeta } from "../utils/pricing";
import { resolveImageUrl } from "../utils/imageUrl";

function ProductModal({ product, onClose }) {
  const { t } = useLanguage();
  const [activeImage, setActiveImage] = useState("");

  const images = useMemo(() => {
    if (!product) return [];
    const list = Array.isArray(product.images) ? product.images : [];
    const main = product.imageUrl || product.image_url || "";
    const merged = [...list];
    if (main && !merged.includes(main)) merged.unshift(main);
    return merged.map((url) => resolveImageUrl(url)).filter(Boolean);
  }, [product]);

  const { hasOffer, basePrice, finalPrice } = useMemo(
    () => getOfferMeta(product),
    [product]
  );

  useEffect(() => {
    setActiveImage(images[0] || "");
  }, [images]);

  if (!product) return null;

  const fmt = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-AR");
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
            {activeImage ? (
              <img src={activeImage} alt={product.name} className="product-modal-main" />
            ) : (
              <div className="product-modal-main placeholder">
                {t("productCard.noImage")}
              </div>
            )}

            {images.length > 1 ? (
              <div className="product-modal-thumbs">
                {images.map((img) => (
                  <button
                    type="button"
                    key={img}
                    className={[
                      "product-modal-thumb",
                      img === activeImage ? "active" : "",
                    ].join(" ")}
                    onClick={() => setActiveImage(img)}
                  >
                    <img src={img} alt={product.name} />
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;