// Saytdagi ariza formasini Telegram botga yuboradi.
// Netlify > Site configuration > Environment variables:
//   TELEGRAM_BOT_TOKEN  — @BotFather bergan token
//   TELEGRAM_CHAT_ID    — arizalar keladigan chat (shaxsiy yoki guruh) ID si

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const LEVELS = {
  zero: "Noldan boshlayman",
  some: "Biroz tajribam bor",
  pro: "SMM bilan ishlayman",
};

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "method" });

  let data;
  try { data = await req.json(); } catch { return json(400, { ok: false, error: "bad_json" }); }

  // Honeypot: odam ko'rmaydigan maydon to'ldirilgan bo'lsa — bot/spam
  if (data.website) return json(200, { ok: true });

  const name = String(data.name || "").trim().slice(0, 80);
  const phone = String(data.phone || "").trim().slice(0, 30);
  const tg = String(data.telegram || "").trim().replace(/^@/, "").slice(0, 40);
  const level = LEVELS[data.level] || "—";
  const digits = phone.replace(/\D/g, "");

  if (name.length < 2) return json(400, { ok: false, error: "name" });
  if (digits.length < 9 || digits.length > 15) return json(400, { ok: false, error: "phone" });
  if (tg && !/^[A-Za-z0-9_]{4,32}$/.test(tg)) return json(400, { ok: false, error: "telegram" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return json(500, { ok: false, error: "not_configured" });

  const time = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
  const text = [
    "🆕 <b>Yangi ariza — SMM mentorlik</b>",
    "",
    `👤 <b>Ism:</b> ${esc(name)}`,
    `📞 <b>Telefon:</b> ${esc(phone)}`,
    `✈️ <b>Telegram:</b> ${tg ? "@" + esc(tg) : "—"}`,
    `📊 <b>Tajriba:</b> ${esc(level)}`,
    "",
    `🕒 ${esc(time)}`,
  ].join("\n");

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out.ok) {
      console.error("Telegram error", r.status, out.description);
      return json(502, { ok: false, error: "telegram_failed" });
    }
  } catch (e) {
    console.error("Telegram fetch failed", e);
    return json(502, { ok: false, error: "telegram_failed" });
  }
  return json(200, { ok: true });
};

export const config = { path: "/api/lead" };
