// src/pages/Home.jsx
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();

  return (
    <main className="home">
      {/* HERO */}
      <section className="home-hero home-hero--v2">
        <div className="home-hero-content">
          <div className="hero-chip">
            <FaShieldAlt />
            {t("home.heroChip")}
          </div>

          <h1 className="hero-title">
            Abul <span className="hero-title-accent">Cell</span>
          </h1>

          <p className="hero-subtitle">
            {t("home.heroSubtitle")}
          </p>

          <div className="home-hero-actions hero-actions">
            <Link to="/tienda" className="btn-primary btn-icon">
              <FaMobileAlt />
              {t("home.viewStore")}
            </Link>

            <Link to="/ofertas" className="btn-secondary btn-icon">
              <FaGamepad />
              {t("home.viewDeals")}
            </Link>
          </div>

          <ul className="hero-benefits--v2">
            <li>
              <FaTruck />
              {t("home.benefits.shipping")}
            </li>
            <li>
              <FaCreditCard />
              {t("home.benefits.payment")}
            </li>
            <li>
              <FaShieldAlt />
              {t("home.benefits.support")}
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
                  <span className="pill">{t("home.devicePills.phones")}</span>
                  <span className="pill">{t("home.devicePills.laptops")}</span>
                  <span className="pill">{t("home.devicePills.gaming")}</span>
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
            <h2>{t("home.categories.title")}</h2>
            <p className="section-subtitle">
              {t("home.categories.subtitle")}
            </p>
          </div>

          <Link to={"/tienda"} className="link-inline link-inline--v2">
           {t("home.categories.viewAll")} <FaArrowRight />
          </Link>
        </div>

        <div className="category-grid--v2">
          <Link to={`/tienda?category=${encodeURIComponent("Celulares")}`} className="category-card category-card--v2">
            <div className="cat-icon">
              <FaMobileAlt />
            </div>
            <h3>{t("home.categories.items.phones.title")}</h3>
            <p>{t("home.categories.items.phones.description")}</p>
          </Link>

          <Link to={`/tienda?category=${encodeURIComponent("Notebooks")}`} className="category-card category-card--v2">
            <div className="cat-icon">
              <FaLaptop />
            </div>
            <h3>{t("home.categories.items.laptops.title")}</h3>
            <p>{t("home.categories.items.laptops.description")}</p>
          </Link>

          <Link to={`/tienda?category=${encodeURIComponent("Periféricos")}`} className="category-card category-card--v2">
            <div className="cat-icon">
              <FaPlug />
            </div>
            <h3>{t("home.categories.items.peripherals.title")}</h3>
            <p>{t("home.categories.items.peripherals.description")}</p>
          </Link>

          <Link to={`/tienda?category=${encodeURIComponent("Audio")}`} className="category-card category-card--v2">
            <div className="cat-icon">
              <FaHeadphones />
            </div>
            <h3>{t("home.categories.items.audio.title")}</h3>
            <p>{t("home.categories.items.audio.description")}</p>
          </Link>

          <Link to={`/tienda?category=${encodeURIComponent("Gaming")}`} className="category-card category-card--v2">
            <div className="cat-icon">
              <FaGamepad />
            </div>
            <h3>{t("home.categories.items.gaming.title")}</h3>
            <p>{t("home.categories.items.gaming.description")}</p>
          </Link>

          <Link to={`/tienda?category=${encodeURIComponent("Accesorios")}`} className="category-card category-card--v2">
            <div className="cat-icon">
              <FaPlug />
            </div>
            <h3>{t("home.categories.items.accessories.title")}</h3>
            <p>{t("home.categories.items.accessories.description")}</p>
          </Link>
        </div>
      </section>

      {/* HIGHLIGHT */}
      <section className="home-section">
        <div className="home-highlight home-highlight--v2">
          <h2>{t("home.highlight.title")}</h2>

          <div className="highlight-grid highlight-grid--v2">
            <div className="highlight-item highlight-item--v2">
              <div className="hi-icon">
                <FaShieldAlt />
              </div>
              <h3>{t("home.highlight.items.curated.title")}</h3>
              <p>{t("home.highlight.items.curated.description")}</p>
            </div>

            <div className="highlight-item highlight-item--v2">
              <div className="hi-icon">
                <FaTruck />
              </div>
               <h3>{t("home.highlight.items.advice.title")}</h3>
              <p>{t("home.highlight.items.advice.description")}</p>
            </div>

            <div className="highlight-item highlight-item--v2">
              <div className="hi-icon">
                <FaCreditCard />
              </div>
              <h3>{t("home.highlight.items.payments.title")}</h3>
              <p>{t("home.highlight.items.payments.description")}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
