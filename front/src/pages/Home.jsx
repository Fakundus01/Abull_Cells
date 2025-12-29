// src/pages/Home.jsx
import { Link } from "react-router-dom";
import {
  FaShieldAlt,
  FaTruck,
  FaCreditCard,
  FaMobileAlt,
  FaLaptop,
  FaHeadphones,
  FaGamepad,
  FaPlug,
  FaArrowRight,
} from "react-icons/fa";

function Home() {
  return (
    <main className="home">
      {/* HERO */}
      <section className="home-hero home-hero--v2">
        <div className="home-hero-content">
          <div className="hero-chip">
            <FaShieldAlt />
            Compra segura • Soporte real
          </div>

          <h1 className="hero-title">
            Abul <span className="hero-title-accent">Cells</span>
          </h1>

          <p className="hero-subtitle">
            Tu tienda de confianza para celulares, notebooks y periféricos gamers.
            Comprá fácil, rápido y seguro.
          </p>

          <div className="home-hero-actions hero-actions">
            <Link to="/tienda" className="btn-primary btn-icon">
              <FaMobileAlt />
              Ver tienda
            </Link>

            <Link to="/ofertas" className="btn-secondary btn-icon">
              <FaGamepad />
              Ver ofertas
            </Link>
          </div>

          <ul className="hero-benefits--v2">
            <li>
              <FaTruck />
              Envíos a todo el país
            </li>
            <li>
              <FaCreditCard />
              Pagos seguros con Mercado Pago
            </li>
            <li>
              <FaShieldAlt />
              Atención personalizada
            </li>
          </ul>
        </div>

        {/* Device mock */}
        <div className="home-hero-image">
          <div className="hero-device-mock hero-device-mock--v2">
            <div className="device-glow" />
            <div className="device-screen">
              <div className="device-topbar">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>

              <div className="device-body">
                <div className="device-icon">
                  <FaMobileAlt size={34} />
                </div>

                <div className="device-lines">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="device-pills">
                  <span className="pill">Celulares</span>
                  <span className="pill">Notebooks</span>
                  <span className="pill">Gaming</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2>Categorías principales</h2>
            <p className="section-subtitle">
              Todo lo que necesitás para tu setup y tu día a día.
            </p>
          </div>

          <Link to="/tienda" className="link-inline link-inline--v2">
            Ver todo <FaArrowRight />
          </Link>
        </div>

        <div className="category-grid--v2">
          <Link to="/tienda" className="category-card category-card--v2">
            <div className="cat-icon">
              <FaMobileAlt />
            </div>
            <h3>Celulares</h3>
            <p>Gama alta, media y opciones económicas.</p>
          </Link>

          <Link to="/tienda" className="category-card category-card--v2">
            <div className="cat-icon">
              <FaLaptop />
            </div>
            <h3>Notebooks</h3>
            <p>Equipos para estudio, trabajo y gaming.</p>
          </Link>

          <Link to="/tienda" className="category-card category-card--v2">
            <div className="cat-icon">
              <FaPlug />
            </div>
            <h3>Periféricos</h3>
            <p>Teclados, mouse, pads y más.</p>
          </Link>

          <Link to="/tienda" className="category-card category-card--v2">
            <div className="cat-icon">
              <FaHeadphones />
            </div>
            <h3>Audio</h3>
            <p>Auriculares, parlantes y soundbars.</p>
          </Link>

          <Link to="/tienda" className="category-card category-card--v2">
            <div className="cat-icon">
              <FaGamepad />
            </div>
            <h3>Gaming</h3>
            <p>Monitores, sillas gamers y accesorios.</p>
          </Link>

          <Link to="/tienda" className="category-card category-card--v2">
            <div className="cat-icon">
              <FaPlug />
            </div>
            <h3>Accesorios</h3>
            <p>Fundas, cargadores, cables y mucho más.</p>
          </Link>
        </div>
      </section>

      {/* HIGHLIGHT */}
      <section className="home-section">
        <div className="home-highlight home-highlight--v2">
          <h2>¿Por qué comprar en Abul Cells?</h2>

          <div className="highlight-grid highlight-grid--v2">
            <div className="highlight-item highlight-item--v2">
              <div className="hi-icon">
                <FaShieldAlt />
              </div>
              <h3>Productos seleccionados</h3>
              <p>Solo marcas confiables y modelos probados, nada de humo.</p>
            </div>

            <div className="highlight-item highlight-item--v2">
              <div className="hi-icon">
                <FaTruck />
              </div>
              <h3>Asesoramiento real</h3>
              <p>Te ayudamos a elegir el equipo ideal para tu uso y presupuesto.</p>
            </div>

            <div className="highlight-item highlight-item--v2">
              <div className="hi-icon">
                <FaCreditCard />
              </div>
              <h3>Pagos flexibles</h3>
              <p>Mercado Pago, cuotas y distintos métodos para que sea más fácil.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
