import { findProduct } from "../public/assets/js/store-config.js";
import { esc, money, countryName, layout } from "./email.js";

// Items are stored on the Stripe session as "magnetic-lashes:2,other-id:1"
export function encodeItems(lines) {
  return lines.map((l) => `${l.id}:${l.qty}`).join(",");
}

export function decodeItems(str) {
  return String(str || "")
    .split(",")
    .map((pair) => {
      const [id, qty] = pair.split(":");
      const p = findProduct(id);
      return { id, qty: Number(qty) || 0, name: p ? p.name : id, sku: p ? p.sku : "" };
    })
    .filter((l) => l.id && l.qty > 0);
}

// Pulls everything we need out of a Stripe Checkout Session,
// whichever Stripe API version the webhook is using.
export function normalizeOrder(session) {
  const cd = session.customer_details || {};
  const ship = session.collected_information?.shipping_details || session.shipping_details || session.shipping || {};
  const addr = ship.address || cd.address || {};
  return {
    ref: session.metadata?.order_ref || session.id,
    sessionId: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    created: new Date((session.created || Date.now() / 1000) * 1000),
    livemode: !!session.livemode,
    region: session.metadata?.region || "",
    items: decodeItems(session.metadata?.items),
    currency: session.currency || "eur",
    subtotal: session.amount_subtotal,
    shippingCost: session.shipping_cost?.amount_total ?? session.total_details?.amount_shipping ?? 0,
    discount: session.total_details?.amount_discount || 0,
    total: session.amount_total,
    email: cd.email || "",
    phone: cd.phone || "",
    name: ship.name || cd.name || "",
    address: {
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      city: addr.city || "",
      state: addr.state || "",
      postal_code: addr.postal_code || "",
      country: addr.country || "",
    },
  };
}

export function addressLines(o) {
  const a = o.address;
  return [
    o.name,
    a.line1,
    a.line2,
    [a.city, a.state].filter(Boolean).join(", "),
    a.postal_code,
    `${countryName(a.country, "en")} (${a.country})`,
  ].filter((s) => s && s.trim());
}

const dateStr = (d) => d.toISOString().replace("T", " ").slice(0, 16) + " UTC";

