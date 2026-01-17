// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext.jsx"; 
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
    <LanguageProvider>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
           <App />
          </ToastProvider>
        </CartProvider>
       </AuthProvider>
      </BrowserRouter>
     </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
