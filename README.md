# Roshy shop — setup guide

Your new shop replaces Shopify with free hosting (Cloudflare Pages) and Stripe checkout.

**Monthly cost: €0.** You only pay Stripe's fee on each sale, plus your Namecheap domain renewal, which you already pay.

| What | Service | Cost |
|---|---|---|
| Website hosting | Cloudflare Pages | Free |
| Storing the website files | GitHub | Free |
| Payments: cards, Apple Pay, Google Pay, PayPal, Klarna, Revolut Pay | Stripe | No monthly fee, a % per sale (see stripe.com/ie/pricing) |
| Order emails to you and your agent | Resend | Free plan |
| Domain | Namecheap (or Cloudflare Registrar) | ~€10–15 a year, unchanged |

Follow the steps in order. Expect about 2–3 hours in total, and keep Shopify running until the last step.

---

## What's in this folder

```
public/                     ← the website itself
  assets/js/store-config.js ← ⭐ THE FILE YOU EDIT: price, stock, shipping fees
  images/                   ← your photos and logo (from Shopify)
  products/, pages/, policies/  ← the pages (same web addresses as on Shopify)
  admin/ship.html           ← page where you or your agent enter tracking numbers
functions/api/              ← checkout, order emails, contact form (no need to touch)
lib/                        ← helpers for the above (no need to touch)
```

---

## Step 0 — Before you start (5 minutes)

1. **Photos:** ✅ done. Your Shopify photos and logo are already in `public/images/`.
2. **Fill in the yellow [placeholders]:** search the files for `mark class="todo"`. They're in:
   - `policies/shipping-policy.html`: dispatch and delivery times
   - `policies/refund-policy.html`, `terms-of-service.html`, `privacy-policy.html`: your business name and postal address. EU consumer law requires a trader's address on the site.
3. **Shipping fees:** in `store-config.js`, set `fee` for Ireland and worldwide to what you charge on Shopify today (I used €3.99 and €7.99 as placeholders). The free-shipping thresholds are already set to €30 and €45.
4. **Contact email:** the policies use `hello@roshyshop.com`. Step 7 shows how to forward it to your normal inbox for free, or you can replace it with your own address.

---

## Step 1 — Stripe (payments)

1. Sign up at **stripe.com** as a business in **Ireland**, then complete the identity and bank details so payouts reach your Irish account.
2. **Payment methods:** go to **Settings → Payments → Payment methods** and turn on Cards, Apple Pay, Google Pay, **PayPal**, **Klarna** and **Revolut Pay**. Stripe shows each method only to customers who can use it. If PayPal isn't offered for your account, tell me and I'll add a separate PayPal button.
3. **Branding:** go to **Settings → Branding**, upload your logo and set the accent colour to `#b08a45` (gold). This makes the checkout page look like your shop.
4. **Customer receipts:** go to **Settings → Customer emails** and turn on **Successful payments**. Customers then get a receipt automatically.
5. **Give your agent read-only access:** go to **Settings → Team and security → Add member**, enter his email and choose the **View only** role. He can see every order, including name, address and phone, but he can't refund or change anything. He also gets an email for every order (Step 3).
6. **Discount codes (optional):** go to **Product catalogue → Coupons**, create a coupon, then add a customer-facing *promotion code* such as `WELCOME10`. Customers type it at checkout.

You'll need two keys later, from **Developers → API keys**: the test key (`sk_test_…`) and later the live key (`sk_live_…`).

## Step 2 — GitHub (stores your website files)

1. Create a free account at **github.com**.
2. Click **+ → New repository**, name it `roshy-shop`, choose **Private**, and click **Create**.
3. Click **uploading an existing file**. Drag in **everything inside** this folder (`public`, `functions`, `lib`, `README.md`), not the folder itself, then click **Commit changes**.

## Step 3 — Resend (order emails to you and your agent)

1. Create a free account at **resend.com**.
2. Go to **Domains → Add domain** and enter `roshyshop.com`. Resend shows a few DNS records.
3. In **Namecheap**, go to **Domain List → Manage → Advanced DNS** and add those records exactly as shown. They don't affect your Shopify site. Click **Verify** in Resend; it can take up to an hour.
4. Go to **API Keys → Create API key** and copy it (`re_…`).

## Step 4 — Cloudflare Pages (hosting)

1. Create a free account at **cloudflare.com**.
2. Go to **Workers & Pages → Create → Pages → Connect to Git**, pick the `roshy-shop` repository and use these settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **`public`**
3. Click **Save and Deploy**. Your site goes live at an address like `roshy-shop.pages.dev`.
4. Go to **Settings → Variables and Secrets** and add each of these as a **Secret**:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` for now (switch to live in Step 6) |
| `STRIPE_WEBHOOK_SECRET` | from Step 5 |
| `RESEND_API_KEY` | `re_…` |
| `EMAIL_FROM` | `Roshy <orders@roshyshop.com>` |
| `OWNER_EMAIL` | your email address |
| `AGENT_EMAIL` | your agent's email. For more than one, separate with commas |
| `ADMIN_PASSWORD` | a long password for the tracking page, for example 4 random words |

5. Go to **Deployments → ⋯ → Retry deployment** so the site picks up the new settings.

## Step 5 — Connect Stripe to the site (order notifications)

1. In Stripe (test mode), go to **Developers → Webhooks → Add endpoint**.
2. Set the URL to `https://roshy-shop.pages.dev/api/stripe-webhook`, using your own pages.dev address.
3. Select the events **`checkout.session.completed`** and **`checkout.session.async_payment_succeeded`**.
4. Copy the **Signing secret** (`whsec_…`) into Cloudflare as `STRIPE_WEBHOOK_SECRET`, then redeploy.

