import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

function NotFound() {
  return (
    <section className="home-section not-found-page">
      <div className="not-found-card card-animate">
        <div className="not-found-icon">
          <AlertCircle size={36} className="icon" />
        </div>
        <h1>Página no encontrada</h1>
        <p className="muted">
          No pudimos encontrar la página que buscás. Revisá la URL o volvé al inicio
          para seguir navegando.
        </p>
        <Link to="/" className="btn-primary btn-icon">
          <ArrowLeft size={18} className="icon" />
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}

export default NotFound;