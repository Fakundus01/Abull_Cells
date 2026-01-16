# back/send_test_email.py
import os
import ssl
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

email_sender = os.getenv("EMAIL_SENDER")
email_password = os.getenv("EMAIL_PASSWORD")
email_receiver = os.getenv("EMAIL_TEST_RECEIVER", email_sender)

subject = "Test Abul Cell"
body = """
Este es un correo de PRUEBA enviado desde Python con Gmail.
Si ves este mensaje, el SMTP esta funcionando :)
"""

if not email_sender or not email_password:
    raise RuntimeError(
        "Faltan EMAIL_SENDER o EMAIL_PASSWORD en el .env para la prueba de email."
    )

em = EmailMessage()
em["From"] = email_sender
em["To"] = email_receiver
em["Subject"] = subject
em.set_content(body)

context = ssl.create_default_context()

print("[MAIL-TEST] Enviando mail de prueba...")
with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
    smtp.login(email_sender, email_password)
    smtp.send_message(em)
print("[MAIL-TEST] Mail de prueba enviado OK.")
