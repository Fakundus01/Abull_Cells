// src/components/Navbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ShoppingCart, Globe, Tag, Home, HelpCircle, Mail, LogOut, Settings, Shield, ClipboardList, User, UserPlus} from "lucide-react";
import CartMiniPreview from "./CartMiniPreview";
import { useEffect, useMemo, useRef, useState } from "react";

function Navbar() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  //Carrito

  const { items } = useCart(); // o useCartContext

  const totalItems = (Array.isArray(items) ? items : []).reduce(
    (acc, it) => acc + Number(it?.quantity ?? 1),
    0
  );


  const [cartOpen, setCartOpen] = useState(false);
  const closeT = useRef(null);

  const openCart = () => {
    if (closeT.current) clearTimeout(closeT.current);
    setCartOpen(true);
 };

  const closeCart = () => {
    if (closeT.current) clearTimeout(closeT.current);
    closeT.current = setTimeout(() => setCartOpen(false), 140);
 };

  //Cerrar Carrito

  const { user, isAuthenticated, loadingAuth, logout, clearSession } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const isLogged = Boolean(isAuthenticated && user);

  const initials = useMemo(() => {
    const name = user?.name || user?.displayName || "";
    const email = user?.email || "";
    const base = name.trim() || email.trim();
    if (!base) return "";
    const parts = base.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "";
    const b = parts[1]?.[0] || parts[0]?.[1] || "";
    return (a + b).toUpperCase();
  }, [user]);

  const isAdmin =
    String(user?.role || "").toLowerCase() === "admin" ||
    user?.isAdmin === true ||
    user?.is_admin === true;

  function handleLogout() {
    setUserMenuOpen(false);
    if (typeof logout === "function") logout();
    else if (typeof clearSession === "function") clearSession();
    navigate("/");
  }

  useEffect(() => {
  function onDown(e) {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    function onEsc(e) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", onDown);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [userMenuOpen]);

  function handleLanguageToggle() {
    setLanguage((prev) => (prev === "es" ? "en" : "es"));
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-main">Abul</span>
          <span className="logo-sub">Cell</span>
        </Link>

        {/* Links principales */}
        <nav className="navbar-links">
          <NavLink to="/" end className="nav-link">
            <Home size={16} className="icon" />
           {t("nav.home")}
          </NavLink>

          <NavLink to="/ofertas" className="nav-link">
            <Tag size={16} className="icon" />
            {t("nav.offers")}
          </NavLink>

          <NavLink to="/tienda" className="nav-link">
            <ShoppingCart size={16} className="icon" />
            {t("nav.store")}
          </NavLink>

          <NavLink to="/faq" className="nav-link">
            <HelpCircle size={16} className="icon" />
            {t("nav.faq")}
          </NavLink>

          <NavLink to="/contacto" className="nav-link">
            <Mail size={16} className="icon" />
            {t("nav.contact")}
          </NavLink>
        </nav>

        {/* Acciones derecha: idioma + carrito */}
        <div className="navbar-actions">
          <button
            type="button"
            className="lang-btn lang-pill"
            onClick={handleLanguageToggle}
            aria-label={t("nav.changeLanguage")}
          >
            <Globe size={16} className="icon" />
            {language.toUpperCase()}
          </button>

        <div
          className="nav-cart-wrap"
          onMouseEnter={openCart}
          onMouseLeave={closeCart}
        >
        <Link to="/carrito" className="cart-btn cart-pill" aria-label={t("nav.goToCart")}>
          <ShoppingCart size={16} className="icon" />
          <span>{t("nav.cart")}</span>
          {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
        </Link>

        {cartOpen && (
          <div
            className="nav-cart-popover"
            onMouseEnter={openCart}
            onMouseLeave={closeCart}
          >
            <CartMiniPreview />
          </div>
        )}
        </div>

        {!loadingAuth && !isLogged && (
          <div className="navbar-auth">
            <NavLink to="/login" className="nav-auth-link">
              {t("nav.login")}
            </NavLink>
            <NavLink to="/signup" className="btn-auth">
              {t("nav.signup")}
            </NavLink>
          </div>
        )}

        {!loadingAuth && isLogged && initials && (
  <div className="user-menu" ref={userMenuRef}>
            <button
              type="button"
              className="user-pill"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title={user?.email || t("nav.account")}
            >
              {initials}
            </button>

            {userMenuOpen && (
              <div className="user-menu-panel" role="menu">
                <div className="user-menu-header">
                  <div className="user-pill user-pill--sm">{initials}</div>
                  <div className="user-menu-meta">
                    <div className="user-menu-name">
                      {user?.name || user?.displayName || t("nav.account")}
                    </div>
                    <div className="user-menu-email">{user?.email || ""}</div>
                  </div>
                </div>

                <div className="user-menu-sep" />

                {isAdmin && (
                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/admin");
                    }}
                  >
                    <Shield size={16} className="icon" />
                    {t("nav.adminPanel")}
                  </button>
                )}

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/perfil"); // si todavía no existe, lo cambiamos o lo sacamos
                  }}
                >
                  <Settings size={16} className="icon" />
                  {t("nav.profile")}
                </button>

                <button
                  type="button"
                  className="user-menu-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/mis-pedidos");
                  }}
                >
                  <ClipboardList size={16} className="icon" />
                  {t("nav.myOrders")}
                </button>

                <button
                  type="button"
                  className="user-menu-item danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="icon" />
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className="nav-burger"
          aria-label="Abrir menú"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        </div>
      </div>

      {mobileMenuOpen && (
  <>
    <div
      className="mobile-nav-overlay"
      onClick={() => setMobileMenuOpen(false)}
    />

    <aside className="mobile-drawer" role="dialog" aria-modal="true">
      <div className="mobile-drawer-header">
        <strong>Menú</strong>
        <button
          className="nav-burger"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <div
        className="mobile-drawer-links"
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavLink to="/" className="nav-link">
          <Home size={16} /> {t("nav.home")}
        </NavLink>

        <NavLink to="/ofertas" className="nav-link">
          <Tag size={16} /> {t("nav.offers")}
        </NavLink>

        <NavLink to="/cart" className="cart-btn" aria-label={t("nav.cart")}>
          <ShoppingCart size={18} />
          <span className="nav-text">{t("nav.cart")}</span>
       </NavLink>

        <NavLink to="/faq" className="nav-link">
          <HelpCircle size={16} /> {t("nav.faq")}
        </NavLink>

        <NavLink to="/contacto" className="nav-link">
          <Mail size={16} /> {t("nav.contact")}
        </NavLink>
      </div>

      <div className="navbar-actions">
        <button
          type="button"
          className="lang-btn lang-pill"
          onClick={handleLanguageToggle}
        >
          <Globe size={16} /> {language.toUpperCase()}
        </button>

        {!loadingAuth && !isLogged && (
          <>
            <NavLink to="/login" className="nav-auth-link">
              <User size={18} />
              <span className="nav-text">{t("nav.login")}</span>
          </NavLink>
          <NavLink to="/signup" className="btn-auth">
              <UserPlus size={18} />
              <span className="nav-text">{t("nav.signup")}</span>
          </NavLink>
          </>
        )}

        {!loadingAuth && isLogged && (
          <>
            {isAdmin && (
              <button
                className="user-menu-item"
                onClick={() => navigate("/admin")}
              >
                <Shield size={16} /> {t("nav.adminPanel")}
              </button>
            )}

            <button
              className="user-menu-item"
              onClick={() => navigate("/perfil")}
            >
              <Settings size={16} /> {t("nav.profile")}
            </button>

            <button
              className="user-menu-item danger"
              onClick={handleLogout}
            >
              <LogOut size={16} /> {t("nav.logout")}
            </button>
          </>
        )}
      </div>
    </aside>
  </>
)}
    </header>
  );
}

export default Navbar;
