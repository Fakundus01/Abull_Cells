import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Store from "./pages/Store";
import Offers from "./pages/Offers";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Admin from "./pages/Admin/Admin"; // la creamos abajo
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutFailure from "./pages/CheckoutFailure";
import CheckoutPending from "./pages/CheckoutPending";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import OrdersHistory from "./pages/OrdersHistory";
import VerifyEmail from "./components/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { RequireAuth, RequireAdmin } from "./routes/guards";

function App() {
  return (
    <div className="app-container">
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tienda" element={<Store />} />
          <Route path="/ofertas" element={<Offers />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<Admin />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/perfil" element={<Profile />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/mis-pedidos" element={<OrdersHistory />} />
          </Route>
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/failure" element={<CheckoutFailure />} />
          <Route path="/checkout/pending" element={<CheckoutPending />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
