// Live catalogue: reads active products from Supabase (filled by the n8n
// Printful sync), falls back to a preview line so the page never looks empty.
import { garmentSVG, categoryOf } from "./art.js";

const CATEGORY_LABEL = { all: "All", hoodie: "Hoodies", crewneck: "Sweatshirts", tee: "Tees & Tops", jacket: "Jackets", jogger: "Pants", shoes: "Shoes", slides: "Slides", hat: "Hats" };
const KIND_ORDER = Object.keys(CATEGORY_LABEL);

// Without a photo yet, colour the drawn garment from the first listed colour.
function patternFor(text = "") {
  const c = (text.match(/Available in ([^,.]+)/i)?.[1] || "").toLowerCase();
  if (/white|bone|cream|apricot|beige|oat|khaki|yellow|pink/.test(c)) return "bone";
  if (/gr[ae]y|charcoal|chorcoal|cement|carbon/.test(c)) return "concrete";
  return "noir";
}

const PREVIEW = [
  { name: "Rose Emblem Hoodie", drop: "Legacy 01", pattern: "bone", desc: "Bone heavyweight fleece. One embroidered rose, left chest, close to the heart." },
  { name: "Rose Emblem Jogger", drop: "Legacy 01", pattern: "bone", desc: "The other half of the set. Tapered, soft, made to move." },
  { name: "Gold Hex Hoodie", drop: "Night Edition", pattern: "hex", desc: "Gold geometry on black. For the hours the city glows." },
  { name: "Gold Hex Jogger", drop: "Night Edition", pattern: "hex", desc: "All-over hexagon print. Pairs with the Gold Hex Hoodie." },
  { name: "Marble Crewneck", drop: "Mood Series", pattern: "marble", desc: "Ochre, slate and cream, poured like stone. No two read the same." },
  { name: "Marble Sweatpant", drop: "Mood Series", pattern: "marble", desc: "Marble texture, relaxed fit, finished cuffs." },
  { name: "Splash Slides", drop: "Movement", pattern: "splash", desc: "Pink and lemon splatter on black. Gold rose on the strap." },
  { name: "Legacy Rose Tee", drop: "Legacy 01", pattern: "noir", desc: "Clean black tee with the gold rose. Minimalism with depth." }
].map((p) => ({ ...p, kind: categoryOf(p.name), sizes: p.name.includes("Slides") ? ["6", "7", "8", "9", "10", "11", "12"] : ["XS", "S", "M", "L", "XL", "2XL"], preview: true }));

function money(amount, currency = "CAD") {
  if (amount == null || isNaN(amount)) return "";
  try {
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: (currency || "CAD").toUpperCase() }).format(amount);
  } catch { return `$${Number(amount).toFixed(2)}`; }
}

function asUrls(v) {
  if (!v) return [];
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { return [v]; } }
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.url || x?.mockup_url || x?.preview_url)).filter(Boolean);
  if (typeof v === "object") return Object.values(v).flat().map((x) => (typeof x === "string" ? x : x?.url)).filter(Boolean);
  return [];
}
function asSizes(v) {
  if (!v) return [];
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { return v.split(/[,\s]+/).filter(Boolean); } }
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.size || x?.name)).filter(Boolean);
  return Object.keys(v);
}
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "5XL"];
const sortSizes = (a) => [...new Set(a)].sort((x, y) => {
  const i = SIZE_ORDER.indexOf(x.toUpperCase()), j = SIZE_ORDER.indexOf(y.toUpperCase());
  if (i >= 0 && j >= 0) return i - j;
  return parseFloat(x) - parseFloat(y) || 0;
});

