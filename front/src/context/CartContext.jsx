// src/context/CartContext.jsx
import { createContext, useContext, useReducer, useMemo } from "react";

const CartContext = createContext();

const initialState = {
  items: [], // { id, name, price, imageUrl, quantity }
};

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product, quantity } = action.payload;
      const existing = state.items.find((i) => i.id === product.id);

      if (existing) {
        // si ya existe, sumamos cantidad
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          ),
        };
      }

      return {
        ...state,
        items: [
          ...state.items,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity,
          },
        ],
      };
    }

    case "REMOVE_ITEM": {
      const id = action.payload;
      return {
        ...state,
        items: state.items.filter((i) => i.id !== id),
      };
    }

    case "CLEAR_CART":
      return initialState;

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const value = useMemo(() => {
    const totalItems = state.items.reduce(
      (acc, item) => acc + item.quantity,
      0
    );
    const totalPrice = state.items.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0
    );

    function addToCart(product, quantity = 1) {
      dispatch({ type: "ADD_ITEM", payload: { product, quantity } });
    }

    function removeFromCart(id) {
      dispatch({ type: "REMOVE_ITEM", payload: id });
    }

    function clearCart() {
      dispatch({ type: "CLEAR_CART" });
    }

    return {
      items: state.items,
      totalItems,
      totalPrice,
      addToCart,
      removeFromCart,
      clearCart,
    };
  }, [state]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return ctx;
}
