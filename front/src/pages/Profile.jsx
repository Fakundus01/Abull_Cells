import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BadgeCheck, Mail, User } from "lucide-react";
import { sendVerifyEmail, fetchAddresses, createAddress, deleteAddress, setDefaultAddress} from "../services/api";
import { useEffect, useState, useMemo } from "react";

function Profile() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addrError, setAddrError] = useState("");

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
        <h1>Perfil</h1>
        <p>Necesitás iniciar sesión para ver tu perfil.</p>
        <Link to="/login" className="btn-primary">Ir a login</Link>
      </main>
    );
  }

  const isEmailVerified = Boolean(user?.emailVerified); // mock, lo conectamos luego

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
      setAddrError("No se pudieron cargar las direcciones");
    } finally {
      setLoadingAddresses(false);
    }
  }

  async function handleAddAddress(e) {
    e.preventDefault();
    setAddrError("");

    try {
      const created = await createAddress(addrForm);
      setAddresses((prev) => [...prev, created]);

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
      setAddrError("No se pudo eliminar la dirección");
    }
  }

  async function handleSetDefault(addressId) {
  try {
    setAddrError("");
    await setDefaultAddress(addressId); // <-- tenés que importarlo
    await loadAddresses();
  } catch (e) {
    setAddrError(e.message || "No se pudo marcar como predeterminada.");
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
            <h1 className="profile-title">Mi perfil</h1>
            <p className="profile-subtitle">Gestioná tus datos de cuenta.</p>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-item">
            <span className="profile-label">Nombre</span>
            <span className="profile-value">{user?.name || "—"}</span>
          </div>

          <div className="profile-item">
            <span className="profile-label">Email</span>
            <span className="profile-value">{user?.email || "—"}</span>
          </div>

          <div className="profile-item">
            <span className="profile-label">Verificación</span>
            <span className={`profile-badge ${isEmailVerified ? "ok" : "pending"}`}>
              <BadgeCheck size={16} />
              {isEmailVerified ? "Verificado" : "Pendiente"}
            </span>
          </div>
        </div>

        {user && user.emailVerified === false && (
        <div className="profile-verify card-animate" role="alert">
          <strong>Tu email todavía no está verificado.</strong>
          <p>Te enviamos un link para verificarlo. Si no lo recibiste, reenviá el mail.</p>

          <button
            type="button"
            className="btn-primary btn-small"
            onClick={async () => {
              try {
                await sendVerifyEmail();
                alert("Listo ✅ Revisá tu casilla.");
              } catch (e) {
                alert(e.message || "No se pudo reenviar");
              }
            }}
          >
            Reenviar verificación
          </button>
        </div>
      )}
      </section>
      <section className="profile-card card-animate">
        <h2 className="profile-title">Mis direcciones</h2>

        {loadingAddresses ? (
          <p className="profile-muted">Cargando direcciones...</p>
        ) : addresses.length === 0 ? (
          <p className="profile-muted">No tenés direcciones guardadas.</p>
        ) : (
          <ul className="address-list">
            {pagedAddresses.map((a) => (
              <li key={a.id} className="address-item">
                <div>
                  <strong>{a.label}</strong>
                  {a.isDefault && <span className="pill-default">Predeterminada</span>}
                  <p className="address-line">
                    {a.street}, {a.city}, {a.province}
                  </p>
                  {a.postalCode && <p className="address-muted">CP: {a.postalCode}</p>}
                </div>

                {(a.type === "apartment" || a.apartment || a.floor || a.bell) && (
                  <div className="address-muted">
                    {a.type === "apartment" ? "Depto" : a.type === "office" ? "Oficina" : "Casa"}
                    {a.apartment ? ` · Depto: ${a.apartment}` : ""}
                    {a.floor ? ` · Piso: ${a.floor}` : ""}
                    {a.bell ? ` · Timbre: ${a.bell}` : ""}
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
                      Hacer predeterminada
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteAddress(a.id)}
                  >
                    Eliminar
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
        <h3 className="profile-subtitle">Agregar dirección</h3>

        <form onSubmit={handleAddAddress} className="address-form">
          <input
            name="label"
            placeholder="Casa, Trabajo..."
            value={addrForm.label}
            onChange={handleAddrChange}
            required
          />

          <input
            name="street"
            placeholder="Calle y número"
            value={addrForm.street}
            onChange={handleAddrChange}
            required
          />

          <input
            name="city"
            placeholder="Ciudad"
            value={addrForm.city}
            onChange={handleAddrChange}
            required
          />

          <input
            name="province"
            placeholder="Provincia"
            value={addrForm.province}
            onChange={handleAddrChange}
            required
          />

          <input
            name="postalCode"
            placeholder="Código postal"
            value={addrForm.postalCode}
            onChange={handleAddrChange}
          />

          <div className="address-form-row">
          <label className="auth-label-profile">
            Tipo
            <select
              name="type"
              value={addrForm.type}
              onChange={handleAddrChange}
              className="address-select"
            >
              <option value="house">Casa</option>
              <option value="apartment">Departamento</option>
              <option value="office">Oficina</option>
              <option value="other">Otro</option>
            </select>
          </label>

          <label className="auth-label-profile">
            Depto (opcional)
            <input
              name="apartment"
              value={addrForm.apartment}
              onChange={handleAddrChange}
              placeholder="A, 2B, etc."
            />
          </label>
        </div>

        <div className="address-form-row">
          <label className="auth-label-profile">
            Piso (opcional)
            <input
              name="floor"
              value={addrForm.floor}
              onChange={handleAddrChange}
              placeholder="3"
            />
          </label>

          <label className="auth-label-profile">
            Timbre (opcional)
            <input
              name="bell"
              value={addrForm.bell}
              onChange={handleAddrChange}
              placeholder="Moreno / 3B"
            />
          </label>
        </div>

        <label className="auth-label-profile">
          Indicaciones (opcional)
          <input
            name="notes"
            value={addrForm.notes}
            onChange={handleAddrChange}
            placeholder="Entre calles..., portón negro, etc."
          />
        </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="isDefault"
              checked={addrForm.isDefault}
              onChange={handleAddrChange}
            />
            Usar como predeterminada
          </label>

          {addrError && <p className="form-error">{addrError}</p>}

          <button className="btn-primary" type="submit">
            Guardar dirección
          </button>
        </form>
      </section>
    </main>
  );
}

export default Profile;
