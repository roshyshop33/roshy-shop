import { STORE, findProduct, formatMoney, shippingFor, registeredFor, normalizeRegion, activeSale, priceOf, wasPriceOf } from "./store-config.js";

// ---------------- Storage (fails safely in private mode) ----------------
const CART_KEY = "roshy_cart_v1";
const REGION_KEY = "roshy_region_v1";
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

let cart = sanitize(store.get(CART_KEY, []));
let region = normalizeRegion(store.get(REGION_KEY, "IE"));

function sanitize(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((l) => ({ id: String(l.id), qty: Math.floor(Number(l.qty)) || 0 }))
    .filter((l) => findProduct(l.id) && l.qty > 0)
    .map((l) => ({ ...l, qty: Math.min(l.qty, findProduct(l.id).maxPerOrder || 10) }));
}

function saveCart() {
  cart = sanitize(cart);
  store.set(CART_KEY, cart);
  renderCart();
}

function addToCart(id, qty) {
  const product = findProduct(id);
  if (!product || !product.available) return;
  const line = cart.find((l) => l.id === id);
  if (line) line.qty += qty; else cart.push({ id, qty });
  saveCart();
}

function setQty(id, qty) {
  const line = cart.find((l) => l.id === id);
  if (!line) return;
  line.qty = qty;
  if (line.qty <= 0) cart = cart.filter((l) => l.id !== id);
  saveCart();
}

function subtotal() {
  return cart.reduce((sum, l) => sum + priceOf(findProduct(l.id)) * l.qty, 0);
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  let el = $(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2200);
}

// ---------------- Prices shown on the page come from store-config.js ----------------
function hydratePrices() {
  $$("[data-product]").forEach((el) => {
    const p = findProduct(el.dataset.product);
    if (!p) return;
    const field = el.dataset.field;
    const was = wasPriceOf(p);
    if (field === "price") el.textContent = formatMoney(priceOf(p));
    if (field === "compare") {
      el.textContent = was ? formatMoney(was) : "";
      el.hidden = !was;
    }
    if (field === "badge") {
      const sale = activeSale();
      if (!p.available) { el.textContent = "Sold out"; el.className = "badge badge-muted"; el.hidden = false; }
      else if (was) {
        const pct = Math.round((1 - priceOf(p) / was) * 100);
        el.textContent = sale && p.salePrice ? `${sale.name} −${pct}%` : `Save ${pct}%`;
        el.classList.toggle("badge-sale", Boolean(sale && p.salePrice));
        el.hidden = false;
      } else el.hidden = true;
    }
  });
  $$("[data-add-to-cart], [data-buy-now]").forEach((btn) => {
    const p = findProduct(btn.dataset.addToCart || btn.dataset.buyNow);
    if (p && !p.available) { btn.disabled = true; if (btn.hasAttribute("data-add-to-cart")) btn.textContent = "Sold out"; }
  });
  $$("[data-free-ie]").forEach((el) => (el.textContent = formatMoney(STORE.shipping.IE.freeOver).replace(".00", "")));
  $$("[data-free-world]").forEach((el) => (el.textContent = formatMoney(STORE.shipping.WORLD.freeOver).replace(".00", "")));
  $$("[data-fee-ie]").forEach((el) => (el.textContent = formatMoney(STORE.shipping.IE.fee)));
  $$("[data-fee-world]").forEach((el) => (el.textContent = formatMoney(STORE.shipping.WORLD.fee)));
  $$("[data-free-europe]").forEach((el) => (el.textContent = formatMoney(STORE.shipping.EUROPE.freeOver).replace(".00", "")));
  $$("[data-fee-europe]").forEach((el) => (el.textContent = formatMoney(STORE.shipping.EUROPE.fee)));
}

// ---------------- Cart drawer ----------------
const drawer = () => $("#cart-drawer");
const overlay = () => $("#overlay");