// Supabase may hold one row per variant; group them back into products.
function groupRows(rows) {
  const map = new Map();
  for (const r of rows) {
    const name = (r.name || "").replace(/\s*[-/|]\s*(XXS|XS|S|M|L|XL|2XL|XXL|3XL|4XL|5XL|\d+(\.\d)?)\s*$/i, "").trim();
    const key = r.printful_sync_product_id || name.toLowerCase();
    let p = map.get(key);
    if (!p) {
      p = { name, drop: r.drop_name || "", desc: r.description || "", kind: categoryOf(name), pattern: patternFor(r.description), images: [], sizes: [], prices: [], currency: r.currency || "CAD", links: {}, link: "", etsy: "", ids: [] };
      map.set(key, p);
    }
    if (r.id != null) p.ids.push(String(r.id));
    p.images.push(...[r.image_url, ...asUrls(r.mockup_urls)].filter(Boolean));
    const rowSizes = asSizes(r.sizes);
    const variantSize = (r.name || "").match(/(XXS|XS|S|M|L|XL|2XL|XXL|3XL|4XL|5XL)\s*$/i)?.[1];
    if (variantSize) rowSizes.push(variantSize);
    p.sizes.push(...rowSizes);
    if (r.price != null) p.prices.push(Number(r.price));
    if (r.payment_link) {
      p.link = p.link || r.payment_link;
      if (variantSize) p.links[variantSize.toUpperCase()] = r.payment_link;
    }
    if (r.etsy_listing_id && !p.etsy) p.etsy = `https://www.etsy.com/listing/${r.etsy_listing_id}`;
    if (!p.desc && r.description) p.desc = r.description;
  }
  return [...map.values()].map((p) => ({
    ...p,
    images: [...new Set(p.images)],
    sizes: sortSizes(p.sizes),
    price: p.prices.length ? Math.min(...p.prices) : null,
    priceRange: p.prices.length && Math.max(...p.prices) !== Math.min(...p.prices)
  }));
}

async function loadLive(cfg) {
  if (!cfg.supabaseUrl || !cfg.supabaseKey) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  const base = cfg.supabaseUrl.replace(/\/$/, "");
  const call = (fn) => fetch(`${base}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: cfg.supabaseKey, "Content-Type": "application/json" },
    body: "{}",
    signal: ctrl.signal
  });
  try {
    // storefront_products adds the product id (used by /products/{id} links); public_catalog is the older feed.
    let res = await call("storefront_products");
    if (!res.ok) res = await call("public_catalog");
    if (!res.ok) throw new Error(res.status);
    const rows = await res.json();
    return Array.isArray(rows) ? groupRows(rows) : null;
  } catch (e) {
    console.warn("[Urban Klay] live catalogue unavailable, showing preview pieces", e);
    return null;
  } finally { clearTimeout(timer); }
}

// Shopify Storefront API: products, cart and checkout (shopifyDomain + shopifyToken in config.js).
const SHOPIFY_API = "2026-10";
async function shopifyQuery(cfg, query, variables = {}, signal) {
  const r = await fetch(`https://${cfg.shopifyDomain}/api/${SHOPIFY_API}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": cfg.shopifyToken },
    body: JSON.stringify({ query, variables }),
    signal
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.errors?.length) throw new Error(data.errors?.[0]?.message || r.status);
  return data.data;
}

const PRODUCTS_QUERY = `query ($after: String) { products(first: 100, after: $after) {
  pageInfo { hasNextPage endCursor }
  nodes { id handle title description productType availableForSale isGiftCard
    images(first: 6) { nodes { url } }
    options { name values }
    variants(first: 100) { nodes { id availableForSale price { amount currencyCode } selectedOptions { name value } } } } } }`;

const isSize = (n = "") => /^size$/i.test(n.trim());
const isColour = (n = "") => /^colou?r$/i.test(n.trim());

async function loadShopify(cfg) {
  if (!cfg.shopifyDomain || !cfg.shopifyToken) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const nodes = [];
    let after = null;
    do {
      const { products } = await shopifyQuery(cfg, PRODUCTS_QUERY, { after }, ctrl.signal);
      nodes.push(...products.nodes);
      after = products.pageInfo.hasNextPage ? products.pageInfo.endCursor : null;
    } while (after && nodes.length < 500);
    return nodes.filter((n) => !n.isGiftCard && n.variants.nodes.length).map((n) => {
      const variants = n.variants.nodes.map((v) => ({
        id: v.id, available: v.availableForSale, price: Number(v.price.amount), currency: v.price.currencyCode,
        size: v.selectedOptions.find((o) => isSize(o.name))?.value || "",
        colour: v.selectedOptions.find((o) => isColour(o.name))?.value || ""
      }));
      const prices = variants.map((v) => v.price);
      const colours = n.options.find((o) => isColour(o.name))?.values || [];
      return {
        name: n.title, drop: "", desc: n.description || "",
        kind: categoryOf(`${n.title} ${n.productType || ""}`),
        pattern: patternFor(colours.length ? `Available in ${colours[0]}.` : ""),
        images: n.images.nodes.map((i) => i.url),
        sizes: sortSizes(n.options.find((o) => isSize(o.name))?.values || []),
        colours, variants, handle: n.handle, ids: [n.handle],
        price: Math.min(...prices), priceRange: Math.max(...prices) !== Math.min(...prices),
        currency: variants[0].currency, soldOut: !n.availableForSale, links: {}, link: "", etsy: ""
      };
    });
  } catch (e) {
    console.warn("[Urban Klay] Shopify catalogue unavailable", e);
    return null;
  } finally { clearTimeout(timer); }
}

