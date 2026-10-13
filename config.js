/* ─────────────────────────────────────────────────────────────
   URBAN KLAY — SITE SETTINGS
   This is the only file you need to edit. Leave a value as ""
   to hide that link or feature.
   ───────────────────────────────────────────────────────────── */
window.UK_CONFIG = {
  // Your live web address once it's deployed (used for sharing previews and SEO).
  siteUrl: "https://urbanklay.netlify.app",

  // Social and sales channels. Empty = hidden.
  instagram: "https://www.instagram.com/urbanklayofficial/",
  chefInstagram: "https://www.instagram.com/chefivanbekcic/",
  etsyShop: "",          // e.g. "https://www.etsy.com/shop/UrbanKlay"
  faire: "",             // e.g. "https://www.faire.com/brand/..."
  whatsapp: "",          // your number with country code, digits only, e.g. "14165551234"
  email: "hello@urbanklay.com",

  // Live catalogue. Products come from your Supabase "products" table
  // (only rows marked active). The n8n Printful sync fills that table.
  supabaseUrl: "https://dkvhpkdxdjopnikpzipg.supabase.co",
  supabaseKey: "sb_publishable_woYzPD3VJUjHZtakND8URg_sSWu3l6j", // public key, safe to share

  // Shopify store. When both are set, products, cart and checkout come from Shopify
  // (Printful and Tapstitch then fulfil orders automatically). Empty = use Supabase below.
  shopifyDomain: "urban-klay.myshopify.com",
  shopifyToken: "a1d757558301ebb52a5b212eb0f03357", // Storefront public access token, safe to share

  // Checkout for products without their own Stripe or Etsy link. Paste the n8n
  // shop checkout webhook URL (ends in /webhook/uk-shop-checkout). Empty = "Order by DM".
  checkoutWebhook: "https://scooter-prominent-cloak.ngrok-free.dev/webhook/uk-shop-checkout",

  // Newsletter sign-ups. Paste an n8n Webhook URL here to save sign-ups
  // to your database. Empty = sign-ups open an email to you instead.
  newsletterWebhook: "",

  // Founder portrait for the "The Founder" section, e.g. "assets/founder.jpg". Empty = gold rose.
  founderPhoto: "",

  // Lookbook photos. Drop images in assets/lookbook/ and list them here.
  // Leave src "" to show the brand pattern instead of a photo.
  lookbook: [
    { src: "", caption: "Night — Gooderham, 1 a.m.", pattern: "hex" },
    { src: "", caption: "Day — Café steps, King St.", pattern: "bone" },
    { src: "", caption: "Movement — Union Station", pattern: "marble" },
    { src: "", caption: "Mood — Bay & Adelaide", pattern: "rose" },
    { src: "", caption: "Legacy — Distillery District", pattern: "splash" }
  ]
};
