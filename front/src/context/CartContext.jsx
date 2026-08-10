// src/context/CartContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

const CartContext = createContext(null);

const initialState = {
  items: [], // { id, name, price, imageUrl, quantity, stock?, originalPrice?, offerLabel? }
};

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product, quantity } = action.payload;

      const incomingQty = Math.max(1, Number(quantity ?? 1));
      const maxStock = Number(product?.stock ?? 0); // 0 / null => sin tope
      const hasStockCap = Number.isFinite(maxStock) && maxStock > 0;

      const existing = state.items.find((i) => i.id === product.id);

      if (existing) {
        const nextQtyRaw = existing.quantity + incomingQty;
        const nextQty = hasStockCap ? Math.min(nextQtyRaw, maxStock) : nextQtyRaw;

        return {
          ...state,
          items: state.items.map((i) =>
            i.id === product.id
              ? {
                  ...i,
                  quantity: nextQty,
                  stock: hasStockCap ? maxStock : i.stock,
                }
              : i
          ),
        };
      }

      const startQty = hasStockCap ? Math.min(incomingQty, maxStock) : incomingQty;

      return {
        ...state,
        items: [
          ...state.items,
          {
            ...product,
            quantity: startQty,
            stock: hasStockCap ? maxStock : product.stock,
          },
        ],
      };
    }

    case "DECREMENT_ITEM": {
      const { id, quantity } = action.payload;
      const dec = Math.max(1, Number(quantity ?? 1));

      const existing = state.items.find((i) => i.id === id);
      if (!existing) return state;

      const nextQty = existing.quantity - dec;

      if (nextQty <= 0) {
        return { ...state, items: state.items.filter((i) => i.id !== id) };
      }

      return {
        ...state,
        items: state.items.map((i) => (i.id === id ? { ...i, quantity: nextQty } : i)),
      };
    }

    case "REMOVE_ITEM": {
      const { id } = action.payload;
      return { ...state, items: state.items.filter((i) => i.id !== id) };
    }

    case "CLEAR": {
      return { ...state, items: [] };
    }

    case "HYDRATE": {
      return action.payload ?? state;
    }

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(state));
    } catch {}
  }, [state]);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      dispatch({ type: "HYDRATE", payload: parsed });
    } catch {}
  }, []);

  const addToCart = (product, quantity = 1) =>
    dispatch({ type: "ADD_ITEM", payload: { product, quantity } });

  const decrementFromCart = (id, quantity = 1) =>
    dispatch({ type: "DECREMENT_ITEM", payload: { id, quantity } });

  const removeFromCart = (id) => dispatch({ type: "REMOVE_ITEM", payload: { id } });

  const clearCart = () => dispatch({ type: "CLEAR" });

  const totalItems = useMemo(
    () => state.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
    [state.items]
  );

  const totalPrice = useMemo(
    () =>
      state.items.reduce((acc, it) => {
        const q = Number(it.quantity) || 0;
        const p = Number(it.price) || 0;
        return acc + q * p;
      }, 0),
    [state.items]
  );

  const value = useMemo(
    () => ({
      items: state.items,
      addToCart,
      decrementFromCart,
      removeFromCart,
      clearCart,
      totalItems,
      totalPrice,
    }),
    [state.items, totalItems, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