// ---------- Email to the fulfilment agent (English + Chinese, no prices) ----------
export function agentEmail(o) {
  const testTag = o.livemode ? "" : "[TEST 测试] ";
  const subject = `${testTag}New order 新订单 ${o.ref} — ${o.items.reduce((n, i) => n + i.qty, 0)} item(s) to ${o.address.country}`;
  const lines = addressLines(o);
  const zhCountry = countryName(o.address.country, "zh");
  const itemsRows = o.items
    .map((i) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${esc(i.name)}</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(i.sku)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-size:18px"><strong>${i.qty}</strong></td></tr>`)
    .join("");
  const html = layout(`New order 新订单 <span style="font-family:monospace">${esc(o.ref)}</span>`, `
<p style="margin:0 0 16px;color:#736a63">${esc(dateStr(o.created))}</p>
<h2 style="font-size:15px;margin:0 0 8px">Items 商品</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:22px">
<tr style="background:#f4ece3"><th style="padding:8px;text-align:left">Product 产品</th><th style="padding:8px;text-align:left">SKU</th><th style="padding:8px">Qty 数量</th></tr>
${itemsRows}
</table>
<h2 style="font-size:15px;margin:0 0 8px">Ship to 收件地址 (${esc(zhCountry)})</h2>
<div style="background:#f8f5f0;border:1px solid #e7ded3;border-radius:10px;padding:14px 16px;font-family:Menlo,Consolas,monospace;font-size:14px;line-height:1.6">
${lines.map(esc).join("<br>")}
</div>
<table style="font-size:14px;margin-top:14px">
<tr><td style="padding:4px 12px 4px 0;color:#736a63">Name 姓名</td><td><strong>${esc(o.name)}</strong></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#736a63">Phone 电话</td><td><strong>${esc(o.phone || "—")}</strong></td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#736a63">Address 1 地址1</td><td>${esc(o.address.line1)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#736a63">Address 2 地址2</td><td>${esc(o.address.line2 || "—")}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#736a63">City 城市</td><td>${esc(o.address.city)}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#736a63">County/State 州/郡</td><td>${esc(o.address.state || "—")}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#736a63">Postcode 邮编</td><td>${esc(o.address.postal_code || "—")}</td></tr>
<tr><td style="padding:4px 12px 4px 0;color:#736a63">Country 国家</td><td>${esc(countryName(o.address.country))} / ${esc(zhCountry)} (${esc(o.address.country)})</td></tr>
</table>
<p style="margin-top:22px;font-size:13px;color:#736a63">When shipped, please add the tracking number at roshyshop.com/admin/ship (or reply to this email).<br>发货后，请在 roshyshop.com/admin/ship 填写物流单号（或回复此邮件）。</p>`);
  const text = [
    `NEW ORDER 新订单 ${o.ref}`,
    dateStr(o.created),
    "",
    "ITEMS 商品:",
    ...o.items.map((i) => `- ${i.name} (SKU ${i.sku}) x ${i.qty}`),
    "",
    "SHIP TO 收件地址:",
    ...addressLines(o),
    `Phone 电话: ${o.phone || "-"}`,
  ].join("\n");
  return { subject, html, text };
}

// ---------- Email to the shop owner (full details with money) ----------
export function ownerEmail(o) {
  const testTag = o.livemode ? "" : "[TEST] ";
  const subject = `${testTag}New Roshy order ${o.ref} — ${money(o.total, o.currency)}`;
  const items = o.items.map((i) => `<li>${esc(i.name)} × ${i.qty}</li>`).join("");
  const dash = `https://dashboard.stripe.com/${o.livemode ? "" : "test/"}payments/${esc(o.paymentIntent || "")}`;
  const html = layout(`New order ${esc(o.ref)}`, `
<ul style="padding-left:18px;margin:0 0 16px">${items}</ul>
<table style="font-size:14px;width:100%;margin-bottom:18px">
<tr><td>Subtotal</td><td style="text-align:right">${money(o.subtotal, o.currency)}</td></tr>
${o.discount ? `<tr><td>Discount</td><td style="text-align:right">−${money(o.discount, o.currency)}</td></tr>` : ""}
<tr><td>Shipping</td><td style="text-align:right">${o.shippingCost ? money(o.shippingCost, o.currency) : "Free"}</td></tr>
<tr><td><strong>Total paid</strong></td><td style="text-align:right"><strong>${money(o.total, o.currency)}</strong></td></tr>
</table>
<p style="margin:0 0 6px"><strong>Customer:</strong> ${esc(o.name)} · ${esc(o.email)} · ${esc(o.phone || "no phone")}</p>
<p style="margin:0 0 16px"><strong>Ship to:</strong><br>${addressLines(o).map(esc).join("<br>")}</p>
<p style="margin:0"><a href="${dash}" style="color:#8c6a2f">Open in Stripe →</a></p>
<p style="font-size:13px;color:#736a63">Your agent has been emailed the shipping details.</p>`);
  const text = `New order ${o.ref}\nTotal ${money(o.total, o.currency)}\n${o.items.map((i) => `${i.name} x ${i.qty}`).join("\n")}\n\nShip to:\n${addressLines(o).join("\n")}\n${o.email} ${o.phone}\n\n${dash}`;
  return { subject, html, text };
}

// ---------- "Your order has shipped" email to the customer ----------
export function trackingUrl(carrier, number) {
  const n = encodeURIComponent(number);
  switch (carrier) {
    case "An Post": return `https://www.anpost.com/Post-Parcels/Track/History?item=${n}`;
    case "DHL": return `https://www.dhl.com/ie-en/home/tracking.html?tracking-id=${n}`;
    default: return `https://t.17track.net/en#nums=${n}`;
  }
}

export function shippedEmail({ ref, name, carrier, number, url }) {
  const first = String(name || "").split(" ")[0];
  const subject = `Your Roshy order ${ref} is on its way`;
  const html = layout("Your order is on its way", `
<p>Hi ${esc(first || "there")},</p>
<p>Good news — your order <strong>${esc(ref)}</strong> has shipped.</p>
<p style="background:#f8f5f0;border-radius:10px;padding:14px 16px">
Carrier: <strong>${esc(carrier)}</strong><br>Tracking number: <strong style="font-family:Menlo,Consolas,monospace">${esc(number)}</strong></p>
<p><a href="${esc(url)}" style="display:inline-block;background:#141211;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px">Track your parcel</a></p>
<p style="font-size:14px;color:#736a63">Tracking can take 1–3 days to show updates. While you wait, here's <a href="https://roshyshop.com/pages/how-to-use" style="color:#8c6a2f">how to apply your lashes</a>.</p>
<p>Thank you for shopping with Roshy!<br>— Rasha</p>`);
  const text = `Hi ${first || "there"},\n\nYour Roshy order ${ref} has shipped.\nCarrier: ${carrier}\nTracking number: ${number}\nTrack it: ${url}\n\nThank you for shopping with Roshy!\nRasha`;
  return { subject, html, text };
}
