// Sends email through Resend (https://resend.com). Free plan covers a small shop.

export function splitEmails(value) {
  return String(value || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export async function sendEmail(env, { to, subject, html, text, replyTo, bcc, idempotencyKey }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const recipients = Array.isArray(to) ? to : splitEmails(to);
  if (!recipients.length) throw new Error("No recipient email address");
  const headers = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey.slice(0, 256);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: env.EMAIL_FROM || "Roshy <onboarding@resend.dev>",
      to: recipients,
      bcc: bcc && bcc.length ? bcc : undefined,
      subject,
      html,
      text,
      reply_to: replyTo || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Email failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json().catch(() => ({}));
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function money(cents, currency = "eur") {
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase() }).format((cents || 0) / 100);
  } catch {
    return `€${((cents || 0) / 100).toFixed(2)}`;
  }
}

export function countryName(code, locale = "en") {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

// Shared wrapper so every email looks like it came from the same shop.
export function layout(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#f4ece3;font-family:Helvetica,Arial,sans-serif;color:#141211">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="font-family:Georgia,serif;font-size:28px;letter-spacing:4px;text-transform:uppercase;padding:8px 0 18px">Rosh<span style="color:#b08a45">y</span></div>
<div style="background:#ffffff;border-radius:14px;padding:28px 24px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px">${title}</h1>
${inner}
</div>
<p style="font-size:12px;color:#736a63;text-align:center;margin-top:18px">Roshy · roshyshop.com</p>
</div></body></html>`;
}
