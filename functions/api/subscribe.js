// POST /api/subscribe — newsletter sign-ups.
// Adds the email to your Resend audience (if RESEND_AUDIENCE_ID is set) and emails you.
import { json } from "../../lib/stripe.js";
import { sendEmail, splitEmails, esc, layout } from "../../lib/email.js";

export async function onRequestPost({ request, env }) {
  let d;
  try { d = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (d.company) return json({ ok: true });
  const email = String(d.email || "").trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email address." }, 400);
  if (!env.RESEND_API_KEY) return json({ error: "Sign-ups aren't open yet." }, 503);

  let saved = false;
  if (env.RESEND_AUDIENCE_ID) {
    const res = await fetch(`https://api.resend.com/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, unsubscribed: false }),
    }).catch(() => null);
    saved = !!res?.ok;
  }

  const owner = splitEmails(env.OWNER_EMAIL);
  if (owner.length) {
    try {
      await sendEmail(env, {
        to: owner,
        subject: `New newsletter subscriber: ${email}`,
        html: layout("New newsletter subscriber", `<p>${esc(email)} joined the Roshy list.${saved ? " They've been added to your Resend audience." : ""}</p>`),
        text: `${email} joined the Roshy list.`,
      });
      saved = true;
    } catch (e) {
      console.error("Subscribe email error:", e.message);
    }
  }
  return saved ? json({ ok: true }) : json({ error: "Sign-up failed, please try again." }, 502);
}
