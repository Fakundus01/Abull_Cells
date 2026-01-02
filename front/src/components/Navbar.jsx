// src/components/Navbar.jsx
import { Link, NavLink, useNavigate  } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { ShoppingCart, Globe, Tag, Home, HelpCircle, Mail, User, LogOut, Settings, Shield } from "lucide-react";
import CartMiniPreview from "./CartMiniPreview";
import { useEffect, useMemo, useRef, useState } from "react";

function Navbar() {
  const navigate = useNavigate();

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

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-main">Abul</span>
          <span className="logo-sub">Cells</span>
        </Link>

        {/* Links principales */}
        <nav className="navbar-links">
          <NavLink to="/" end className="nav-link">
            <Home size={16} className="icon" />
            Home
          </NavLink>

          <NavLink to="/ofertas" className="nav-link">
            <Tag size={16} className="icon" />
            Ofertas
          </NavLink>

          <NavLink to="/tienda" className="nav-link">
            <ShoppingCart size={16} className="icon" />
            Tienda
          </NavLink>

          <NavLink to="/faq" className="nav-link">
            <HelpCircle size={16} className="icon" />
            FAQ
          </NavLink>

          <NavLink to="/contacto" className="nav-link">
            <Mail size={16} className="icon" />
            Contáctanos
          </NavLink>
        </nav>

        {/* Acciones derecha: idioma + carrito */}
        <div className="navbar-actions">
          <button
            type="button"
            className="lang-btn lang-pill"
            onClick={() => console.log("[LANG] acá después cambiamos idioma")}
            aria-label="Cambiar idioma"
          >
            <Globe size={16} className="icon" />
            ES
          </button>

        <div
          className="nav-cart-wrap"
          onMouseEnter={openCart}
          onMouseLeave={closeCart}
        >
        <Link to="/carrito" className="cart-btn cart-pill" aria-label="Ir al carrito">
          <ShoppingCart size={16} className="icon" />
          <span>Carrito</span>
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
            <NavLink to="/login" className="nav-auth-link">Iniciar sesión</NavLink>
            <NavLink to="/signup" className="btn-auth">Crear cuenta</NavLink>
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
      title={user?.email || "Cuenta"}
    >
      {initials}
    </button>

    {userMenuOpen && (
      <div className="user-menu-panel" role="menu">
        <div className="user-menu-header">
          <div className="user-pill user-pill--sm">{initials}</div>
          <div className="user-menu-meta">
            <div className="user-menu-name">
              {user?.name || user?.displayName || "Mi cuenta"}
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
            Panel admin
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
          Mi perfil
        </button>

        <button
          type="button"
          className="user-menu-item danger"
          onClick={handleLogout}
        >
          <LogOut size={16} className="icon" />
          Cerrar sesión
        </button>
      </div>
    )}
  </div>
)}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
