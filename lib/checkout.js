// Builds the Stripe Checkout request from the cart. Prices come from store-config.js.
import { STORE, findProduct, toCents, shippingFor } from "../public/assets/js/store-config.js";
import { encodeItems } from "./orders.js";

export function buildCheckoutParams(body, origin, orderRef) {
  const region = body?.region === "WORLD" ? "WORLD" : "IE";
  const merged = new Map();
  for (const it of Array.isArray(body?.items) ? body.items : []) {
    const p = findProduct(String(it?.id));
    const q = Math.floor(Number(it?.qty));
    if (!p || !Number.isFinite(q) || q <= 0) continue;
    merged.set(p.id, (merged.get(p.id) || 0) + q);
  }
  if (!merged.size) return { error: "Your cart is empty.", status: 400 };

  const lines = [];
  let subtotal = 0;
  for (const [id, qty] of merged) {
    const p = findProduct(id);
    if (!p.available) return { error: `Sorry, ${p.name} is sold out.`, status: 409 };
    if (qty > (p.maxPerOrder || 10)) return { error: `You can order up to ${p.maxPerOrder || 10} of ${p.name}.`, status: 400 };
    subtotal += p.price * qty;
    lines.push({ p, qty });
  }

  const rule = STORE.shipping[region];
  const fee = shippingFor(subtotal, region);
  const https = origin.startsWith("https://");
  const allowed = region === "IE" ? ["IE"] : STORE.worldwideCountries.filter((c) => c !== "IE");

  const params = {
    mode: "payment",
    line_items: lines.map(({ p, qty }) => ({
      quantity: qty,
      price_data: {
        currency: STORE.currency,
        unit_amount: toCents(p.price),
        product_data: {
          name: p.name,
          ...(https ? { images: [origin + p.images[0]] } : {}),
          metadata: { sku: p.sku, product_id: p.id },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: allowed },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: fee === 0 ? `Free shipping — ${rule.checkoutName}` : rule.checkoutName,
          fixed_amount: { amount: toCents(fee), currency: STORE.currency },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    locale: "auto",
    custom_text: {
      shipping_address: {
        message: region === "IE"
          ? "Please double-check your address — orders can't be changed once placed. Shipping outside Ireland? Go back to your cart and choose “Another country”."
          : "Please double-check your address — orders can't be changed once placed.",
      },
    },
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/products/magnetic-lashes#cart`,
    metadata: { order_ref: orderRef, items: encodeItems(lines.map(({ p, qty }) => ({ id: p.id, qty }))), region },
    payment_intent_data: {
      description: `Roshy order ${orderRef}`,
      metadata: { order_ref: orderRef },
    },
  };
  return { params, subtotal, fee };
}
