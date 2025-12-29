import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BadgeCheck, Mail, User } from "lucide-react";

function Profile() {
  const { user } = useAuth();

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

        {!isEmailVerified && (
          <div className="profile-note">
            <Mail size={18} className="icon" />
            <div>
              <p className="note-title">Verificá tu email</p>
              <p className="note-subtitle">
                Te vamos a mandar un link de verificación (por ahora mock).
              </p>
              <button
                type="button"
                className="btn-secondary btn-icon"
                onClick={() => console.log("[PROFILE] reenviar verificación (mock)")}
              >
                <Mail size={18} className="icon" />
                Reenviar verificación
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default Profile;
