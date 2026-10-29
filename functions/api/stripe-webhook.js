// POST /api/stripe-webhook — Stripe calls this after every successful payment.
// It emails the shipping details to your agent and a summary to you.
import { verifyStripeSignature, json } from "../../lib/stripe.js";
import { handleEvent } from "../../lib/webhook.js";

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  const ok = await verifyStripeSignature(payload, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: "Bad signature" }, 400);

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  try {
    const result = await handleEvent(event, env);
    return json({ received: true, ...result });
  } catch (e) {
    // Returning an error makes Stripe retry automatically (for up to 3 days).
    console.error("Webhook error:", e.message);
    return json({ error: "Notification failed, will retry" }, 500);
  }
}
