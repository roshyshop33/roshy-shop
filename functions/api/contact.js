// POST /api/contact — sends contact-form messages to your inbox.
import { json } from "../../lib/stripe.js";
import { sendEmail, splitEmails, esc, layout } from "../../lib/email.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (d.company) return json({ ok: true }); // spam bot filled the hidden field

  const name = String(d.name || "").trim().slice(0, 120);
  const email = String(d.email || "").trim().slice(0, 200);
  const phone = String(d.phone || "").trim().slice(0, 40);
  const message = String(d.message || "").trim().slice(0, 5000);
  if (!EMAIL_RE.test(email)) return json({ error: "Please enter a valid email address." }, 400);
  if (message.length < 2) return json({ error: "Please write a message." }, 400);

  const owner = splitEmails(env.OWNER_EMAIL);
  if (!owner.length || !env.RESEND_API_KEY) return json({ error: "Messages can't be sent right now. Please message us on Instagram @roshy.shop3." }, 503);

  try {
    await sendEmail(env, {
      to: owner,
      replyTo: email,
      subject: `Website message from ${name || email}`,
      html: layout("New message from your website", `
<p><strong>Name:</strong> ${esc(name || "—")}<br><strong>Email:</strong> ${esc(email)}<br><strong>Phone:</strong> ${esc(phone || "—")}</p>
<div style="white-space:pre-wrap;background:#f8f5f0;border-radius:10px;padding:14px 16px">${esc(message)}</div>
<p style="font-size:13px;color:#736a63">Just press Reply to answer the customer.</p>`),
      text: `From: ${name} <${email}> ${phone}\n\n${message}`,
    });
    return json({ ok: true });
  } catch (e) {
    console.error("Contact error:", e.message);
    return json({ error: "Your message couldn't be sent. Please try again." }, 502);
  }
}
