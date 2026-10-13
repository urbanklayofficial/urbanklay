import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createStage } from "./rose.js";
import { initShop } from "./shop.js";
import { patternPanel } from "./art.js";

gsap.registerPlugin(ScrollTrigger);
const cfg = window.UK_CONFIG || {};
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ── Smooth scroll ─────────────────────────────
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true });
  window.__lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
}
gsap.ticker.lagSmoothing(0);
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute("href");
  const target = id === "#top" ? 0 : $(id);
  if (target === null) return;
  e.preventDefault();
  closeMenu();
  lenis ? lenis.scrollTo(target, { offset: 0, duration: 1.6 }) : (target === 0 ? scrollTo({ top: 0 }) : target.scrollIntoView());
});

// ── Socials, links, year ──────────────────────
const socials = [
  ["Instagram", cfg.instagram], ["Etsy", cfg.etsyShop], ["Faire", cfg.faire],
  ["WhatsApp", cfg.whatsapp && `https://wa.me/${cfg.whatsapp}`], ["Email", cfg.email && `mailto:${cfg.email}`]
].filter(([, u]) => u);
$$("[data-socials]").forEach((el) => {
  el.innerHTML = socials.map(([n, u]) => `<a href="${u}" ${u.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${n}</a>`).join("");
});
const chef = $("[data-chef-link]");
if (cfg.chefInstagram) chef.href = cfg.chefInstagram; else chef.remove();
$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

// ── Mobile menu ───────────────────────────────
const burger = $("[data-burger]"), menu = $("[data-menu]");
function closeMenu() {
  menu.classList.remove("is-open");
  menu.setAttribute("aria-hidden", "true");
  burger.setAttribute("aria-expanded", "false");
}
burger.addEventListener("click", () => {
  const open = !menu.classList.contains("is-open");
  menu.classList.toggle("is-open", open);
  menu.setAttribute("aria-hidden", String(!open));
  burger.setAttribute("aria-expanded", String(open));
});

// ── Nav state ─────────────────────────────────
const nav = $("[data-nav]");
let lastY = 0;
function onScroll(y) {
  nav.classList.toggle("is-scrolled", y > 40);
  nav.classList.toggle("is-hidden", y > lastY && y > 400 && !menu.classList.contains("is-open"));
  lastY = y;
}
lenis ? lenis.on("scroll", ({ scroll }) => onScroll(scroll)) : addEventListener("scroll", () => onScroll(scrollY), { passive: true });

// ── Cursor + magnetic buttons ─────────────────
if (finePointer && !reduced) {
  const cursor = $(".cursor");
  const cx = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
  const cy = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
  addEventListener("pointermove", (e) => { cx(e.clientX); cy(e.clientY); cursor.style.visibility = "visible"; });
  document.addEventListener("pointerover", (e) => {
    cursor.classList.toggle("is-active", !!e.target.closest("a, button, .card, input"));
  });
  document.addEventListener("pointermove", (e) => {
    const m = e.target.closest(".magnetic");
    $$(".magnetic").forEach((el) => {
      if (el !== m) gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,.4)", overwrite: "auto" });
    });
    if (!m) return;
    const r = m.getBoundingClientRect();
    gsap.to(m, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: "power3", overwrite: "auto" });
  });
} else {
  $(".cursor").remove();
}

// ── 3D stage ──────────────────────────────────
const canvas = $("#stage");
let stage = null;
try { stage = createStage(canvas, { reduced }); } catch (e) { console.warn("[Urban Klay] WebGL unavailable", e); }
if (!stage) {
  canvas.remove();
  $(".hero").insertAdjacentHTML("afterbegin", `<svg class="hero__fallback" viewBox="0 0 64 64" aria-hidden="true" style="position:absolute;right:6vw;top:16vh;width:min(40vw,420px);color:#8E1B2B;opacity:.6"><use href="#rose"/></svg>`);
}

if (cfg.founderPhoto) {
  $(".founder__frame").innerHTML = `<img src="${cfg.founderPhoto}" alt="Ivan Bekcic, founder of Urban Klay" style="width:100%;height:100%;object-fit:cover">`;
}

// ── Lookbook ──────────────────────────────────
const look = $("[data-lookbook]");
look.innerHTML = (cfg.lookbook || []).map((l, i) => `
  <figure class="look">
    <div class="look__img">${l.src ? `<img src="${l.src}" alt="${l.caption || "Urban Klay lookbook"}" loading="lazy">` : patternPanel(l.pattern, l.caption)}</div>
    <figcaption><span>${l.caption || ""}</span><b>${String(i + 1).padStart(2, "0")}</b></figcaption>
  </figure>`).join("");

// ── Story text split into words ───────────────
const story = $("[data-split]");
story.innerHTML = story.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");

