# Urban Klay website

A finished, static 3D site: a crimson rose on a gold stem that blooms as the page loads and turns as you scroll, a live shop, a horizontal lookbook, the story, the founder, The Movement and a newsletter sign-up. No server, no build step, no monthly platform fee.

## Put it online (5 minutes, once)

1. Go to **app.netlify.com/drop** and sign in (free).
2. Drag the whole `urban-klay-site` folder onto the page. It's live straight away on a netlify.app link.
3. To use your own domain: Site settings → Domain management → Add domain, then follow the two DNS lines Netlify shows you.

Cloudflare Pages works the same way: upload the folder as-is. Keep the `_redirects` file; it makes the product links in your Instagram and Facebook Shop open the right product.

## What runs itself

- **Shop.** Products come straight from your Supabase `products` table, which the n8n Printful sync fills. Only rows marked `active` show. When a row has a Stripe `payment_link`, the product gets a Buy button (per size when each size has its own link); an `etsy_listing_id` adds a "View on Etsy" button. Until real products exist, the shop shows eight preview pieces drawn in your prints, labelled "Coming soon".
- **Everything else** is static and needs nothing.

## Your edits (all optional, all in `config.js`)

| Setting | What it does |
|---|---|
| `siteUrl` | Your domain once you have it. Also update the same address in `index.html` (canonical and og:image), `robots.txt` and `sitemap.xml`. |
| `etsyShop`, `faire`, `whatsapp` | Paste links to show them in the menu and footer. WhatsApp also adds an "Ask on WhatsApp" button to every product. |
| `checkoutWebhook` | The n8n shop checkout URL (ends in `/webhook/uk-shop-checkout`). Products without their own Stripe or Etsy link then get a Checkout button that opens Stripe. |
| `newsletterWebhook` | An n8n Webhook URL. Without it, sign-ups open an email to you. |
| `founderPhoto` | e.g. `assets/founder.jpg` to replace the gold rose in The Founder section. |
| `lookbook` | Put photos in `assets/lookbook/` and set each `src`, e.g. `assets/lookbook/01.jpg`. |

Then open `legal.html` and fill in the lines marked ✏ (shipping times, **returns policy**, size chart).

## Changing the design or 3D

Copy and layout: edit `index.html` and `css/style.css` directly. Only the files in `src/` (the 3D rose, shop and animations) need a rebuild: run `npm install` then `npm run build`, which regenerates `js/app.js`.

## Files

```
index.html        the site
legal.html        shipping, returns, size guide, privacy, terms
config.js         your settings
css/style.css     all styling
js/app.js         built JavaScript (Three.js, GSAP, Lenis bundled in, nothing loads from other sites except Google Fonts)
src/              source for js/app.js
supabase/public_catalog.sql   the read-only product feed (already installed on your database)
assets/           favicon, share image, lookbook photos
```

## Database note

The site reads products through one function, `public_catalog()`, which returns only active products and only shopper-facing columns (name, description, price, images, sizes, drop, payment link, Etsy id). Orders, customers, DMs and finance stay locked. The key in `config.js` is Supabase's public "publishable" key, which is designed to sit in web pages.