async function shopifyCheckout(cfg, variantId) {
  const { cartCreate } = await shopifyQuery(cfg,
    `mutation ($lines: [CartLineInput!]!) { cartCreate(input: { lines: $lines }) { cart { checkoutUrl } userErrors { message } } }`,
    { lines: [{ merchandiseId: variantId, quantity: 1 }] });
  if (cartCreate.userErrors?.length || !cartCreate.cart?.checkoutUrl) throw new Error(cartCreate.userErrors?.[0]?.message || "no cart");
  return cartCreate.cart.checkoutUrl;
}

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u = "") => (/^https:\/\//i.test(u) ? esc(u) : "");

function igHandle(url = "") { return url.replace(/\/+$/, "").split("/").pop() || "urbanklayofficial"; }

export async function initShop({ cfg, onRendered }) {
  const grid = document.querySelector("[data-grid]");
  const filtersEl = document.querySelector("[data-filters]");
  const note = document.querySelector("[data-shop-note]");
  grid.innerHTML = Array.from({ length: 4 }, () => `<div class="skeleton"></div>`).join("");

  const shop = await loadShopify(cfg);
  const live = shop?.length ? shop : await loadLive(cfg);
  const products = live && live.length ? live : PREVIEW;
  if (products === PREVIEW) {
    note.hidden = false;
    note.textContent = "Preview pieces. Your live Printful catalogue appears here automatically once it syncs.";
  }

  const kinds = ["all", ...[...new Set(products.map((p) => p.kind))].sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b))];
  filtersEl.innerHTML = kinds.length > 2
    ? kinds.map((k, i) => `<button class="filter" role="tab" aria-selected="${i === 0}" data-kind="${k}">${CATEGORY_LABEL[k] || k}</button>`).join("")
    : "";

  function media(p, i = 0) {
    const src = p.images?.[i];
    return src
      ? `<img src="${safeUrl(src)}" alt="${esc(p.name)}" loading="lazy" decoding="async">`
      : garmentSVG(p.kind, p.pattern || "noir");
  }

  function render(kind = "all") {
    const list = products.filter((p) => kind === "all" || p.kind === kind);
    grid.innerHTML = list.length ? list.map((p) => `
      <article class="card" tabindex="0" data-i="${products.indexOf(p)}" aria-label="${esc(p.name)}">
        <div class="card__tilt">
          <div class="card__media">${media(p)}<div class="card__glare"></div>
            ${p.drop ? `<span class="card__tag">${esc(p.drop)}</span>` : ""}
            <span class="card__view">Quick view</span>
          </div>
          <div class="card__body">
            <div><h3 class="card__name">${esc(p.name)}</h3><div class="card__drop">${esc(CATEGORY_LABEL[p.kind] || "")}</div></div>
            <div class="card__price">${p.preview ? "Coming soon" : (p.priceRange ? "From " : "") + money(p.price, p.currency)}</div>
          </div>
        </div>
      </article>`).join("") : `<p class="grid__empty">New pieces are on the way.</p>`;
    bindCards();
    onRendered?.(grid.querySelectorAll(".card"));
  }

  filtersEl.addEventListener("click", (e) => {
    const b = e.target.closest(".filter");
    if (!b) return;
    filtersEl.querySelectorAll(".filter").forEach((x) => x.setAttribute("aria-selected", x === b));
    render(b.dataset.kind);
  });

  function bindCards() {
    grid.querySelectorAll(".card").forEach((card) => {
      const tilt = card.querySelector(".card__tilt");
      card.addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        tilt.style.transform = `rotateY(${(px - 0.5) * 10}deg) rotateX(${(0.5 - py) * 10}deg) translateZ(0)`;
        tilt.style.setProperty("--gx", `${px * 100}%`);
        tilt.style.setProperty("--gy", `${py * 100}%`);
      });
      card.addEventListener("pointerleave", () => { tilt.style.transform = ""; });
      const open = () => openQV(products[+card.dataset.i]);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  // ── Quick view ─────────────────────────────
  const qv = document.querySelector("[data-qv]");
  const $ = (s) => qv.querySelector(s);
  let lastFocus = null;
  function openQV(p) {
    lastFocus = document.activeElement;
    $("[data-qv-drop]").textContent = p.drop || "";
    $("[data-qv-title]").textContent = p.name;
    $("[data-qv-price]").textContent = p.preview ? "Coming soon" : (p.priceRange ? "From " : "") + money(p.price, p.currency);
    $("[data-qv-desc]").textContent = p.desc || "";
    const imgs = p.images?.length ? p.images.slice(0, 3) : [null];
    $("[data-qv-media]").innerHTML = imgs.map((_, i) => media(p, i)).join("");
    let size = "";
    const colours = p.preview ? [] : p.variants ? p.colours : coloursOf(p.desc);
    let colour = colours.length === 1 ? colours[0] : "";
    const coloursEl = $("[data-qv-colours]");
    coloursEl.innerHTML = colours.length > 1
      ? `<p class="qv__label">Colour <span data-qv-colour-name></span></p>` + colours.map((c) => `<button class="size size--colour" aria-pressed="false">${esc(c)}</button>`).join("")
      : "";
    const sizesEl = $("[data-qv-sizes]");
    sizesEl.innerHTML = (p.sizes || []).map((s) => `<button class="size" aria-pressed="false">${esc(s)}</button>`).join("");
    const actions = $("[data-qv-actions]");
    const handle = igHandle(cfg.instagram);

    function draw() {
      const pick = [colour, size].filter(Boolean).join(", size ");
      const msg = encodeURIComponent(`Hi Urban Klay, I'd like the ${p.name}${pick ? ` in ${pick}` : ""}.`);
      const buy = (size && p.links?.[size.toUpperCase()]) || p.link;
      let html = "";
      if (buy) html += `<a class="btn btn--gold" href="${safeUrl(buy)}" target="_blank" rel="noopener"><span>Buy now${size ? ` · ${size}` : ""}</span></a>`;
      if (p.etsy) html += `<a class="btn ${buy ? "btn--ghost" : "btn--gold"}" href="${esc(p.etsy)}" target="_blank" rel="noopener"><span>${buy ? "View on Etsy" : "Buy on Etsy"}</span></a>`;
      const canCheckout = !buy && !p.etsy && !p.preview && (p.variants || (cfg.checkoutWebhook && p.ids?.length));
      if (canCheckout) html += `<button class="btn btn--gold" type="button" data-checkout><span>Checkout${size ? ` · ${size}` : ""}</span></button>`;
      if (!buy && !p.etsy && !canCheckout) html += `<a class="btn btn--gold" href="https://ig.me/m/${handle}" target="_blank" rel="noopener"><span>${p.preview ? "DM to pre-order" : "Order by DM"}</span></a>`;
      if (canCheckout) html += `<p class="qv__msg" data-checkout-msg role="status"></p>`;
      if (cfg.whatsapp) html += `<a class="btn btn--ghost" href="https://wa.me/${cfg.whatsapp}?text=${msg}" target="_blank" rel="noopener"><span>Ask on WhatsApp</span></a>`;
      actions.innerHTML = html;
      actions.querySelector("[data-checkout]")?.addEventListener("click", checkout);
    }
    // Secure Stripe checkout created by the n8n shop (checkoutWebhook in config.js).
    async function checkout(e) {
      const btn = e.currentTarget, note = actions.querySelector("[data-checkout-msg]");
      if (colours.length > 1 && !colour) { note.textContent = "Pick a colour first."; return; }
      if (p.sizes?.length && !size) { note.textContent = "Pick a size first."; return; }
      btn.disabled = true; note.textContent = "Opening secure checkout…";
      if (p.variants) {
        const v = p.variants.find((x) => (!size || x.size === size) && (!colour || !x.colour || x.colour === colour));
        if (!v || !v.available) { btn.disabled = false; note.textContent = "That size or colour is sold out right now. Please pick another."; return; }
        try { location.href = await shopifyCheckout(cfg, v.id); }
        catch { btn.disabled = false; note.textContent = "Checkout didn't open. Please try again, or message us on Instagram."; }
        return;
      }
      try {
        const r = await fetch(cfg.checkoutWebhook, {
          method: "POST", headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
          body: JSON.stringify({ items: [{ product_id: Number(p.ids[0]), size: size || null, ...(colour ? { color: colour } : {}), qty: 1 }], source: "website" })
        });
        const data = await r.json().catch(() => ({}));
        if (r.status === 409) { btn.disabled = false; note.textContent = "That size or colour is sold out right now. Please pick another."; return; }
        if (!r.ok || !/^https:\/\//.test(data.url || "")) throw new Error(r.status);
        location.href = data.url;
      } catch {
        btn.disabled = false;
        note.textContent = "Checkout didn't open. Please try again, or message us on Instagram.";
      }
    }
    coloursEl.onclick = (e) => {
      const b = e.target.closest(".size");
      if (!b) return;
      coloursEl.querySelectorAll(".size").forEach((x) => x.setAttribute("aria-pressed", x === b));
      colour = b.textContent;
      draw();
    };
    sizesEl.onclick = (e) => {
      const b = e.target.closest(".size");
      if (!b) return;
      sizesEl.querySelectorAll(".size").forEach((x) => x.setAttribute("aria-pressed", x === b));
      size = b.textContent;
      draw();
    };
    draw();
    qv.classList.add("is-open");
    qv.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    window.__lenis?.stop();
    $(".qv__close").focus();
  }
  function closeQV() {
    qv.classList.remove("is-open");
    qv.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    window.__lenis?.start();
    lastFocus?.focus?.();
    if (deepLinked) { history.replaceState(null, "", "/#shop"); deepLinked = false; }
  }
  qv.querySelectorAll("[data-qv-close]").forEach((el) => el.addEventListener("click", closeQV));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && qv.classList.contains("is-open")) closeQV(); });

  render();

  // Product links from Instagram/Facebook Shop: /products/{id}?variant={variant}
  let deepLinked = false;
  const m = location.pathname.match(/\/products\/([^/?#]+)/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    const p = products.find((x) => x.ids?.includes(id));
    if (p) {
      deepLinked = true;
      document.getElementById("shop")?.scrollIntoView();
      openQV(p);
      const q = new URLSearchParams(location.search);
      const want = (q.get("size") || "").toUpperCase(), wantColour = (q.get("color") || "").toLowerCase();
      if (wantColour) [...qv.querySelectorAll("[data-qv-colours] .size")].find((b) => b.textContent.toLowerCase() === wantColour)?.click();
      [...qv.querySelectorAll("[data-qv-sizes] .size")].find((b) => b.textContent.toUpperCase() === want)?.click();
    }
  }
  orderNotice();
  return { products, live: products !== PREVIEW };
}

// Colours come from the "Available in A, B, C." line the catalogue sync writes.
function coloursOf(desc = "") {
  const m = desc.match(/Available in ([^.]+)\./i);
  return m ? [...new Set(m[1].split(/,\s*/).map((c) => c.trim()).filter(Boolean))] : [];
}

// Stripe sends shoppers back to /?order=thanks or /?order=cancelled.
function orderNotice() {
  const q = new URLSearchParams(location.search);
  const state = q.get("order");
  if (!/^(thanks|cancelled)$/.test(state || "")) return;
  const el = document.createElement("div");
  el.className = "order-note";
  el.setAttribute("role", "status");
  el.innerHTML = state === "thanks"
    ? `<strong>Thank you. Your order is in.</strong><span>A receipt is on its way to your email. We'll send tracking as soon as it ships.</span>`
    : `<strong>Checkout cancelled.</strong><span>Nothing was charged. Your piece is still here when you're ready.</span>`;
  el.insertAdjacentHTML("beforeend", `<button type="button" aria-label="Close">×</button>`);
  el.querySelector("button").onclick = () => el.remove();
  document.body.append(el);
  history.replaceState(null, "", location.pathname + location.hash);
  setTimeout(() => el.classList.add("is-in"), 50);
  setTimeout(() => el.remove(), 12000);
}
