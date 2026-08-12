"""
Telegram-бот Businitti.

Запуск: python3 bot.py
Env vars:
  TELEGRAM_BOT_TOKEN   — токен бота (обязательно)
  ADMIN_IDS            — список Telegram user_id через запятую (обязательно для команд)
  INTERNAL_API_KEY     — ключ для вызова внутреннего API Express-бэкенда
  ADMIN_API_URL        — URL Express-бэкенда (default: http://127.0.0.1:4001)
  TG_BOT_PORT          — порт HTTP-сервера (default: 4002)
  SITE_URL             — URL сайта для /status (default: https://businitti.ru)

HTTP-сервер (localhost:TG_BOT_PORT):
  POST /notify      — отправить уведомление о заказе  {chat_id, order, items}
  POST /test_notif  — тестовое уведомление            {chat_id}
  GET  /health      — health check самого бота
"""

import os
import logging
import threading
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import requests
import httpx
from flask import Flask, request, jsonify
from telegram import BotCommand, Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ─── конфиг ──────────────────────────────────────────────────────────────────

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
ADMIN_IDS = {
    int(x.strip())
    for x in os.environ.get("ADMIN_IDS", "").split(",")
    if x.strip().isdigit()
}
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")
ADMIN_API_URL = os.environ.get("ADMIN_API_URL", "http://127.0.0.1:4001").rstrip("/")
TG_BOT_PORT = int(os.environ.get("TG_BOT_PORT", "4002"))
SITE_URL = os.environ.get("SITE_URL", "https://businitti.ru")

# HTTP_PROXY_URL имеет приоритет; если не задан — используем SOCKS5_PROXY_URL
_http_proxy = os.environ.get("HTTP_PROXY_URL", "").strip()
_socks_proxy = os.environ.get("SOCKS5_PROXY_URL", "").strip()
PROXY_URL: str = _http_proxy or _socks_proxy  # пустая строка = без прокси

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DELIVERY_LABELS = {"cdek": "СДЭК", "yandex_market": "Яндекс Маркет"}
STATUS_LABELS = {
    "pending_payment": "Ожидает оплаты",
    "new": "Новый",
    "shipped": "Отправлен",
    "cancelled": "Отменён",
    "refunded": "Возврат",
}
ACCESS_DENIED = "⛔️ Нет доступа. Этот бот работает только для администраторов."

# ─── helpers ─────────────────────────────────────────────────────────────────

def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


def _internal_headers() -> dict:
    if INTERNAL_API_KEY:
        return {"X-Internal-Key": INTERNAL_API_KEY}
    return {}


