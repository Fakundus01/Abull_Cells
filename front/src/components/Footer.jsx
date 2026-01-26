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
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer site-footer--v2">
      <div className="footer-inner footer-inner--v2">
        {/* Brand */}
        <div className="footer-column footer-brand card-animate">
          <div className="footer-logo">
            <span className="logo-main">Abul</span>
            <span className="logo-sub">Cell</span>
          </div>

          <p className="footer-text">
            {t("footer.description")}
          </p>

          <Link to="/tienda" className="footer-cta">
            {t("footer.cta")} <ArrowRight size={16} className="icon" />
          </Link>
        </div>

        {/* Links */}
        <div className="footer-column card-animate">
          <h4 className="footer-title">{t("footer.sectionsTitle")}</h4>
          <ul className="footer-links">
            <li>
              <Link to="/tienda" className="footer-link">
                <ShoppingBag size={16} className="icon" /> {t("footer.sections.store")}
              </Link>
            </li>
            <li>
              <Link to="/ofertas" className="footer-link">
                <Tag size={16} className="icon" /> {t("footer.sections.offers")}
              </Link>
            </li>
            <li>
              <Link to="/faq" className="footer-link">
                <HelpCircle size={16} className="icon" /> {t("footer.sections.faq")}
              </Link>
            </li>
            <li>
              <Link to="/contacto" className="footer-link">
                <MessageCircle size={16} className="icon" /> {t("footer.sections.contact")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="footer-column card-animate">
          <h4 className="footer-title">{t("footer.contactTitle")}</h4>

          <div className="footer-contact">
            <p className="contact-row">
              <MapPin size={16} className="icon" />
              {t("footer.addressLabel")} {t("contact.storeAddressValue")}
            </p>

            <p className="contact-row">
              <Phone size={16} className="icon" />
              {t("footer.phoneLabel")} {t("contact.storePhoneValue")}
            </p>

            <p className="contact-row">
              <Mail size={16} className="icon" />
              {t("footer.emailLabel")} contacto@abulcell.com
            </p>
          </div>
        </div>
      </div>

      <div className="footer-bottom footer-bottom--v2">
        <p>{t("footer.copyright", { year })}</p>
      </div>
    </footer>
  );
}

export default Footer;
