"""Модуль уведомлений NailStudio.

Отвечает за отправку уведомлений мастерам и админу на внешние контакты:
- email через SMTP (smtplib),
- Telegram через Bot API (https://api.telegram.org/bot<TOKEN>/sendMessage).

Все функции безопасны для вызова: если канал не настроен или отправка не удалась,
они логируют ошибку и возвращают False, НЕ бросая исключение, чтобы основная
бизнес-логика (например, создание записи) не падала из-за проблем с уведомлением.
"""
import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .config import settings

logger = logging.getLogger("nailstudio.notifications")


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Отправка email через SMTP. Возвращает True при успешной отправке.

    Если SMTP не настроен (нет хоста/порта/логина/пароля) — логирует предупреждение
    и возвращает False. TLS включается, если SMTP_USE_TLS=true (обычно для порта 587).
    """
    if not (settings.SMTP_HOST and settings.SMTP_PORT and settings.SMTP_USER and settings.SMTP_PASSWORD):
        logger.warning("SMTP не настроен — email на %s не отправлен", to_email)
        return False

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email отправлен на %s", to_email)
        return True
    except Exception as exc:  # noqa: BLE001 — не роняем бизнес-логику из-за почты
        logger.error("Ошибка отправки email на %s: %s", to_email, exc)
        return False


def send_telegram(chat_id: str, text: str) -> bool:
    """Отправка сообщения в Telegram через Bot API. Возвращает True при успехе.

    chat_id — идентификатор чата мастера с ботом (обычно числовой, но может быть
    строкой). Если бот не настроен или chat_id пуст — логирует и возвращает False.
    """
    if not (settings.TELEGRAM_BOT_TOKEN and chat_id):
        logger.warning("Telegram-бот не настроен — сообщение в чат %s не отправлено", chat_id)
        return False

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    data = urlencode({"chat_id": chat_id, "text": text}).encode("utf-8")
    req = Request(url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})

    try:
        with urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                logger.error("Telegram ответил статусом %s", resp.status)
                return False
        logger.info("Telegram-сообщение отправлено в чат %s", chat_id)
        return True
    except Exception as exc:  # noqa: BLE001 — не роняем бизнес-логику из-за Telegram
        logger.error("Ошибка отправки Telegram в чат %s: %s", chat_id, exc)
        return False


def notify_master(master, client, service, appointment) -> dict:
    """Уведомляет мастера о новой записи на все доступные контакты.

    Возвращает словарь результатов по каналам: {"email": bool, "telegram": bool}.
    - email — на адрес пользователя, связанного с мастером (master.user.email);
    - telegram — в чат мастера (master.telegram_chat_id), если он указан.
    """
    client_name = f"{client.first_name} {client.last_name}".strip() or client.email or "Клиент"
    text = (
        "Новая запись в NailStudio!\n"
        f"Клиент: {client_name}\n"
        f"Услуга: {service.title}\n"
        f"Цена: {service.price:.0f} ₽\n"
        f"Дата: {appointment.date}\n"
        f"Время: {appointment.time}"
    )

    results: dict = {}
    if master.user and master.user.email:
        results["email"] = send_email(
            master.user.email,
            "Новая запись в NailStudio",
            text,
        )
    if getattr(master, "telegram_chat_id", None):
        results["telegram"] = send_telegram(master.telegram_chat_id, text)
    return results