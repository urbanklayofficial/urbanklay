-- Read-only storefront feed for the website (installed on your database).
-- Returns only active products and only the columns a shopper should see.
-- Everything else (orders, customers, DMs, finance) stays locked.
create or replace function public.storefront_products()
returns table (
  id bigint, printful_sync_product_id bigint, sku text, name text, description text, price numeric, currency text,
  image_url text, mockup_urls jsonb, sizes jsonb, drop_name text, payment_link text, etsy_listing_id bigint, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.printful_sync_product_id, p.sku, p.name, p.description, p.price, p.currency,
         p.image_url, p.mockup_urls, p.sizes, p.drop_name, p.payment_link,
         p.etsy_listing_id, p.created_at
  from public.products p
  where p.active is true
  order by p.created_at desc
  limit 500;
$$;
revoke all on function public.storefront_products() from public;
grant execute on function public.storefront_products() to anon, authenticated;

-- public.public_catalog() is the earlier version (same columns minus id); the site falls back to it.
