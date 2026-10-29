// Small Stripe helpers for Cloudflare Pages Functions (no npm packages needed).

const API = "https://api.stripe.com";

// Turns { a: { b: [1, 2] } } into "a[b][0]=1&a[b][1]=2", the format Stripe expects.
export function toForm(obj, prefix = "", out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== null && typeof v === "object") toForm(v, `${name}[${i}]`, out);
        else out.append(`${name}[${i}]`, String(v));
      });
    } else if (typeof value === "object") {
      toForm(value, name, out);
    } else {
      out.append(name, String(value));
    }
  }
  return out;
}

export async function stripe(env, method, path, params) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  const init = {
    method,
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  };
  let url = API + path;
  if (params && method === "GET") {
    url += (url.includes("?") ? "&" : "?") + toForm(params).toString();
  } else if (params) {
    init.headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = toForm(params).toString();
  }
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Stripe error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Verifies the "Stripe-Signature" header so nobody can fake an order notification.
export async function verifyStripeSignature(payload, header, secret, toleranceSec = 300, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.create(null);
  const v1 = [];
  for (const piece of header.split(",")) {
    const [k, v] = piece.split("=", 2);
    if (k === "v1") v1.push(v);
    else if (k && v) parts[k.trim()] = v.trim();
  }
  const t = Number(parts.t);
  if (!t || !v1.length) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  return v1.some((sig) => timingSafeEqual(sig, expected));
}

export async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

// Human-friendly order number, e.g. RS-261029-K7QM
export function newOrderRef(date = new Date()) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const rand = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, "");
  return `RS-${ymd}-${rand}`;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
