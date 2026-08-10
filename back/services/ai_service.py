"""
Sugerencia de título y descripción a partir de la foto del producto.

Solo se usa para acelerar la carga en el panel de admin: la IA propone textos
y la persona los revisa y pone el precio. Nada de esto se publica sin
confirmación del admin.
"""
import concurrent.futures
import json
import os

import requests
from flask import current_app

OPENAI_URL = "https://api.openai.com/v1/chat/completions"

# Tope por lote. Cada imagen es un request independiente; mas de esto hace que
# el admin espere demasiado sin feedback.
MAX_IMAGES = 12

# Cuantos requests en paralelo. Secuencial son ~3,5s por imagen y se hace eterno.
MAX_WORKERS = 6

CATEGORIES = [
    "Fundas",
    "Cargadores",
    "Cables",
    "Audio",
    "Gaming",
    "Periféricos",
    "Protectores",
    "Accesorios",
]

PROMPT = (
    "Sos el catalogador de una tienda argentina de accesorios para celulares, "
    "notebooks y gaming. Mirá la foto y devolvé JSON con:\n"
    '- "name": título comercial corto (máx 60 caracteres), en español rioplatense, '
    "sin precio ni signos de exclamación. Si la caja muestra marca y modelo, usalos.\n"
    '- "description": 1 o 2 oraciones (máx 180 caracteres) con lo que se ve: tipo de '
    "producto, características visibles y colores disponibles.\n"
    '- "category": exactamente una de: ' + ", ".join(CATEGORIES) + ".\n"
    "Si la foto no permite identificar el producto, devolvé name como cadena vacía.\n"
    "Respondé solo el JSON."
)


def is_configured() -> bool:
    return bool(os.getenv("OPENAI_API_KEY"))


def _describe_one(image_url: str, api_key: str, model: str) -> dict:
    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    # detail low: alcanza para reconocer el producto y la caja, y
                    # baja el costo a fracciones de centavo por imagen.
                    {"type": "image_url", "image_url": {"url": image_url, "detail": "low"}},
                ],
            }
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 220,
    }

    response = requests.post(
        OPENAI_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=body,
        timeout=60,
    )

    if response.status_code != 200:
        detail = ""
        try:
            detail = response.json().get("error", {}).get("message", "")
        except ValueError:
            detail = response.text[:120]
        raise RuntimeError(f"OpenAI {response.status_code}: {detail}")

    payload = response.json()
    content = payload["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    category = parsed.get("category")
    if category not in CATEGORIES:
        category = ""

    return {
        "name": (parsed.get("name") or "").strip()[:120],
        "description": (parsed.get("description") or "").strip()[:400],
        "category": category,
        "usage": payload.get("usage", {}),
    }


def suggest_for_images(images: list[dict]) -> dict:
    """
    `images` es una lista de {id, url}. Devuelve resultados en el mismo orden,
    cada uno con los textos sugeridos o con `error` si esa imagen falló.

    Una imagen que falla no cancela el lote: el admin igual puede usar el resto.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY no configurada.")

    model = os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini")
    results = [None] * len(images)
    tokens_in = tokens_out = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(_describe_one, item["url"], api_key, model): index
            for index, item in enumerate(images)
        }
        for future in concurrent.futures.as_completed(futures):
            index = futures[future]
            item = images[index]
            try:
                data = future.result()
                usage = data.pop("usage", {})
                tokens_in += usage.get("prompt_tokens", 0)
                tokens_out += usage.get("completion_tokens", 0)
                results[index] = {"id": item.get("id"), **data}
            except Exception as exc:
                current_app.logger.warning(
                    "[AI] Falló la sugerencia para %s: %r", item.get("url"), exc
                )
                results[index] = {"id": item.get("id"), "error": str(exc)[:160]}

    # gpt-4o-mini: USD 0.15 por 1M de entrada, 0.60 por 1M de salida.
    cost = tokens_in / 1e6 * 0.15 + tokens_out / 1e6 * 0.60

    return {
        "results": results,
        "model": model,
        "usage": {"inputTokens": tokens_in, "outputTokens": tokens_out, "costUsd": round(cost, 6)},
    }
