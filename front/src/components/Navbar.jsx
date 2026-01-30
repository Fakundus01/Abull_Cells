// src/components/Navbar.jsx
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  ShoppingCart,
  Globe,
  Tag,
  Home,
  HelpCircle,
  Mail,
  LogOut,
  Settings,
  Shield,
  ClipboardList,
  User,
  UserPlus,
} from "lucide-react";
import CartMiniPreview from "./CartMiniPreview";
import { useEffect, useMemo, useRef, useState } from "react";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  const [isMobileUI, setIsMobileUI] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeTimerRef = useRef(null);

  // =========================
  // Detect mobile/tablet/touch
  // =========================
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    const update = () => setIsMobileUI(Boolean(mq.matches));
    update();

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }

    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  // =========================
  // Cart
  // =========================
  const { items } = useCart();
  const totalItems = (Array.isArray(items) ? items : []).reduce(
    (acc, it) => acc + Number(it?.quantity ?? 1),
    0
  );

  const [cartOpen, setCartOpen] = useState(false);
  const closeT = useRef(null);
  const cartWrapRef = useRef(null);

  const openCart = () => {
    if (isMobileUI) return;
    if (closeT.current) clearTimeout(closeT.current);
    setCartOpen(true);
  };

  const closeCart = () => {
    if (isMobileUI) return;
    if (closeT.current) clearTimeout(closeT.current);
    closeT.current = setTimeout(() => setCartOpen(false), 140);
  };

  const handleCartClick = (e) => {
    if (!isMobileUI) return; // desktop keeps normal navigation
    e.preventDefault(); // mobile: toggle preview
    setMobileMenuOpen(false);
    setCartOpen((v) => !v);
    setProfileOpen(false);
  };

  useEffect(() => {
    if (!isMobileUI || !cartOpen) return;

    const onDown = (ev) => {
      if (!cartWrapRef.current) return;
      if (!cartWrapRef.current.contains(ev.target)) setCartOpen(false);
    };

    const onEsc = (ev) => {
      if (ev.key === "Escape") setCartOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isMobileUI, cartOpen]);

  // =========================
  // Auth / User
  // =========================
  const { user, isAuthenticated, loadingAuth, logout, clearSession } = useAuth();
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
    setProfileOpen(false);
    if (typeof logout === "function") logout();
    else if (typeof clearSession === "function") clearSession();
    navigate("/");
  }

  function handleLanguageToggle() {
    setLanguage((prev) => (prev === "es" ? "en" : "es"));
  }

  // =========================
  // Profile preview (same as cart)
  // =========================
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef(null);

    const openProfile = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setProfileOpen(true);
  };

  const closeProfile = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setProfileOpen(false), 160);
  };

  const handleProfileClick = (e) => {
    if (!isMobileUI) return; // desktop uses hover
    e.preventDefault();
    setCartOpen(false);
    setMobileMenuOpen(false);
    setProfileOpen((v) => !v);
  };

  useEffect(() => {
    if (!isMobileUI || !profileOpen) return;

    const onDown = (ev) => {
      if (!profileWrapRef.current) return;
      if (!profileWrapRef.current.contains(ev.target)) {
        setProfileOpen(false);
      }
    };

    const onEsc = (ev) => {
      if (ev.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isMobileUI, profileOpen]);

  // =========================
  // Lock body scroll (mobile)
  // =========================
  useEffect(() => {
    if (!isMobileUI) return;

    const shouldLock = cartOpen || profileOpen || mobileMenuOpen;
    if (!shouldLock) return;

    const body = document.body;

    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevOverflow || "";
      body.style.paddingRight = prevPaddingRight || "";
    };
  }, [isMobileUI, cartOpen, profileOpen, mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setCartOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);


  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-main">Abul</span>
          <span className="logo-sub">Cell</span>
        </Link>

        {/* Links principales (desktop) */}
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

        {/* Acciones derecha */}
        <div className="navbar-actions">
          {/* Idioma */}
          <button
            type="button"
            className="lang-btn lang-pill"
            onClick={handleLanguageToggle}
            aria-label={t("nav.changeLanguage")}
          >
            <Globe size={16} className="icon" />
            {language.toUpperCase()}
          </button>

          {/* Carrito */}
          <div
            ref={cartWrapRef}
            className="nav-cart-wrap"
            onMouseEnter={openCart}
            onMouseLeave={closeCart}
          >
            <Link
              to="/carrito"
              className="cart-btn cart-pill"
              aria-label={t("nav.goToCart")}
              onClick={handleCartClick}
            >
              <ShoppingCart size={16} className="icon" />
              <span className="nav-text">{t("nav.cart")}</span>
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

          {/* Login / Signup (no drawer) */}
          {!loadingAuth && !isLogged && (
            <div className="navbar-auth">
              <NavLink to="/login" className="nav-auth-link" aria-label={t("nav.login")}>
                <User size={18} className="icon" />
                <span className="nav-text">{t("nav.login")}</span>
              </NavLink>

              <NavLink to="/signup" className="btn-auth" aria-label={t("nav.signup")}>
                <UserPlus size={18} className="icon" />
                <span className="nav-text">{t("nav.signup")}</span>
              </NavLink>
            </div>
          )}

          {/* Profile preview (same pattern as cart) */}
          {!loadingAuth && isLogged && initials && (
            <div
              ref={profileWrapRef}
              className="nav-profile-wrap"
              onMouseEnter={openProfile}
              onMouseLeave={closeProfile}
            >
              <button
                type="button"
                className="user-pill"
                onClick={handleProfileClick}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                title={user?.email || t("nav.account")}
              >
                {initials}
              </button>

              {profileOpen && (
                <div
                  className="nav-profile-popover user-menu-panel"
                  role="menu"
                  onMouseEnter={openProfile}
                  onMouseLeave={closeProfile}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
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
                        setProfileOpen(false);
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
                      setProfileOpen(false);
                      navigate("/perfil");
                    }}
                  >
                    <Settings size={16} className="icon" />
                    {t("nav.profile")}
                  </button>

                  <button
                    type="button"
                    className="user-menu-item"
                    onClick={() => {
                      setProfileOpen(false);
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

          {/* Burger (mobile) */}
          <button
            type="button"
            className="nav-burger"
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
            onClick={() => {
              setCartOpen(false);
              setProfileOpen(false);
              setMobileMenuOpen(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Drawer mobile (sin carrito ni login/signup) */}
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

              <NavLink to="/tienda" className="nav-link">
                <ShoppingCart size={16} /> {t("nav.store")}
              </NavLink>

              <NavLink to="/faq" className="nav-link">
                <HelpCircle size={16} /> {t("nav.faq")}
              </NavLink>

              <NavLink to="/contacto" className="nav-link">
                <Mail size={16} /> {t("nav.contact")}
              </NavLink>
            </div>

            <div className="navbar-actions">
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
