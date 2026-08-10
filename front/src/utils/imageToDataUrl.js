// src/utils/imageToDataUrl.js

// La IA mira la foto con detail=low, asi que 512px alcanza de sobra para
// reconocer el producto y leer la caja. Mandar la original de 4 MB solo hace
// mas lento el request y mas caro el token de imagen.
const MAX_SIDE = 512;
const QUALITY = 0.82;

/**
 * Reduce un File de imagen y lo devuelve como data URL JPEG.
 *
 * Se usa para pedir sugerencias sobre una foto que todavia no se subio a
 * Cloudinary, como en el formulario de producto.
 */
export function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("El archivo no es una imagen."));
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));

        const ctx = canvas.getContext("2d");
        // Fondo blanco: los PNG con transparencia quedan negros al pasar a JPEG.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };

    img.src = url;
  });
}
