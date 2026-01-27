import cloudinary #type: ignore
import cloudinary.uploader #type: ignore


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