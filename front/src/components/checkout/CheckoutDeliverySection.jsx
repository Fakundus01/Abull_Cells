// FASE 3: modularización de Checkout (entrega/envío).

function CheckoutDeliverySection({
  t,
  user,
  deliveryMethod,
  setDeliveryMethod,
  addresses,
  loadingAddresses,
  selectedAddressId,
  setSelectedAddressId,
  useManualAddress,
  handleManualToggle,
  manualAddress,
  handleManualAddrChange,
}) {
  return (
    <div className="checkout-section card-animate">
      <h2 className="checkout-h2">{t("checkout.deliveryTitle")}</h2>

      <div className="delivery-options">
        <label className={`delivery-option ${deliveryMethod === "pickup" ? "active" : ""}`}>
          <input
            type="radio"
            name="deliveryMethod"
            value="pickup"
            checked={deliveryMethod === "pickup"}
            onChange={() => setDeliveryMethod("pickup")}
          />
          <span className="delivery-option-text">{t("checkout.delivery.pickup")}</span>
        </label>

        <label className={`delivery-option ${deliveryMethod === "delivery" ? "active" : ""}`}>
          <input
            type="radio"
            name="deliveryMethod"
            value="delivery"
            checked={deliveryMethod === "delivery"}
            onChange={() => setDeliveryMethod("delivery")}
          />
          <span className="delivery-option-text">{t("checkout.delivery.delivery")}</span>
          <span className="delivery-option-note">{t("checkout.delivery.areaNote")}</span>
        </label>
      </div>

      {deliveryMethod === "delivery" && (
        <div className="delivery-box">
          {user && (
            <>
              <p className="checkout-muted">{t("checkout.delivery.savedAddressHint")}</p>

              {loadingAddresses ? (
                <p className="checkout-muted">{t("checkout.delivery.loading")}</p>
              ) : addresses.length > 0 ? (
                <div className="delivery-saved">
                  <label className="auth-label">
                    {t("checkout.delivery.savedAddressLabel")}
                    <select
                      className="address-select"
                      value={selectedAddressId ?? ""}
                      disabled={useManualAddress}
                      onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} — {a.street}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className={`delivery-toggle ${useManualAddress ? "active" : ""}`}
                    onClick={handleManualToggle}
                  >
                    {useManualAddress
                      ? t("checkout.delivery.savedToggle")
                      : t("checkout.delivery.manualToggle")}
                  </button>
                </div>
              ) : (
                <div className="delivery-empty">
                  <p className="checkout-muted">{t("checkout.delivery.noSavedAddresses")}</p>
                  <p className="checkout-muted">{t("checkout.delivery.manualHint")}</p>
                </div>
              )}
            </>
          )}

          {(!user || addresses.length === 0 || useManualAddress || !selectedAddressId) && (
            <div className="delivery-manual">
              <p className="delivery-manual-title">{t("checkout.delivery.manualTitle")}</p>
              <div className="delivery-row">
                <label className="auth-label">
                  {t("checkout.delivery.typeLabel")}
                  <select
                    name="type"
                    className="address-select"
                    value={manualAddress.type}
                    onChange={handleManualAddrChange}
                  >
                    <option value="house">{t("checkout.delivery.types.house")}</option>
                    <option value="apartment">{t("checkout.delivery.types.apartment")}</option>
                    <option value="office">{t("checkout.delivery.types.office")}</option>
                    <option value="other">{t("checkout.delivery.types.other")}</option>
                  </select>
                </label>

                <label className="auth-label">
                  {t("checkout.delivery.streetLabel")}
                  <input
                    name="street"
                    value={manualAddress.street}
                    onChange={handleManualAddrChange}
                    placeholder={t("checkout.delivery.streetPlaceholder")}
                  />
                </label>
              </div>

              <div className="delivery-row">
                <label className="auth-label">
                  {t("checkout.delivery.cityLabel")}
                  <input
                    name="city"
                    value={manualAddress.city}
                    onChange={handleManualAddrChange}
                    placeholder={t("checkout.delivery.cityPlaceholder")}
                  />
                </label>

                <label className="auth-label">
                  {t("checkout.delivery.provinceLabel")}
                  <input
                    name="province"
                    value={manualAddress.province}
                    onChange={handleManualAddrChange}
                    placeholder={t("checkout.delivery.provincePlaceholder")}
                  />
                </label>
              </div>

              <div className="delivery-row">
                <label className="auth-label">
                  {t("checkout.delivery.postalCodeLabel")}
                  <input
                    name="postalCode"
                    value={manualAddress.postalCode}
                    onChange={handleManualAddrChange}
                    placeholder={t("checkout.delivery.postalCodePlaceholder")}
                  />
                </label>

                <label className="auth-label">
                  {t("checkout.delivery.apartmentLabel")}
                  <input
                    name="apartment"
                    value={manualAddress.apartment}
                    onChange={handleManualAddrChange}
                    placeholder={t("checkout.delivery.apartmentPlaceholder")}
                  />
                </label>
              </div>

              <div className="delivery-row">
                <label className="auth-label">
                  {t("checkout.delivery.floorLabel")}
                  <input
                    name="floor"
                    value={manualAddress.floor}
                    onChange={handleManualAddrChange}
                    placeholder={t("checkout.delivery.floorPlaceholder")}
                  />
                </label>

                <label className="auth-label">
                  {t("checkout.delivery.bellLabel")}
                  <input
                    name="bell"
                    value={manualAddress.bell}
                    onChange={handleManualAddrChange}
                    placeholder={t("checkout.delivery.bellPlaceholder")}
                  />
                </label>
              </div>

              <label className="auth-label">
                {t("checkout.delivery.notesLabel")}
                <input
                  name="notes"
                  value={manualAddress.notes}
                  onChange={handleManualAddrChange}
                  placeholder={t("checkout.delivery.notesPlaceholder")}
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CheckoutDeliverySection;