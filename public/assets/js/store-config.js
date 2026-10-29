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
  // Customers pick "Ireland" or "Another country" in the cart.
  // fee = what they pay below the free-shipping threshold.
  // ⚠️ CHECK THESE TWO FEES — copy what you charge on Shopify today
  //    (Shopify Admin → Settings → Shipping and delivery).
  shipping: {
    IE: {
      label: "Ireland",
      checkoutName: "Standard delivery (Ireland)",
      fee: 3.99,
      freeOver: 30,
    },
    WORLD: {
      label: "Another country",
      checkoutName: "International delivery",
      fee: 7.99,
      freeOver: 45,
    },
  },

  // Countries Stripe will accept a shipping address for (besides Ireland).
  // Remove any country you don't want to ship to.
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
      available: true,
      maxPerOrder: 10,
      // Photos live in /public/images (square photos look best).
      images: [
        "/images/product-1.jpg",
        "/images/product-2.jpg",
        "/images/product-3.jpg",
        "/images/product-4.jpg",
        "/images/product-5.jpg",
        "/images/product-6.jpg",
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

// Returns the shipping fee (in euro) for a subtotal and region ("IE" | "WORLD").
export function shippingFor(subtotal, region) {
  const rule = STORE.shipping[region] || STORE.shipping.WORLD;
  if (subtotal <= 0) return 0;
  return subtotal >= rule.freeOver ? 0 : rule.fee;
}
