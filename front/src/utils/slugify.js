// src/utils/slugify.js

/**
 * Genera el slug de un producto a partir de su nombre.
 * Replica _slugify() del backend para que el valor que se previsualiza en el
 * formulario sea el mismo que termina guardado.
 */
export function slugify(value) {
  return (
    String(value || "")
      .normalize("NFD")
      // Elimina las marcas de acento que el NFD deja sueltas.
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || ""
  );
}
