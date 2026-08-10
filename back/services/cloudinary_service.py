import cloudinary #type: ignore
import cloudinary.api #type: ignore
import cloudinary.uploader #type: ignore
import cloudinary.utils #type: ignore

# Cloudinary tope la pagina en 500. 100 es un equilibrio razonable entre
# cantidad de requests y peso de la respuesta en un celular.
ASSETS_PAGE_SIZE = 100


def init_cloudinary(app) -> bool:
    storage = (app.config.get("PRODUCT_IMAGE_STORAGE") or "local").lower()
    if storage != "cloudinary":
        return False

    cloud_name = app.config.get("CLOUDINARY_CLOUD_NAME")
    api_key = app.config.get("CLOUDINARY_API_KEY")
    api_secret = app.config.get("CLOUDINARY_API_SECRET")

    if not cloud_name or not api_key or not api_secret:
        app.logger.warning(
            "[Cloudinary] Config incompleta. Revisá CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET."
        )
        return False

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=bool(app.config.get("CLOUDINARY_SECURE", True)),
    )
    return True


def upload_product_image(
    image_file,
    *,
    folder: str = "products",
    public_id: str | None = None,
) -> str:
    upload_result = cloudinary.uploader.upload(
        image_file,
        folder=folder,
        public_id=public_id,
        resource_type="image",
    )
    return upload_result["secure_url"]

def _thumb_url(public_id: str, fmt: str | None) -> str:
    """Miniatura cuadrada y liviana, para que la grilla no baje las originales."""
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        format=fmt or "jpg",
        secure=True,
        transformation=[
            {"width": 240, "height": 240, "crop": "fill", "gravity": "auto"},
            {"quality": "auto", "fetch_format": "auto"},
        ],
    )
    return url


def list_product_assets(asset_folder: str | None = None, cursor: str | None = None):
    """
    Lista las imágenes de una carpeta de la Media Library.

    Se filtra por `asset_folder` y no por prefijo de `public_id`. Cloudinary usa
    carpetas dinámicas: renombrar una carpeta cambia `asset_folder` y deja el
    `public_id` viejo intacto. Con el prefijo, las imágenes de esta cuenta
    seguirían apareciendo bajo "products/" aunque se hayan movido a la carpeta
    de otro cliente.
    """
    params = {"max_results": ASSETS_PAGE_SIZE}
    if cursor:
        params["next_cursor"] = cursor

    if asset_folder:
        result = cloudinary.api.resources_by_asset_folder(asset_folder, **params)
    else:
        result = cloudinary.api.resources(type="upload", **params)

    assets = []
    for item in result.get("resources", []):
        public_id = item.get("public_id", "")
        assets.append(
            {
                "publicId": public_id,
                "url": item.get("secure_url") or item.get("url"),
                "thumbUrl": _thumb_url(public_id, item.get("format")),
                "width": item.get("width"),
                "height": item.get("height"),
                "bytes": item.get("bytes"),
                "createdAt": item.get("created_at"),
                # Carpeta tal como se ve hoy en la Media Library, que puede no
                # coincidir con el prefijo del public_id.
                "assetFolder": item.get("asset_folder") or "",
                # El nombre original suele venir despues del uuid que agrega
                # _save_product_image al subir.
                "filename": public_id.split("/")[-1].split("_", 1)[-1],
            }
        )

    return {"assets": assets, "nextCursor": result.get("next_cursor")}