// ── Intro ─────────────────────────────────────
function intro() {
  const loader = $(".loader");
  const count = $("[data-count]");
  const n = { v: 0 };
  const tl = gsap.timeline();
  tl.to(n, { v: 100, duration: reduced ? 0.2 : 1.6, ease: "power2.inOut", onUpdate: () => (count.textContent = Math.round(n.v)) })
    .to(loader, { clipPath: "inset(0 0 100% 0)", duration: reduced ? 0.2 : 1, ease: "expo.inOut" })
    .add(() => { loader.remove(); document.body.classList.remove("is-loading"); ScrollTrigger.refresh(); })
    .from(".hero__title .word", { yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.07, ease: "expo.out" }, "-=0.45")
    .from([".hero__eyebrow", ".hero__lede", ".hero__actions", ".hero__scroll", ".nav"], { opacity: 0, y: 24, duration: 1, stagger: 0.08, ease: "power3.out" }, "-=1")
    .from(".marquee", { opacity: 0, duration: 1 }, "<");
  if (stage) {
    tl.to(stage.state, { intro: 1, duration: 2.2, ease: "expo.out" }, 1.4)
      .to(stage.state, { bloom: 1, duration: 3.2, ease: "power2.out" }, 1.6);
  }
}

// ── Scroll choreography ───────────────────────
const mm = gsap.matchMedia();
mm.add({ desktop: "(min-width: 901px)", mobile: "(max-width: 900px)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
  const { desktop, reduce } = ctx.conditions;

  if (stage) {
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", endTrigger: ".story", end: "bottom bottom", scrub: 1.2 } })
      .to(stage.state, { spin: Math.PI * 1.25, y: desktop ? -0.4 : 0.6, scale: desktop ? 1.05 : 0.9, x: desktop ? 1.1 : 0, ease: "none" })
      .to(stage.state, { bloom: 0.72, fade: desktop ? 0.5 : 0.22, ease: "none" }, 0.5);
    gsap.fromTo(stage.state, { fade: desktop ? 0.5 : 0.22 }, { fade: 0, ease: "none", immediateRender: false, scrollTrigger: { trigger: ".shop", start: "top 80%", end: "top 20%", scrub: true } });
  }

  if (reduce) { $$(".story__text .w").forEach((w) => (w.style.opacity = 1)); return; }

  gsap.to(".hero__title", { yPercent: -18, opacity: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  gsap.to(".story__text .w", {
    opacity: 1, stagger: 0.1, ease: "none",
    scrollTrigger: { trigger: ".story__text", start: "top 78%", end: "bottom 45%", scrub: true }
  });

  gsap.from(".pillar", { y: 60, opacity: 0, duration: 1.1, stagger: 0.12, ease: "expo.out", scrollTrigger: { trigger: ".story__pillars", start: "top 85%" } });

  $$(".section-head .display, .founder .display, .movement .display, .join .display").forEach((el) => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  $$(".eyebrow").forEach((el) => {
    gsap.from(el, { x: -20, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 92%" } });
  });

  if (desktop) {
    const pin = $(".lookbook__pin");
    const intro = $(".lookbook__intro");
    const dist = () => Math.max(0, look.scrollWidth + intro.offsetWidth - innerWidth);
    const scroller = gsap.to([intro, look], {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: ".lookbook", pin, start: "top top", end: () => "+=" + dist(), scrub: 1, invalidateOnRefresh: true }
    });
    $$(".look__img > *").forEach((img) => {
      gsap.fromTo(img, { xPercent: -7 }, { xPercent: 7, ease: "none", scrollTrigger: { trigger: img.parentElement, containerAnimation: scroller, start: "left right", end: "right left", scrub: true } });
    });
  }

  gsap.from(".founder__frame", { clipPath: "inset(18% 18% 18% 18%)", scale: 1.08, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".founder", start: "top 75%" } });
  gsap.to(".founder__rose", { rotate: 18, yPercent: -10, ease: "none", scrollTrigger: { trigger: ".founder", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".founder__copy p, .founder__copy .link-arrow", { y: 30, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".founder__copy", start: "top 75%" } });

  gsap.from(".movement__lede, .help", { y: 40, opacity: 0, duration: 1.2, stagger: 0.15, ease: "expo.out", scrollTrigger: { trigger: ".movement__lede", start: "top 85%" } });
  gsap.from(".footer__logo", { yPercent: 60, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".footer", start: "top 90%" } });
});

// ── Shop ──────────────────────────────────────
initShop({
  cfg,
  onRendered(cards) {
    ScrollTrigger.refresh();
    if (reduced) return;
    gsap.set(cards, { opacity: 0, y: 60 });
    ScrollTrigger.batch(cards, {
      start: "top 92%", once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: "expo.out", overwrite: true })
    });
  }
});

// ── Newsletter ────────────────────────────────
const form = $("[data-join]"), msg = $("[data-join-msg]");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "That email doesn't look right."; return; }
  const btn = form.querySelector("button");
  btn.disabled = true;
  try {
    if (cfg.newsletterWebhook) {
      const r = await fetch(cfg.newsletterWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, source: "website", at: new Date().toISOString() }) });
      if (!r.ok) throw new Error(r.status);
      msg.textContent = "You're in. Watch for the next drop. 🌹";
      form.reset();
    } else if (cfg.email) {
      location.href = `mailto:${cfg.email}?subject=${encodeURIComponent("Add me to the Urban Klay list")}&body=${encodeURIComponent(email)}`;
      msg.textContent = "Opening your email app to confirm.";
    }
  } catch {
    msg.textContent = "Something went wrong. Please try again in a moment.";
  } finally { btn.disabled = false; }
});

// Start once fonts are ready so the headline doesn't jump.
Promise.race([document.fonts?.ready || Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]).then(intro);
