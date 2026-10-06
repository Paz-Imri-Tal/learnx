import html
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import SMTP_APP_PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_USERNAME


class EmailNotConfigured(Exception):
    pass


def build_lecturer_email(
    to_email: str,
    subject: str,
    message: str,
    student_name: str,
    student_email: str,
) -> EmailMessage:
    email = EmailMessage()
    email["From"] = formataddr(("LearnX", SMTP_USERNAME or ""))
    email["To"] = to_email
    email["Reply-To"] = formataddr((student_name, student_email))
    email["Subject"] = subject

    email.set_content(
        f"שם השולח: {student_name}\n"
        f"מייל הסטודנט: {student_email}\n\n"
        f"{message}"
    )

    safe_message = html.escape(message).replace("\n", "<br>")
    email.add_alternative(
        f'<div dir="rtl">'
        f"<p>שם השולח: {html.escape(student_name)}</p>"
        f"<p>מייל הסטודנט: {html.escape(student_email)}</p>"
        f"<p>{safe_message}</p>"
        f"</div>",
        subtype="html",
    )
    return email


def send_email(email: EmailMessage) -> None:
    if not SMTP_USERNAME or not SMTP_APP_PASSWORD:
        raise EmailNotConfigured()

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.login(SMTP_USERNAME, SMTP_APP_PASSWORD)
        server.send_message(email)