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
import Admin from "./pages/Admin"; // la creamos abajo
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutFailure from "./pages/CheckoutFailure";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import VerifyEmail from "./components/VerifyEmail";

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
          <Route path="/admin" element={<Admin />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/failure" element={<CheckoutFailure />} />
          <Route path="/checkout/pending" element={<CheckoutFailure />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