function openCart() {
  renderCart();
  drawer().classList.add("open");
  overlay().classList.add("open");
  drawer().setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("#cart-close")?.focus(), 50);
}
function closeCart() {
  drawer().classList.remove("open");
  overlay().classList.remove("open");
  drawer().setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function renderCart() {
  const count = cart.reduce((n, l) => n + l.qty, 0);
  $$(".cart-count").forEach((el) => { el.textContent = count; el.dataset.count = count; });
  const body = $("#cart-lines");
  const foot = $("#cart-foot");
  if (!body) return;

  if (!cart.length) {
    body.innerHTML = `<div class="empty"><p>Your cart is empty.</p><a class="btn btn-outline" href="/products/magnetic-lashes">Shop lashes</a></div>`;
    foot.hidden = true;
    return;
  }
  foot.hidden = false;
  body.innerHTML = cart.map((l) => {
    const p = findProduct(l.id);
    return `<div class="cart-line">
      <img src="${p.images[0]}" alt="" width="76" height="76">
      <div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="unit">${formatMoney(priceOf(p))}</div>
        <div class="qty" style="margin-top:6px">
          <button type="button" data-dec="${p.id}" aria-label="Decrease quantity">−</button>
          <input type="number" min="0" max="${p.maxPerOrder}" value="${l.qty}" data-qty="${p.id}" aria-label="Quantity">
          <button type="button" data-inc="${p.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div style="text-align:right">
        <div>${formatMoney(priceOf(p) * l.qty)}</div>
        <button type="button" class="link-btn" data-remove="${p.id}">Remove</button>
      </div>
    </div>`;
  }).join("");

  const sub = subtotal();
  const ship = shippingFor(sub, region);
  const rule = STORE.shipping[region];
  const remaining = Math.max(0, rule.freeOver - sub);
  $("#free-ship").innerHTML = remaining > 0
    ? `Add <strong>${formatMoney(remaining)}</strong> more for free shipping to ${region === "WORLD" ? "your country" : rule.label}.<div class="progress"><span style="width:${Math.min(100, (sub / rule.freeOver) * 100)}%"></span></div>`
    : `You've unlocked <strong>free shipping</strong>.<div class="progress"><span style="width:100%"></span></div>`;
  const registered = registeredFor(sub, region);
  if (registered !== null) $("#free-ship").innerHTML += `<div style="margin-top:8px">Want tracking? Choose registered post at checkout (${formatMoney(registered)}).</div>`;
  $("#t-sub").textContent = formatMoney(sub);
  $("#t-ship").textContent = ship === 0 ? "Free" : formatMoney(ship);
  $("#t-total").textContent = formatMoney(sub + ship);
  $$('input[name="region"]').forEach((r) => (r.checked = r.value === region));
}

async function checkout(btn) {
  const err = $("#cart-error");
  err.textContent = "";
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = "Opening secure checkout…";
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, region }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || "Checkout is unavailable right now.");
    window.location.href = data.url;
  } catch (e) {
    err.textContent = e.message + " Please try again or contact us.";
    btn.disabled = false;
    btn.textContent = label;
  }
}

function bindCart() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button, a");
    if (!t) return;
    if (t.matches("[data-open-cart]")) { e.preventDefault(); openCart(); }
    else if (t.matches("#cart-close")) closeCart();
    else if (t.dataset.inc) { const l = cart.find((x) => x.id === t.dataset.inc); setQty(t.dataset.inc, l.qty + 1); }
    else if (t.dataset.dec) { const l = cart.find((x) => x.id === t.dataset.dec); setQty(t.dataset.dec, l.qty - 1); }
    else if (t.dataset.remove) setQty(t.dataset.remove, 0);
    else if (t.matches("#checkout-btn")) checkout(t);
  });
  document.addEventListener("change", (e) => {
    if (e.target.dataset.qty) setQty(e.target.dataset.qty, Math.max(0, Math.floor(Number(e.target.value)) || 0));
    if (e.target.name === "region") { region = normalizeRegion(e.target.value); store.set(REGION_KEY, region); renderCart(); }
  });
  overlay()?.addEventListener("click", closeCart);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer()?.classList.contains("open")) closeCart(); });
  if (location.hash === "#cart") openCart();
}

