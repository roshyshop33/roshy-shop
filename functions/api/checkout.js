// POST /api/checkout — creates a Stripe Checkout page for the customer's cart.
// Prices and shipping are always taken from store-config.js on the server.
import { stripe, newOrderRef, json } from "../../lib/stripe.js";
import { buildCheckoutParams } from "../../lib/checkout.js";

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Payments are not set up yet." }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const origin = (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const orderRef = newOrderRef();
  const built = buildCheckoutParams(body, origin, orderRef);
  if (built.error) return json({ error: built.error }, built.status);
  try {
    const session = await stripe(env, "POST", "/v1/checkout/sessions", built.params);
    return json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e.message);
    return json({ error: "We couldn't start the checkout." }, 502);
  }
}
