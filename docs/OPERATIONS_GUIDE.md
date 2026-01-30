# Guía operativa: cómo funciona la página (mails, pagos y panel admin)

## 1) Registro, login y verificación de email
1. El usuario se registra con nombre, email y contraseña.
2. Se genera un código de verificación y se envía por email.
3. Hasta que el email esté verificado, el usuario **no puede comprar**.
4. Luego de verificar, el usuario puede crear órdenes.

**Mails involucrados:**
- Verificación de email.
- Recuperación de contraseña (si aplica).

---

## 2) Flujo de compra (checkout)
1. El usuario agrega productos al carrito.
2. En checkout completa:
   - Datos del comprador (nombre, email, teléfono).
   - Método de entrega (retiro o envío).
   - Método de pago (Mercado Pago o efectivo).
3. Se crea la orden en backend y se reserva stock si el pago es MP.

### 2.1 Compra con efectivo
- Se crea la orden con estado `pending`.
- Se envía email al comprador con instrucciones de retiro.
- Se envía email al admin con el detalle de la orden.

### 2.2 Compra con Mercado Pago
- Se crea la orden con estado `pending_payment`.
- Se genera una preferencia MP y se redirige al comprador.
- MP devuelve al sitio con estado `success`, `failure` o `pending`.
- El backend confirma el pago y actualiza la orden.

---

## 3) Flujo de pagos Mercado Pago

### 3.1 Creación de preferencia
- Se arma la preferencia con items, datos del comprador y URLs de retorno.
- Se requiere `MP_WEBHOOK_URL` HTTPS público.

### 3.2 Webhook y confirmación
- MP llama al webhook con el ID del pago.
- El backend consulta el pago y actualiza la orden:
  - `approved` → orden `paid`.
  - `pending` → orden `pending`.
  - otro estado → orden `cancelled`.

### 3.3 Emails en pagos
- Pago aprobado → email al admin y al comprador.
- Envío de resumen de pago MP en el email.

---

## 4) Emails automáticos

### 4.1 En checkout
- **Admin:** recibe aviso de nueva orden.
- **Comprador:** recibe confirmación (efectivo o MP pagado).

### 4.2 Contacto
- El formulario de contacto envía un mail al admin.
- El usuario recibe un autoreply.

### 4.3 Stock agotado
- Si un producto se queda sin stock, se avisa al admin.

---

## 5) Panel Admin

### 5.1 Acceso
- Solo usuarios con rol `admin`.
- Se recomienda configurar `ADMIN_EMAIL` y `ADMIN_PASSWORD` para crear un admin inicial.

### 5.2 Productos
- Alta, edición, eliminación.
- Subida de imágenes (local o Cloudinary).
- Activar/desactivar productos.

### 5.3 Órdenes
- Listado de órdenes.
- Actualización de estado.

### 5.4 Usuarios
- Listado de usuarios registrados.

---

## 6) Variables de entorno clave (resumen)

### Emails
- `EMAIL_SENDER`
- `EMAIL_PASSWORD`
- `EMAIL_ADMIN`

### Mercado Pago
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_URL`
- `MP_SUCCESS_URL`
- `MP_FAILURE_URL`
- `MP_PENDING_URL`

### Admin seed
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

---

## 7) Recomendaciones operativas
- Validar que el webhook MP reciba eventos en producción.
- Revisar logs de errores de email.
- Mantener actualizado el stock desde el panel admin.