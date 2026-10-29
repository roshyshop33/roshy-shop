// GET /api/order?session_id=cs_... — shows the order number on the thank-you page.
import { stripe, json } from "../../lib/stripe.js";

function maskEmail(email) {
  const [user, domain] = String(email || "").split("@");
  if (!domain) return "";
  return `${user.slice(0, 2)}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: "Invalid session" }, 400);
  try {
    const s = await stripe(env, "GET", `/v1/checkout/sessions/${id}`);
    if (s.status !== "complete") return json({ error: "Not complete" }, 404);
    return json({
      orderRef: s.metadata?.order_ref || "",
      email: maskEmail(s.customer_details?.email),
      paid: s.payment_status === "paid",
    });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
