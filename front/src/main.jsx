// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import ConfigErrorScreen from "./components/ConfigErrorScreen";

const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
const hasApiConfig = Boolean(String(rawApiUrl || "").trim());

const root = ReactDOM.createRoot(document.getElementById("root"));

if (!hasApiConfig) {
  root.render(
    <React.StrictMode>
      <ConfigErrorScreen missingKeys={["VITE_API_URL (or VITE_API_BASE_URL)"]} />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
}
