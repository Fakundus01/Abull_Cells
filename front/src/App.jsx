import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import BackToTopButton from "./components/BackToTopButton";
import AppLoader from "./components/AppLoader";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import { RequireAuth, RequireAdmin, RequireGuest } from "./routes/guards";

const Home = lazy(() => import("./pages/Home"));
const Store = lazy(() => import("./pages/Store"));
const Offers = lazy(() => import("./pages/Offers"));
const Faq = lazy(() => import("./pages/Faq"));
const Contact = lazy(() => import("./pages/Contact"));
const Cart = lazy(() => import("./pages/Cart"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin/Admin"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutFailure = lazy(() => import("./pages/CheckoutFailure"));
const CheckoutPending = lazy(() => import("./pages/CheckoutPending"));
const Signup = lazy(() => import("./pages/Signup"));
const Profile = lazy(() => import("./pages/Profile"));
const OrdersHistory = lazy(() => import("./pages/OrdersHistory"));
const VerifyEmail = lazy(() => import("./components/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteShell({ label, children }) {
  const location = useLocation();
  const resetKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <RouteErrorBoundary resetKey={resetKey}>
      <Suspense fallback={<AppLoader variant="page" label={label} />}>
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

function routeElement(Component, label) {
  return (
    <RouteShell label={label}>
      <Component />
    </RouteShell>
  );
}

function App() {
  return (
    <div className="app-container">
      <ScrollToTop />
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={routeElement(Home, "Cargando inicio...")} />
          <Route path="/tienda" element={routeElement(Store, "Cargando tienda...")} />
          <Route path="/ofertas" element={routeElement(Offers, "Cargando ofertas...")} />
          <Route path="/faq" element={routeElement(Faq, "Cargando preguntas...")} />
          <Route path="/contacto" element={routeElement(Contact, "Cargando contacto...")} />
          <Route path="/carrito" element={routeElement(Cart, "Cargando carrito...")} />

          <Route element={<RequireGuest />}>
            <Route path="/login" element={routeElement(Login, "Cargando acceso...")} />
            <Route path="/signup" element={routeElement(Signup, "Cargando registro...")} />
          </Route>

          <Route
            path="/forgot-password"
            element={routeElement(ForgotPassword, "Cargando recuperacion...")}
          />
          <Route
            path="/reset-password"
            element={routeElement(ResetPassword, "Cargando cambio de clave...")}
          />

          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={routeElement(Admin, "Cargando panel admin...")} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/perfil" element={routeElement(Profile, "Cargando perfil...")} />
            <Route path="/checkout" element={routeElement(Checkout, "Cargando checkout...")} />
            <Route
              path="/mis-pedidos"
              element={routeElement(OrdersHistory, "Cargando pedidos...")}
            />
            <Route
              path="/verify-email"
              element={routeElement(VerifyEmail, "Cargando verificacion...")}
            />
            <Route
              path="/checkout/success"
              element={routeElement(CheckoutSuccess, "Cargando estado de pago...")}
            />
            <Route
              path="/checkout/failure"
              element={routeElement(CheckoutFailure, "Cargando estado de pago...")}
            />
            <Route
              path="/checkout/pending"
              element={routeElement(CheckoutPending, "Cargando estado de pago...")}
            />
          </Route>

          <Route path="*" element={routeElement(NotFound, "Cargando vista...")} />
        </Routes>
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
}

export default App;