// ---------------- Product page ----------------
function bindProduct() {
  const main = $("#gallery-main");
  $$(".thumbs button").forEach((b) => b.addEventListener("click", () => {
    main.src = b.dataset.src;
    $$(".thumbs button").forEach((x) => x.setAttribute("aria-current", x === b ? "true" : "false"));
  }));

  const qtyInput = $("#qty");
  const clamp = (v) => Math.max(1, Math.min(10, Math.floor(Number(v)) || 1));
  $("#qty-dec")?.addEventListener("click", () => (qtyInput.value = clamp(+qtyInput.value - 1)));
  $("#qty-inc")?.addEventListener("click", () => (qtyInput.value = clamp(+qtyInput.value + 1)));
  qtyInput?.addEventListener("change", () => (qtyInput.value = clamp(qtyInput.value)));

  $$("[data-add-to-cart]").forEach((b) => b.addEventListener("click", () => {
    addToCart(b.dataset.addToCart, qtyInput ? clamp(qtyInput.value) : 1);
    openCart();
  }));
  $$("[data-buy-now]").forEach((b) => b.addEventListener("click", () => {
    addToCart(b.dataset.buyNow, qtyInput ? clamp(qtyInput.value) : 1);
    openCart();
    checkout($("#checkout-btn"));
  }));
}

// ---------------- Forms ----------------
function bindForm(selector, endpoint, okMsg) {
  $$(selector).forEach((form) => form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $(".form-status", form);
    const btn = $("button[type=submit]", form);
    const data = Object.fromEntries(new FormData(form).entries());
    btn.disabled = true;
    status.className = "form-status";
    status.textContent = "Sending…";
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "Something went wrong.");
      status.className = "form-status ok";
      status.textContent = okMsg;
      form.reset();
    } catch (err) {
      status.className = "form-status err";
      status.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }));
}

// ---------------- Success page ----------------
async function loadOrder() {
  const box = $("#order-summary");
  if (!box) return;
  cart = []; saveCart();
  const id = new URLSearchParams(location.search).get("session_id");
  if (!id) return;
  try {
    const res = await fetch("/api/order?session_id=" + encodeURIComponent(id));
    if (!res.ok) return;
    const o = await res.json();
    $("#order-ref").textContent = o.orderRef;
    $("#order-ref").hidden = false;
    if (o.email) $("#order-email").textContent = o.email;
    box.hidden = false;
  } catch { /* the thank-you message still shows */ }
}

// ---------------- Mobile menu ----------------
function bindMenu() {
  const btn = $(".menu-toggle");
  const nav = $(".mobile-nav");
  btn?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
}

// ---------------- Sale ribbon, corner ribbons and countdown ----------------
const ICON_TAG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>`;
const ICON_SPARKLE = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" opacity=".7"/></svg>`;

function countdown(ends) {
  const ms = Math.max(0, new Date(ends) - new Date());
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
  return d > 0 ? `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m` : `${h}h ${String(m).padStart(2, "0")}m`;
}

function renderSale() {
  const sale = activeSale();
  if (!sale) return;
  document.documentElement.classList.add("on-sale");
  const bar = document.createElement("a");
  bar.className = "sale-ribbon";
  bar.href = "/products/magnetic-lashes";
  bar.innerHTML = `<span class="sale-icon">${ICON_TAG}</span>
    <span class="sale-text"><strong>${sale.name}</strong><span class="sale-dot">✦</span>${sale.percentOff}% off all lashes</span>
    <span class="sale-icon">${ICON_SPARKLE}</span>
    <span class="sale-timer">Ends in <span data-countdown>${countdown(sale.ends)}</span></span>`;
  document.body.prepend(bar);
  setInterval(() => {
    if (!activeSale()) return location.reload();
    $$("[data-countdown]").forEach((el) => (el.textContent = countdown(sale.ends)));
  }, 30000);
  $$(".gallery-main, .spotlight > a").forEach((box) => {
    const r = document.createElement("span");
    r.className = "corner-ribbon";
    r.innerHTML = `<span>${sale.name}<strong>−${sale.percentOff}%</strong></span>`;
    box.classList.add("has-ribbon");
    box.append(r);
  });
}

renderSale();
hydratePrices();
bindMenu();
bindCart();
bindProduct();
bindForm("#contact-form", "/api/contact", "Thanks! Your message has been sent — we'll reply by email soon.");
bindForm(".newsletter-form", "/api/subscribe", "You're on the list — thank you!");
renderCart();
loadOrder();
