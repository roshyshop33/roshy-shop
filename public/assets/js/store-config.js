// =====================================================================
//  ROSHY STORE SETTINGS — this is the file you edit to change the shop.
//  Prices, stock, shipping fees and the product text all live here.
//  The checkout reads prices from this file on the server, so customers
//  can never change a price in their browser.
//
//  After editing on GitHub, press "Commit changes" — Cloudflare
//  republishes the site automatically within about a minute.
// =====================================================================

export const STORE = {
  name: "Roshy",
  currency: "eur",          // lowercase 3-letter code, as Stripe expects
  currencySymbol: "€",
  pricesIncludeTax: true,   // shows "Tax included." under prices

  // ---- Shipping ------------------------------------------------------
  // Customers pick their zone in the cart: "Ireland", "Europe & UK" or
  // "Rest of world". Checkout then only accepts addresses in that zone.
  // fee = what they pay below the free-shipping threshold (the lashes'
  // price, not counting shipping). Northern Ireland counts as the UK.
  shipping: {
    IE: {
      label: "Ireland",
      checkoutName: "Standard post (Ireland)",
      fee: 3.5,
      freeOver: 30,
      // Optional upgrade offered at checkout: costs the standard fee plus
      // this amount (so €10.50, or €7.00 when standard shipping is free).
      registered: { checkoutName: "Registered post with tracking (Ireland)", extra: 7 },
    },
    EUROPE: {
      label: "Europe & UK",
      checkoutName: "Tracked delivery (Europe & UK)",
      fee: 4.5,
      freeOver: 45,
    },
    WORLD: {
      label: "Rest of world",
      checkoutName: "International delivery",
      fee: 12,
      freeOver: 45,
    },
  },

  // Countries in the "Europe & UK" zone (Ireland has its own zone).
  europeCountries: [
    "AD","AL","AT","AX","BA","BE","BG","CH","CY","CZ","DE","DK","EE","ES","FI","FO","FR",
    "GB","GG","GI","GR","HR","HU","IM","IS","IT","JE","LI","LT","LU","LV","MC","MD","ME",
    "MK","MT","NL","NO","PL","PT","RO","RS","SE","SI","SJ","SK","SM","UA","VA","XK",
  ],

  // Every country Stripe will accept a shipping address for (besides Ireland).
  // Remove any country you don't want to ship to. Countries that aren't in
  // europeCountries above are in the "Rest of world" zone.
  worldwideCountries: [
    "AD","AE","AF","AG","AI","AL","AM","AO","AR","AT","AU","AW","AX","AZ",
    "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BW","BY","BZ",
    "CA","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CV","CW","CY","CZ",
    "DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET",
    "FI","FJ","FK","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GT","GU","GW","GY",
    "HK","HN","HR","HT","HU","ID","IL","IM","IN","IO","IQ","IS","IT",
    "JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KR","KW","KY","KZ",
    "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
    "MA","MC","MD","ME","MF","MG","MK","ML","MM","MN","MO","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
    "NA","NC","NE","NG","NI","NL","NO","NP","NR","NU","NZ","OM",
    "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PY","QA",
    "RE","RO","RS","RU","RW","SA","SB","SC","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SZ",
    "TA","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
    "UA","UG","US","UY","UZ","VA","VC","VE","VG","VN","VU","WF","WS","XK","YE","YT","ZA","ZM","ZW",
  ],

  // ---- Sale ----------------------------------------------------------
  // Between starts and ends, products with a salePrice sell at that price,
  // with their normal price crossed out (EU rules: the "was" price must be
  // the lowest price of the last 30 days). Times are UTC (= Irish time in winter).
  // Set sale to null when there is no sale.
  sale: {
    name: "Black Friday",
    percentOff: 15,
    starts: "2026-11-27T00:00:00Z",
    ends: "2026-12-01T00:00:00Z",
  },

  // ---- Products ------------------------------------------------------
  // Prices are in euro. compareAtPrice is the crossed-out "was" price
  // (set it to null to hide it). Set available to false to show "Sold out".
  products: [
    {
      id: "magnetic-lashes",
      sku: "38",
      name: "Roshy Magnetic Lashes",
      shortName: "Magnetic Lashes",
      url: "/products/magnetic-lashes",
      price: 26.5,
      compareAtPrice: 28.5,
      salePrice: 22.5,        // used only while the sale above is running
      available: true,
      maxPerOrder: 10,
      // Photos live in /public/images (square photos look best).
      images: [
        "/images/product-1.jpg",
        "/images/product-7.jpg",
        "/images/product-2.jpg",
        "/images/product-4.jpg",
        "/images/product-8.jpg",
        "/images/product-10.jpg",
      ],
    },
  ],
};

// ---- Helpers shared by the website and the checkout (no need to edit) --
export function findProduct(id) {
  return STORE.products.find((p) => p.id === id) || null;
}

export function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

export function formatMoney(amount) {
  return STORE.currencySymbol + Number(amount).toFixed(2);
}

// Returns the running sale, or null.
export function activeSale(now = new Date()) {
  const s = STORE.sale;
  if (!s) return null;
  return now >= new Date(s.starts) && now < new Date(s.ends) ? s : null;
}

// The price a product sells at right now.
export function priceOf(p, now = new Date()) {
  return activeSale(now) && p.salePrice ? p.salePrice : p.price;
}

// The crossed-out "was" price right now, or null.
export function wasPriceOf(p, now = new Date()) {
  const was = activeSale(now) && p.salePrice ? p.price : p.compareAtPrice;
  return was && was > priceOf(p, now) ? was : null;
}

// Turns whatever the browser sent into a known zone ("IE", "EUROPE" or "WORLD").
export function normalizeRegion(region) {
  return Object.hasOwn(STORE.shipping, region) ? region : "IE";
}

// Countries checkout accepts for a zone.
export function countriesFor(region) {
  if (region === "IE") return ["IE"];
  const europe = STORE.worldwideCountries.filter((c) => STORE.europeCountries.includes(c));
  if (region === "EUROPE") return europe;
  return STORE.worldwideCountries.filter((c) => c !== "IE" && !europe.includes(c));
}

// Returns the shipping fee (in euro) for a subtotal and zone.
export function shippingFor(subtotal, region) {
  const rule = STORE.shipping[normalizeRegion(region)];
  if (subtotal <= 0) return 0;
  return subtotal >= rule.freeOver ? 0 : rule.fee;
}

// Returns the registered post fee (in euro), or null if the zone doesn't offer it.
export function registeredFor(subtotal, region) {
  const rule = STORE.shipping[normalizeRegion(region)];
  if (!rule.registered || subtotal <= 0) return null;
  return shippingFor(subtotal, region) + rule.registered.extra;
}
