// src/components/Footer.jsx
import { Link } from "react-router-dom";
import {
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  Tag,
  HelpCircle,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  ArrowRight,
} from "lucide-react";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer site-footer--v2">
      <div className="footer-inner footer-inner--v2">
        {/* Brand */}
        <div className="footer-column footer-brand card-animate">
          <div className="footer-logo">
            <span className="logo-main">Abul</span>
            <span className="logo-sub">Cells</span>
          </div>

          <p className="footer-text">
            Tienda de tecnología y productos electrónicos. Celulares, notebooks y
            periféricos.
          </p>

          <div className="footer-social">
            <a className="social-btn" href="#" aria-label="Instagram">
              <Instagram size={18} className="icon" />
            </a>
            <a className="social-btn" href="#" aria-label="Facebook">
              <Facebook size={18} className="icon" />
            </a>
            <a className="social-btn" href="#" aria-label="X / Twitter">
              <Twitter size={18} className="icon" />
            </a>
          </div>

          <Link to="/tienda" className="footer-cta">
            Ver tienda <ArrowRight size={16} className="icon" />
          </Link>
        </div>

        {/* Links */}
        <div className="footer-column card-animate">
          <h4 className="footer-title">Secciones</h4>
          <ul className="footer-links">
            <li>
              <Link to="/tienda" className="footer-link">
                <ShoppingBag size={16} className="icon" /> Tienda
              </Link>
            </li>
            <li>
              <Link to="/ofertas" className="footer-link">
                <Tag size={16} className="icon" /> Ofertas
              </Link>
            </li>
            <li>
              <Link to="/faq" className="footer-link">
                <HelpCircle size={16} className="icon" /> FAQ
              </Link>
            </li>
            <li>
              <Link to="/contacto" className="footer-link">
                <MessageCircle size={16} className="icon" /> Contáctanos
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="footer-column card-animate">
          <h4 className="footer-title">Contacto</h4>

          <div className="footer-contact">
            <p className="contact-row">
              <MapPin size={16} className="icon" />
              Dirección del local: (acá ponemos la real cuando la tengas)
            </p>

            <p className="contact-row">
              <Phone size={16} className="icon" />
              Teléfono: +54 11 0000-0000
            </p>

            <p className="contact-row">
              <Mail size={16} className="icon" />
              Email: contacto@abulcells.com
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom footer-bottom--v2">
        <p>© {year} Abul Cells. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

export default Footer;
