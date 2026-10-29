// POST /api/ship — marks an order as shipped and emails the customer the tracking number.
// Used by the password-protected page at /admin/ship (for you or your agent).
import { stripe, json, timingSafeEqual } from "../../lib/stripe.js";
import { sendEmail, splitEmails } from "../../lib/email.js";
import { shippedEmail, trackingUrl } from "../../lib/orders.js";

const CARRIERS = ["YunExpress", "4PX", "Yanwen", "Cainiao", "China Post", "EMS", "DHL", "An Post", "Other"];

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }

  if (!env.ADMIN_PASSWORD || !timingSafeEqual(String(d.password || ""), env.ADMIN_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "Wrong password. 密码错误。" }, 401);
  }
  const ref = String(d.ref || "").trim().toUpperCase();
  const number = String(d.number || "").trim().replace(/\s+/g, "");
  const carrier = CARRIERS.includes(d.carrier) ? d.carrier : "Other";
  if (!/^RS-\d{6}-[A-Z0-9]{4}$/.test(ref)) return json({ error: "Order number looks wrong (example: RS-261029-K7QM). 订单号格式错误。" }, 400);
  if (!/^[A-Za-z0-9-]{6,40}$/.test(number)) return json({ error: "Tracking number looks wrong. 物流单号格式错误。" }, 400);

  try {
    const found = await stripe(env, "GET", "/v1/payment_intents/search", { query: `metadata['order_ref']:'${ref}'` });
    const pi = found.data?.[0];
    if (!pi) return json({ error: "Order not found (new orders can take a minute to appear). 未找到订单。" }, 404);
    if (pi.status !== "succeeded") return json({ error: "This order isn't paid. 此订单未付款。" }, 409);
    if (pi.metadata?.tracking_number && !d.resend) {
      return json({ error: `Already marked shipped with ${pi.metadata.tracking_number}. Tick “send again” to resend. 已发货。`, already: true }, 409);
    }

    const sessions = await stripe(env, "GET", "/v1/checkout/sessions", { payment_intent: pi.id, limit: 1 });
    const s = sessions.data?.[0];
    const email = s?.customer_details?.email;
    if (!email) return json({ error: "No customer email on this order." }, 404);

    const url = trackingUrl(carrier, number);
    const m = shippedEmail({ ref, name: s.customer_details?.name, carrier, number, url });
    await sendEmail(env, { to: [email], bcc: splitEmails(env.OWNER_EMAIL), replyTo: splitEmails(env.OWNER_EMAIL)[0], ...m });

    await stripe(env, "POST", `/v1/payment_intents/${pi.id}`, {
      metadata: { tracking_number: number, carrier, shipped_at: new Date().toISOString().slice(0, 16) },
    });
    return json({ ok: true, message: `Done — ${email.replace(/^(.{2}).*@/, "$1***@")} has been emailed the tracking link. 已通知客户。` });
  } catch (e) {
    console.error("Ship error:", e.message);
    return json({ error: "Something went wrong: " + e.message }, 502);
  }
}