def internal_get(path: str) -> dict | list:
    resp = requests.get(
        f"{ADMIN_API_URL}/api/internal{path}",
        headers=_internal_headers(),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def internal_post(path: str, data: dict) -> dict:
    resp = requests.post(
        f"{ADMIN_API_URL}/api/internal{path}",
        json=data,
        headers=_internal_headers(),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def fmt_date(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return iso


def fmt_rub(amount: int | float) -> str:
    return f"{int(amount):,}".replace(",", " ") + " ₽"  # неразрывный пробел


def format_order_message(order: dict, items: list) -> str:
    delivery = DELIVERY_LABELS.get(order.get("delivery_service", ""), "—")
    status = STATUS_LABELS.get(order.get("status", ""), order.get("status", "—"))

    # уведомления шлёт бэкенд только по факту оплаты (webhook Робокассы),
    # поэтому статус тут в норме всегда «Новый» — помечаем оплату явно
    header = f"🛍 <b>Новый заказ #{order.get('display_id', '?')}</b>"
    if order.get("status") == "new":
        header += "\n💳 <b>Оплачен</b>"

    lines = [
        header,
        "",
        f"👤 <b>Покупатель:</b> {order.get('customer_name', '—')}",
        f"📞 <b>Телефон:</b> {order.get('customer_phone', '—')}",
        f"📧 <b>Email:</b> {order.get('customer_email', '—')}",
        "",
        f"🚚 <b>Доставка:</b> {delivery}",
        f"📍 <b>Адрес:</b> {order.get('delivery_address', '—')}",
        "",
        "<b>Состав заказа:</b>",
    ]

    has_preorder = False
    for item in items:
        article = item.get("product_article") or ""
        article_str = f" ({article})" if article else ""
        qty = item.get("quantity", 1)
        subtotal = item.get("subtotal_rub", 0)
        # позиция с остатком 0 — оформлена предзаказом, отправить сразу не выйдет
        preorder_str = " ⏳ <b>предзаказ</b>" if item.get("is_preorder") else ""
        if preorder_str:
            has_preorder = True
        lines.append(
            f"  • {item.get('product_title', '—')}{article_str} × {qty} — {fmt_rub(subtotal)}{preorder_str}"
        )

    if has_preorder:
        lines += ["", "⏳ <b>В заказе есть предзаказ</b> — товар нужно изготовить"]

    lines += [
        "",
        f"📦 <b>Доставка:</b> {fmt_rub(order.get('delivery_rub', 0))}",
        f"💰 <b>Итого:</b> {fmt_rub(order.get('total_rub', 0))}",
    ]

    comment = (order.get("comment") or "").strip()
    if comment:
        lines += ["", f"💬 <b>Комментарий:</b> {comment}"]

    lines += ["", f"🕐 {fmt_date(order.get('created_at', ''))}", f"📊 <b>Статус:</b> {status}"]
    return "\n".join(lines)


def format_order_short(order: dict) -> str:
    status = STATUS_LABELS.get(order.get("status", ""), order.get("status", "—"))
    delivery = DELIVERY_LABELS.get(order.get("delivery_service", ""), "—")
    return (
        f"<b>#{order.get('display_id')} — {order.get('customer_name', '—')}</b>\n"
        f"{fmt_date(order.get('created_at', ''))} · {delivery} · {fmt_rub(order.get('total_rub', 0))} · {status}"
    )


SAMPLE_ORDER = {
    "display_id": 9999, "inv_id": 9999,
    "created_at": "", "status": "new",
    "customer_name": "Иванова Мария", "customer_phone": "+7 (999) 123-45-67",
    "customer_email": "test@example.com", "delivery_service": "cdek",
    "delivery_address": "г. Москва, ул. Примерная, д. 1, кв. 1",
    "delivery_rub": 650, "total_rub": 4650,
    "comment": "Тестовое уведомление — заказ в систему не занесён",
}
SAMPLE_ITEMS = [
    {"product_title": "Кольцо «Луна» серебро", "product_article": "RNG-001",
     "price_rub": 2000, "quantity": 1, "subtotal_rub": 2000},
    {"product_title": "Браслет «Волна» золото", "product_article": "BRC-007",
     "price_rub": 2000, "quantity": 1, "subtotal_rub": 2000, "is_preorder": True},
]

# ─── Telegram-команды ─────────────────────────────────────────────────────────

async def cmd_start(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text(ACCESS_DENIED)
        return
    await update.message.reply_text("Список доступных команд — /help")


async def cmd_help(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text(ACCESS_DENIED)
        return
    text = (
        "<b>Команды Businitti-бота:</b>\n\n"
        "/new — новые заказы (статус «Новый»)\n"
        "/orders — последние 5 заказов\n"
        "/status — статус сайта и бэкенда\n"
        "/test_notif — тестовое уведомление о заказе\n"
        "/help — эта справка"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def cmd_new(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text(ACCESS_DENIED)
        return
    try:
        orders = internal_get("/orders/new")
        if not orders:
            await update.message.reply_text("✅ Новых заказов нет.")
            return
        lines = [f"📬 <b>Новых заказов: {len(orders)}</b>\n"]
        for order in orders[:10]:
            lines.append(format_order_short(order))
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        log.error("cmd_new error: %s", e)
        await update.message.reply_text(f"❌ Ошибка: {e}")


async def cmd_orders(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text(ACCESS_DENIED)
        return
    try:
        orders = internal_get("/orders?limit=5")
        if not orders:
            await update.message.reply_text("Заказов пока нет.")
            return
        lines = ["<b>Последние 5 заказов:</b>\n"]
        for order in orders:
            lines.append(format_order_short(order))
        await update.message.reply_text("\n".join(lines), parse_mode="HTML")
    except Exception as e:
        log.error("cmd_orders error: %s", e)
        await update.message.reply_text(f"❌ Ошибка: {e}")


async def cmd_test_notif(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text(ACCESS_DENIED)
        return
    try:
        sample = dict(SAMPLE_ORDER, created_at=datetime.utcnow().isoformat() + "Z")
        text = format_order_message(sample, SAMPLE_ITEMS)
        await update.message.reply_text(text, parse_mode="HTML")
    except Exception as e:
        log.error("cmd_test_notif error: %s", e)
        await update.message.reply_text(f"❌ Ошибка: {e}")


async def cmd_status(update: Update, _ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_admin(update.effective_user.id):
        await update.message.reply_text(ACCESS_DENIED)
        return

    lines = ["<b>Статус систем:</b>\n"]

    # проверяем сайт
    try:
        r = requests.get(SITE_URL, timeout=7, allow_redirects=True)
        if r.status_code < 400:
            lines.append(f"🌐 Сайт ({SITE_URL}): ✅ работает ({r.status_code})")
        else:
            lines.append(f"🌐 Сайт ({SITE_URL}): ⚠️ HTTP {r.status_code}")
    except requests.Timeout:
        lines.append(f"🌐 Сайт ({SITE_URL}): ❌ таймаут")
    except Exception as e:
        lines.append(f"🌐 Сайт ({SITE_URL}): ❌ {e}")

    # проверяем бэкенд
    try:
        r = requests.get(f"{ADMIN_API_URL}/health", timeout=5)
        if r.status_code == 200:
            lines.append(f"⚙️ Бэкенд: ✅ работает")
        else:
            lines.append(f"⚙️ Бэкенд: ⚠️ HTTP {r.status_code}")
    except Exception as e:
        lines.append(f"⚙️ Бэкенд: ❌ {e}")

    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


# ─── Flask HTTP-сервер ────────────────────────────────────────────────────────

flask_app = Flask(__name__)


@flask_app.route("/notify", methods=["POST"])
def notify():
    data = request.get_json(silent=True) or {}
    chat_id = str(data.get("chat_id", "")).strip()
    order = data.get("order") or {}
    items = data.get("items") or []
    if not chat_id:
        return jsonify({"error": "chat_id required"}), 400
    try:
        text = format_order_message(order, items)
        _send_telegram(chat_id, text)
        log.info("notification sent chat_id=%s order=#%s", chat_id, order.get("display_id"))
        return jsonify({"ok": True})
    except Exception as e:
        log.error("notify error: %s", e)
        return jsonify({"error": str(e)}), 500


@flask_app.route("/test_notif", methods=["POST"])
def test_notif():
    data = request.get_json(silent=True) or {}
    chat_id = str(data.get("chat_id", "")).strip()
    if not chat_id:
        return jsonify({"error": "chat_id required"}), 400
    try:
        sample = dict(SAMPLE_ORDER, created_at=datetime.utcnow().isoformat() + "Z")
        text = format_order_message(sample, SAMPLE_ITEMS)
        _send_telegram(chat_id, text)
        log.info("test notification sent chat_id=%s", chat_id)
        return jsonify({"ok": True})
    except Exception as e:
        log.error("test_notif error: %s", e)
        return jsonify({"error": str(e)}), 500


@flask_app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


def _send_telegram(chat_id: str, text: str) -> None:
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN not set")
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    proxy_kwargs = {"proxy": PROXY_URL} if PROXY_URL else {}
    with httpx.Client(timeout=15, **proxy_kwargs) as client:
        resp = client.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
        resp.raise_for_status()


def run_flask() -> None:
    flask_app.run(host="127.0.0.1", port=TG_BOT_PORT, use_reloader=False)


# ─── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    if not BOT_TOKEN:
        log.error("TELEGRAM_BOT_TOKEN not set — exiting")
        raise SystemExit(1)
    if not ADMIN_IDS:
        log.warning("ADMIN_IDS is empty — no one will be able to use commands")

    # HTTP-сервер в фоновом потоке
    flask_thread = threading.Thread(target=run_flask, daemon=True, name="flask")
    flask_thread.start()
    log.info("HTTP server started on 127.0.0.1:%d", TG_BOT_PORT)

    # Telegram-бот
    builder = ApplicationBuilder().token(BOT_TOKEN)
    if PROXY_URL:
        log.info("using proxy: %s", PROXY_URL)
        builder = builder.proxy(PROXY_URL).get_updates_proxy(PROXY_URL)
    app = builder.build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("new", cmd_new))
    app.add_handler(CommandHandler("orders", cmd_orders))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("test_notif", cmd_test_notif))

    async def register_commands(app):  # type: ignore[override]
        await app.bot.set_my_commands([
            BotCommand("help", "Справка по командам"),
            BotCommand("new", "Новые заказы"),
            BotCommand("orders", "Последние 5 заказов"),
            BotCommand("status", "Статус сайта"),
            BotCommand("test_notif", "Тестовое уведомление о заказе"),
        ])
        log.info("bot commands registered")

    app.post_init = register_commands
    log.info("starting polling")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
