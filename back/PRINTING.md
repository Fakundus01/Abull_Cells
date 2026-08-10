# Impresión automática de tickets (Windows)

Este proyecto puede enviar el ticket de la orden a un servicio local de impresión.
El backend hace un POST a `PRINT_SERVICE_URL` cuando:

- Se crea una orden en efectivo.
- Se aprueba un pago de Mercado Pago.

Para que imprima automáticamente en Windows, levantá el servicio local que envía
el texto directo a la ticketera en modo RAW.

## Requisitos

- Windows con la ticketera instalada como impresora.
- Python con dependencias del backend (incluye `pywin32`).

## Variables de entorno (servicio local)

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `PRINT_SERVICE_PORT` | Puerto del servicio local | `9001` |
| `PRINT_SERVICE_TOKEN` | Token opcional para proteger el endpoint | `secreto` |
| `PRINTER_NAME` | Nombre de la impresora (opcional, usa la predeterminada) | `EPSON TM-T20II` |
| `PRINT_ENCODING` | Encoding para ticketera | `cp437` |
| `PRINT_CUT` | Agrega corte al final (`1`/`0`) | `1` |

## Variables de entorno (backend)

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| `PRINT_SERVICE_URL` | URL del servicio local | `http://localhost:9001/print` |
| `PRINT_SERVICE_TOKEN` | Token opcional (debe coincidir con el servicio local) | `secreto` |

## Cómo ejecutar el servicio local

Desde la carpeta `back`:

```bash
python print_service.py
```

Luego configurá en el backend:

```bash
PRINT_SERVICE_URL=http://localhost:9001/print
PRINT_SERVICE_TOKEN=secreto
```

## Endpoint

`POST /print` con JSON:

```json
{
  "order_id": 19,
  "reason": "mp_paid",
  "subject": "🧾 Ticket de orden #19 · mercadopago · pago pendiente",
  "body": "TICKET...",
  "html": "<div>...</div>"
}
```