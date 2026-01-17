import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BadgeCheck, Moon, Sun, User } from "lucide-react";
import { fetchAddresses, createAddress, deleteAddress, updateAddress, setDefaultAddress, resendVerifyEmail} from "../services/api";
import { useEffect, useState, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";

function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addrError, setAddrError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId != null;
  const [verifStatus, setVerifStatus] = useState("idle"); // idle | loading
  const [verifMsg, setVerifMsg] = useState("");


  const [addrForm, setAddrForm] = useState({
    label: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    isDefault: false,
    type: "house",
    apartment: "",
    floor: "",
    bell: "",
    notes: "",
  });

  const PAGE_SIZE = 3;
  const [addrPage, setAddrPage] = useState(1);

  const totalAddrPages = Math.max(1, Math.ceil(addresses.length / PAGE_SIZE));

  const pagedAddresses = useMemo(() => {
    const start = (addrPage - 1) * PAGE_SIZE;
    return addresses.slice(start, start + PAGE_SIZE);
  }, [addresses, addrPage]);

  useEffect(() => {
    setAddrPage((p) => Math.min(Math.max(1, p), totalAddrPages));
  }, [totalAddrPages]);

  useEffect(() => {
    loadAddresses();
  }, []);

  if (!user) {
    return (
      <main className="home-section">
        <h1>{t("profile.title")}</h1>
        <p>{t("profile.loginRequired")}</p>
        <Link to="/login" className="btn-primary">{t("profile.goToLogin")}</Link>
      </main>
    );
  }

  const isEmailVerified = Boolean(user?.emailVerified);

  function handleAddrChange(e) {
  const { name, value, type, checked } = e.target;
  setAddrForm((prev) => ({
    ...prev,
    [name]: type === "checkbox" ? checked : value,
  }));
  }

  async function loadAddresses() {
    try {
      setLoadingAddresses(true);
      const data = await fetchAddresses();
      setAddresses(data);
    } catch (e) {
      setAddrError(t("profile.addressErrors.load"));
    } finally {
      setLoadingAddresses(false);
    }
 }

  async function handleAddAddress(e) {
    e.preventDefault();
    setAddrError("");

    try {
      if (isEditing) {
        await updateAddress(editingId, addrForm);
      } else {
        await createAddress(addrForm);
      }

      setEditingId(null);
      await loadAddresses();

      setAddrForm({
        label: "",
        street: "",
        city: "",
        province: "",
        postalCode: "",
        isDefault: false,
        type: "house",
        apartment: "",
        floor: "",
        bell: "",
        notes: "",
      });
    } catch (e) {
      setAddrError(e.message);
    }
  }

  async function handleDeleteAddress(id) {
    try {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setAddrError(t("profile.addressErrors.delete"));
    }
  }

  async function handleSetDefault(addressId) {
  try {
    setAddrError("");
    await setDefaultAddress(addressId); // <-- tenés que importarlo
    await loadAddresses();
  } catch (e) {
    setAddrError(e.message || t("profile.addressErrors.setDefault"));
  }
}

  return (
    <main className="home-section profile-page">
      <section className="profile-card card-animate">
        <div className="profile-head">
          <div className="profile-icon">
            <User size={18} />
          </div>
          <div>
            <h1 className="profile-title">{t("profile.title")}</h1>
            <p className="profile-subtitle">{t("profile.subtitle")}</p>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-item">
            <span className="profile-label">{t("profile.labels.name")}</span>
            <span className="profile-value">{user?.name || "—"}</span>
          </div>

          <div className="profile-item">
            <span className="profile-label">{t("profile.labels.email")}</span>
            <span className="profile-value">{user?.email || "—"}</span>
          </div>

          <div className="profile-item">
            <span className="profile-label">{t("profile.labels.verification")}</span>
            <span className={`profile-badge ${isEmailVerified ? "ok" : "pending"}`}>
              <BadgeCheck size={16} />
              {isEmailVerified ? t("profile.verified") : t("profile.pending")}
            </span>
          </div>
        </div>

        <div className="profile-theme">
          <div>
            <h2 className="profile-title">{t("profile.theme.title")}</h2>
            <p className="profile-subtitle">{t("profile.theme.description")}</p>
          </div>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={toggleTheme}
            aria-label={t("profile.theme.toggle")}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark"
              ? t("profile.theme.light")
              : t("profile.theme.dark")}
          </button>
        </div>
        
        {!isEmailVerified && (
        <div className="profile-verify card-animate" role="alert">
          <strong>{t("profile.verify.title")}</strong>
          <p>{t("profile.verify.subtitle")}</p>

          {verifMsg && <p className="profile-verify-msg">{verifMsg}</p>}

          <button
            type="button"
            className="btn-secondary btn-small"
            disabled={verifStatus === "loading"}
            onClick={async () => {
              try {
                setVerifStatus("loading");
                setVerifMsg("");
                await resendVerifyEmail();
                setVerifMsg(t("profile.verify.success"));
              } catch (e) {
                setVerifMsg(e.message || t("profile.verify.error"));
              } finally {
                setVerifStatus("idle");
              }
            }}
          >
           {verifStatus === "loading" ? t("profile.verify.loading") : t("profile.verify.resend")}
          </button>

          <div style={{ marginTop: 10 }}>
            <Link to="/verify-email" className="link-inline--v2">
              {t("profile.verify.enterCode")}
            </Link>
          </div>
        </div>
      )}
      </section>
      <section className="profile-card card-animate">
        {isEditing && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setEditingId(null);
            setAddrForm({
              label: "",
              street: "",
              city: "",
              province: "",
              postalCode: "",
              isDefault: false,
              type: "house",
              apartment: "",
              floor: "",
              bell: "",
              notes: "",
            });
          }}
        >
          {t("profile.addresses.cancelEdit")}
        </button>
      )}
        <h2 className="profile-title">{t("profile.addresses.title")}</h2>

        {loadingAddresses ? (
          <p className="profile-muted">{t("profile.addresses.loading")}</p>
        ) : addresses.length === 0 ? (
          <p className="profile-muted">{t("profile.addresses.empty")}</p>
        ) : (
          <ul className="address-list">
            {pagedAddresses.map((a) => (
              <li key={a.id} className="address-item">
                <div>
                  <strong>{a.label}</strong>
                  {a.isDefault && <span className="pill-default">{t("profile.addresses.default")}</span>}
                  <p className="address-line">
                    {a.street}, {a.city}, {a.province}
                  </p>
                  {a.postalCode && (
                    <p className="address-muted">{t("profile.addresses.postalCode")} {a.postalCode}</p>
                  )}
                </div>

                {(a.type === "apartment" || a.apartment || a.floor || a.bell) && (
                  <div className="address-muted">
                    {a.type === "apartment"
                      ? t("profile.addresses.types.apartment")
                      : a.type === "office"
                        ? t("profile.addresses.types.office")
                        : t("profile.addresses.types.house")}
                    {a.apartment ? ` · ${t("profile.addresses.apartment")}: ${a.apartment}` : ""}
                    {a.floor ? ` · ${t("profile.addresses.floor")}: ${a.floor}` : ""}
                    {a.bell ? ` · ${t("profile.addresses.bell")}: ${a.bell}` : ""}
                  </div>
                )}

                {a.notes && <div className="address-muted">📝 {a.notes}</div>}

                {/* Acciones */}
                <div className="address-actions">
                  {!a.isDefault && (
                    <button
                    type="button"
                    className="btn-small btn-secondary"
                    onClick={() => handleSetDefault(a.id)}
                    >
                      {t("profile.addresses.makeDefault")}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-small btn-secondary"
                    onClick={() => {
                      setEditingId(a.id);
                      setAddrForm({
                        label: a.label || "",
                        street: a.street || "",
                        city: a.city || "",
                        province: a.province || "",
                        postalCode: a.postalCode || "",
                        isDefault: !!a.isDefault,
                        type: a.type || "house",
                        apartment: a.apartment || "",
                        floor: a.floor || "",
                        bell: a.bell || "",
                        notes: a.notes || "",
                      });
                    }}
                  >
                    {t("profile.addresses.edit")}
                  </button>

                  <button
                    type="button"
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteAddress(a.id)}
                  >
                    {t("profile.addresses.delete")}
                  </button>

                </div>
              </li>
            ))}
          </ul>
        )}

      <div className="address-pagination">
        <button
          type="button"
          className="btn-small"
          onClick={() => setAddrPage((p) => Math.max(1, p - 1))}
          disabled={addrPage === 1}
        >
          ◀
        </button>

        <span className="page-pill">
          {addrPage}/{totalAddrPages}
        </span>

        <button
          type="button"
          className="btn-small"
          onClick={() => setAddrPage((p) => Math.min(totalAddrPages, p + 1))}
          disabled={addrPage === totalAddrPages}
        >
          ▶
        </button>
      </div>
      </section>
      <section className="profile-card card-animate">
        <h3 className="profile-subtitle">{t("profile.addressForm.title")}</h3>

        <form onSubmit={handleAddAddress} className="address-form">
          <input
            name="label"
            placeholder={t("profile.addressForm.labelPlaceholder")}
            value={addrForm.label}
            onChange={handleAddrChange}
            required
          />

          <input
            name="street"
            placeholder={t("profile.addressForm.streetPlaceholder")}
            value={addrForm.street}
            onChange={handleAddrChange}
            required
          />

          <input
            name="city"
            placeholder={t("profile.addressForm.provincePlaceholder")}
            value={addrForm.city}
            onChange={handleAddrChange}
            required
          />

          <input
            name="province"
            placeholder={t("profile.addressForm.provincePlaceholder")}
            value={addrForm.province}
            onChange={handleAddrChange}
            required
          />

          <input
            name="postalCode"
            placeholder={t("profile.addressForm.postalCodePlaceholder")}
            value={addrForm.postalCode}
            onChange={handleAddrChange}
          />

        <div className="address-form-row">
          <label className="auth-label-profile">
            {t("profile.addressForm.typeLabel")}
            <select
              name="type"
              value={addrForm.type}
              onChange={handleAddrChange}
              className="address-select"
            >
              <option value="house">{t("profile.addressForm.types.house")}</option>
              <option value="apartment">{t("profile.addressForm.types.apartment")}</option>
              <option value="office">{t("profile.addressForm.types.office")}</option>
              <option value="other">{t("profile.addressForm.types.other")}</option>
            </select>
          </label>

          <label className="auth-label-profile">
            {t("profile.addressForm.apartmentLabel")}
            <input
              name="apartment"
              value={addrForm.apartment}
              onChange={handleAddrChange}
              placeholder={t("profile.addressForm.apartmentPlaceholder")}
            />
          </label>
        </div>

        <div className="address-form-row">
          <label className="auth-label-profile">
            {t("profile.addressForm.floorLabel")}
            <input
              name="floor"
              value={addrForm.floor}
              onChange={handleAddrChange}
              placeholder={t("profile.addressForm.floorPlaceholder")}           
            />
          </label>

          <label className="auth-label-profile">
            {t("profile.addressForm.bellLabel")}
            <input
              name="bell"
              value={addrForm.bell}
              onChange={handleAddrChange}
              placeholder={t("profile.addressForm.bellPlaceholder")}
            />
          </label>
        </div>

        <label className="auth-label-profile">
          {t("profile.addressForm.notesLabel")}
          <input
            name="notes"
            value={addrForm.notes}
            onChange={handleAddrChange}
            placeholder={t("profile.addressForm.notesPlaceholder")}
          />
        </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="isDefault"
              checked={addrForm.isDefault}
              onChange={handleAddrChange}
            />
           {t("profile.addressForm.setDefault")}
          </label>

          {addrError && <p className="form-error">{addrError}</p>}

          <button className="btn-primary" type="submit">
           {t("profile.addressForm.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Profile;
