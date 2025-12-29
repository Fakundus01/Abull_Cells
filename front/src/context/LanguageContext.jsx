// src/context/LanguageContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext();

const TRANSLATIONS = {
  es: {
    nav: {
      home: "Home",
      store: "Tienda",
      offers: "Ofertas",
      faq: "FAQ",
      contact: "Contáctanos",
      admin: "Admin",
      cart: "Carrito",
    },
    home: {
      title: "Bienvenido a Abul Cells",
      subtitle: "Tu tienda de productos electrónicos",
    },
    cart: {
      title: "Tu carrito",
      empty: "Tu carrito está vacío.",
      goToStore: "Ir a la tienda",
      productAdded_one: "producto agregado",
      productAdded_other: "productos agregados",
      clear: "Vaciar carrito",
      summary: "Resumen",
      totalProducts: "Total productos",
      total: "Total",
      goToCheckout: "Ir al checkout",
      remove: "Quitar",
      quantity: "Cantidad",
    },
    checkout: {
      title: "Checkout",
      subtitle: "Completá tus datos para finalizar la compra",
      name: "Nombre completo",
      email: "Correo electrónico",
      phone: "Teléfono (opcional)",
      address: "Dirección",
      city: "Ciudad",
      province: "Provincia",
      postalCode: "Código postal",
      notes: "Notas (opcional)",
      paymentMethod: "Método de pago",
      payment_card: "Tarjeta",
      payment_cash: "Efectivo en el local",
      payment_transfer: "Transferencia bancaria",
      submit: "Confirmar compra",
      success: "¡Compra realizada con éxito!",
    },
  },
  en: {
    nav: {
      home: "Home",
      store: "Store",
      offers: "Deals",
      faq: "FAQ",
      contact: "Contact us",
      admin: "Admin",
      cart: "Cart",
    },
    home: {
      title: "Welcome to Abul Cells",
      subtitle: "Your electronic products store",
    },
    cart: {
      title: "Your cart",
      empty: "Your cart is empty.",
      goToStore: "Go to store",
      productAdded_one: "product added",
      productAdded_other: "products added",
      clear: "Clear cart",
      summary: "Summary",
      totalProducts: "Total products",
      total: "Total",
      goToCheckout: "Go to checkout",
      remove: "Remove",
      quantity: "Quantity",
    },
    checkout: {
      title: "Checkout",
      subtitle: "Fill in your details to complete the purchase",
      name: "Full name",
      email: "Email",
      phone: "Phone (optional)",
      address: "Address",
      city: "City",
      province: "State / Province",
      postalCode: "ZIP / Postal code",
      notes: "Notes (optional)",
      paymentMethod: "Payment method",
      payment_card: "Card",
      payment_cash: "Cash at store",
      payment_transfer: "Bank transfer",
      submit: "Confirm order",
      success: "Purchase completed successfully!",
    },
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("language") || "es"
  );

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const value = useMemo(() => {
    function t(key) {
      const parts = key.split(".");
      let current = TRANSLATIONS[language];
      for (const p of parts) {
        if (!current || typeof current !== "object") return key;
        current = current[p];
      }
      return current ?? key;
    }

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage debe usarse dentro de LanguageProvider");
  }
  return ctx;
}