**Test it:** open your pages.dev site, add the lashes to the cart, check out with the test card **4242 4242 4242 4242** (any future date, any CVC) and a real-looking address. Within a minute:
- you get a **"New Roshy order"** email with the total
- your agent gets a **"New order 新订单"** email in English and Chinese, with the name, address and phone and no prices
- the payment appears in Stripe with the order number (e.g. `RS-261029-K7QM`)

## Step 6 — Go live with payments

1. In Stripe, switch off **Test mode**, then repeat Step 5 in live mode. Live mode has its own webhook and its own `whsec_…`.
2. In Cloudflare, replace `STRIPE_SECRET_KEY` with `sk_live_…` and `STRIPE_WEBHOOK_SECRET` with the live `whsec_…`, then redeploy.
3. Place one real order yourself and refund it from Stripe to confirm everything works.

## Step 7 — Move the domain from Shopify (last step)

1. In Cloudflare, go to **Add a domain**, enter `roshyshop.com` and choose the **Free** plan. Cloudflare copies your existing DNS records, so Shopify keeps working during the switch.
2. In **Namecheap**, go to **Domain List → Manage → Nameservers → Custom DNS** and paste the two nameservers Cloudflare gives you. The change takes effect within a few hours.
3. Once Cloudflare shows the domain as **Active**, go to **Workers & Pages → roshy-shop → Custom domains**. Add `roshyshop.com`, then add `www.roshyshop.com`, and accept the DNS changes it suggests. This replaces the old Shopify records.
4. Update the Stripe live webhook URL to `https://roshyshop.com/api/stripe-webhook`.
5. **Email forwarding (optional):** in Cloudflare, go to **Email → Email Routing** and forward `hello@roshyshop.com` to your Gmail or other inbox. Skip this if you already have email on roshyshop.com, because those records were copied in step 1.
6. Old Shopify links such as `/collections/all` and the blog redirect automatically.

## Step 8 — Close Shopify

1. **Download your records first.** Export **Orders → Export**, Customers, and your product photos. Keep the order history for at least 6 years for Revenue. If you use a reviews app, export the reviews as CSV; I can add them to the product page.
2. Go to **Settings → Domains** and remove roshyshop.com.
3. Uninstall paid apps, then go to **Settings → Plan → Deactivate store**.

---

## Day-to-day

**A new order comes in:** you and your agent get emails automatically. The full details are always in Stripe under **Payments**; the Stripe phone app works too.

**Sending tracking to the customer:** you or your agent open **roshyshop.com/admin/ship**, enter the password, the order number, the carrier and the tracking number. The customer is emailed a tracking link and you get a copy. The tracking number is also saved on the payment in Stripe.

**Refunds:** in Stripe, open the payment and click **Refund**.

**Changing the price, the "was" price, or marking the product sold out:** in GitHub, open `public/assets/js/store-config.js`, click the ✏️ pencil, edit and **Commit changes**. The site updates in about a minute. To show the product as sold out, set `available: false`.

**Changing page text:** edit the matching `.html` file the same way.

**Newsletter sign-ups** are emailed to you. To collect them in a list, create an Audience in Resend and add its ID as `RESEND_AUDIENCE_ID`.

## Good to know
- Your agent's emails are in English and Chinese and contain only what he needs to ship: no prices or customer email. Some Chinese providers such as QQ and 163 filter foreign mail, so ask him to check spam once and mark it "not spam".
- The privacy policy mentions that shipping details go to a fulfilment partner in China. Keep that wording, because it's required under GDPR.
- The policies are a solid starting template, not legal advice. Have them checked if you're unsure.

---

## Moving the domain into your own account

roshyshop.com is currently in your partner's Namecheap account. There are two simple ways to move it into yours:

**A. Namecheap "push" (recommended now).** It's free, takes minutes, and keeps the same renewal date.
1. Create a free account at **namecheap.com**.
2. Your partner goes to **Domain List → roshyshop.com → Manage → Sharing & Transfer → Change Ownership** (Namecheap also calls this a "domain push"), and enters your Namecheap username.
3. You accept it in your account, and the domain is now yours, including DNS and renewal.

**B. Cloudflare Registrar (later, optional).** Renewals are charged at cost, which is usually the cheapest option for a .com, and you'd have the domain, hosting and DNS all in one Cloudflare account.
- A domain can only move registrar 60 days after it was registered or last transferred, and the move includes paying for one extra year.
- Do it from **Cloudflare → Domain Registration → Transfer Domains**.

Doing **A before Step 3** is easiest. You can then add the Resend records and change nameservers yourself, without needing your partner's login.
