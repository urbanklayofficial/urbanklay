// Printful → Supabase catalogue sync for the Urban Klay website.
// Reads every product in your Printful store and writes it into public.products,
// which the website reads. Runs daily (pg_cron) and can be run on demand.
// Needs one secret: PRINTFUL_TOKEN (Printful → Developers → Private token, scope "Store products: read").
// Optional secret: PRINTFUL_STORE_ID (only if your token covers more than one store).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PF = "https://api.printful.com";
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "4XL", "5XL"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async () => {
  const env = Deno.env.toObject();
  const pfNames = Object.keys(env).filter((k) => /printful/i.test(k));
  const tokenName = ["PRINTFUL_TOKEN", "PRINTFUL_API_TOKEN", "PRINTFUL_API_KEY", "PRINTFUL_KEY"].find((k) => env[k]?.trim())
    || pfNames.find((k) => /token|key/i.test(k) && env[k]?.trim());
  const token = tokenName ? env[tokenName].trim() : "";
  if (!token) return json({ ok: false, error: "PRINTFUL_TOKEN secret is not set yet", printful_secrets_seen: pfNames }, 400);
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const pf = async (path: string, storeId?: string | number) => {
    const h = storeId ? { ...headers, "X-PF-Store-Id": String(storeId) } : headers;
    const r = await fetch(PF + path, { headers: h });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Printful ${r.status} on ${path}: ${body?.error?.message || body?.result || "unknown error"}`);
    return body;
  };

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false }
  });

  const report = { ok: true, stores: [] as unknown[], items: [] as unknown[], products: 0, inserted: 0, updated: 0, hidden: 0, errors: [] as string[] };
  try {
    // 1. Find the store(s): PRINTFUL_STORE_ID if set, otherwise every store this token can see
    const fixedStore = env.PRINTFUL_STORE_ID?.trim();
    const storeList: any[] = fixedStore ? [{ id: fixedStore }]
      : ((await pf("/stores").catch(() => ({ result: [] }))).result || []);
    const stores: (string | number | undefined)[] = storeList.map((s: any) => s.id);
    if (!stores.length) stores.push(undefined);
    report.stores = storeList.map((s: any) => ({ id: s.id, name: s.name, type: s.type }));

    // 2. List products in each store (paged, 100 at a time). Manual/API stores use /store/products;
    //    stores connected to a platform (Shopify, Etsy, Wix...) use /sync/products. Same response shape.
    const list: any[] = [];
    for (const store of stores) {
      for (const base of ["/store/products", "/sync/products"]) {
        try {
          for (let offset = 0; ; offset += 100) {
            const page = await pf(`${base}?limit=100&offset=${offset}`, store);
            list.push(...(page.result || []).map((it: any) => ({ ...it, _store: store, _base: base })));
            if (!page.paging || offset + 100 >= page.paging.total) break;
          }
          break;
        } catch (e) {
          if (base === "/sync/products") report.errors.push(`store ${store}: ${(e as Error).message}`);
        }
      }
    }

    const seen: number[] = [];
    for (const item of list) {
      try {
        const { result } = await pf(`${item._base}/${item.id}`, item._store);
        const sp = result.sync_product;
        const variants: any[] = (result.sync_variants || []).filter((v: any) => !v.is_ignored);
        seen.push(sp.id);

        const sizes = [...new Set(variants.map((v) => v.size || (v.name || "").split(" / ").pop()).filter(Boolean))]
          .sort((a, b) => {
            const i = SIZE_ORDER.indexOf(String(a).toUpperCase()), j = SIZE_ORDER.indexOf(String(b).toUpperCase());
            return i >= 0 && j >= 0 ? i - j : 0;
          });
        const colours = [...new Set(variants.map((v) => v.color).filter(Boolean))];
        const prices = variants.map((v) => Number(v.retail_price)).filter((n) => n > 0);
        const previews = [...new Set(variants.flatMap((v) =>
          (v.files || []).filter((f: any) => f.type === "preview").map((f: any) => f.preview_url || f.thumbnail_url)
        ).filter(Boolean))];
        const image = previews[0] || sp.thumbnail_url || variants[0]?.product?.image || null;

        // Printful often has a men's and a women's version under the same name; label them apart.
        const baseName: string = variants[0]?.product?.name || "";
        const fit = /\bwomen'?s\b/i.test(baseName) ? "Women's" : /\bmen'?s\b/i.test(baseName) ? "Men's" : "";
        const norm = (x = "") => x.replace(/['"\u2018\u2019\u201c\u201d]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
        const twin = list.filter((o) => norm(o.name) === norm(sp.name)).length > 1;
        const name = fit && twin && !/\b(wo)?men'?s\b/i.test(sp.name) ? `${sp.name} (${fit})` : sp.name;
        report.items.push({ id: sp.id, store: item._store, name, base: baseName });

        const row: Record<string, unknown> = {
          printful_sync_product_id: sp.id,
          name,
          price: prices.length ? Math.min(...prices) : null,
          currency: variants[0]?.currency || "CAD",
          provider: "printful",
          image_url: image,
          mockup_urls: previews.slice(0, 6),
          sizes,
          active: !sp.is_ignored && variants.length > 0 && prices.length > 0
        };
        if (!row.active) report.hidden++;

        const { data: existing } = await db.from("products").select("id, description")
          .eq("printful_sync_product_id", sp.id).limit(1).maybeSingle();
        if (existing) {
          // keep any description you've written; only fill it when empty
          if (!existing.description && colours.length) row.description = `Available in ${colours.join(", ")}.`;
          const { error } = await db.from("products").update(row).eq("id", existing.id);
          if (error) throw error;
          report.updated++;
        } else {
          row.sku = `printful-${sp.id}`;
          row.description = colours.length ? `Available in ${colours.join(", ")}.` : null;
          const { error } = await db.from("products").insert(row);
          if (error) throw error;
          report.inserted++;
        }
        report.products++;
      } catch (e) {
        report.errors.push(`${item.name || item.id}: ${(e as Error).message}`);
      }
    }

    // 3. Hide Printful products that were deleted from the Printful store
    if (list.length && !report.errors.some((e) => e.startsWith("store "))) {
      const { data: stale } = await db.from("products").select("id, printful_sync_product_id")
        .eq("provider", "printful").eq("active", true);
      const gone = (stale || []).filter((r: any) => !seen.includes(Number(r.printful_sync_product_id))).map((r: any) => r.id);
      if (gone.length) await db.from("products").update({ active: false }).in("id", gone);
    }
  } catch (e) {
    report.ok = false;
    report.errors.push((e as Error).message);
  }
  if (!report.products && report.errors.length) report.ok = false;
  return json(report, report.ok ? 200 : 502);
});
