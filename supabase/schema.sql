-- NOVA SELECT 数据库初始化脚本
-- 在 Supabase Dashboard > SQL Editor 中完整执行一次。

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  category text not null default '日常好物',
  price numeric(12, 2) not null default 0 check (price >= 0),
  description text not null default '',
  image_url text,
  label text not null default '',
  sold_count integer not null default 0 check (sold_count >= 0),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  contact text not null check (char_length(contact) between 1 and 120),
  email text not null default '',
  shipping_address text not null default '',
  note text not null default '',
  status text not null default '待确认'
    check (status in ('待确认', '已联系', '已确认', '配货中', '已完成', '已取消')),
  reference_total numeric(12, 2) not null default 0 check (reference_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  price_snapshot numeric(12, 2) not null check (price_snapshot >= 0),
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now()
);

create index if not exists products_public_sort_idx
  on public.products (is_active, sort_order, created_at desc);
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);
create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- 自动将指定邮箱加入管理员表。
-- 管理员登录邮箱：1957771122@qq.com
create or replace function public.register_nova_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = '1957771122@qq.com' then
    insert into public.admin_users (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists register_nova_admin_after_user_change on auth.users;
create trigger register_nova_admin_after_user_change
after insert or update of email on auth.users
for each row execute procedure public.register_nova_admin();

-- 如果管理员账号已经在 Auth 中创建，则立即登记。
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = '1957771122@qq.com'
on conflict (user_id) do nothing;

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Admin can read own role" on public.admin_users;
create policy "Admin can read own role"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admin can insert products" on public.products;
create policy "Admin can insert products"
on public.products
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admin can update products" on public.products;
create policy "Admin can update products"
on public.products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can delete products" on public.products;
create policy "Admin can delete products"
on public.products
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admin can read orders" on public.orders;
create policy "Admin can read orders"
on public.orders
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admin can update orders" on public.orders;
create policy "Admin can update orders"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin can read order items" on public.order_items;
create policy "Admin can read order items"
on public.order_items
for select
to authenticated
using (public.is_admin());

-- 商品图片使用公开 bucket，只有管理员可以上传、修改和删除。
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Admin can upload product images" on storage.objects;
create policy "Admin can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin can update product images" on storage.objects;
create policy "Admin can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admin can delete product images" on storage.objects;
create policy "Admin can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- 仅在商品表为空时写入初始演示商品。
insert into public.products
  (name, category, price, label, sold_count, is_featured, sort_order)
select *
from (
  values
    ('Mori Air 轻盈便携风扇', '日常好物', 29.00, 'NEW', 18, true, 10),
    ('Orbit Mini 桌面氛围灯', '家居灵感', 49.00, 'HOT', 26, true, 20),
    ('Mellow 软壳收纳包', '出行装备', 36.00, 'PICK', 11, true, 30),
    ('Daily Loop 随行水杯', '日常好物', 32.00, '', 43, false, 40),
    ('Nook 折叠阅读灯', '家居灵感', 46.00, '', 8, false, 50),
    ('Cloud Nine 午休眼罩', '日常好物', 22.00, '', 31, false, 60),
    ('Carryall 机能托特包', '出行装备', 58.00, 'LIMITED', 19, false, 70),
    ('Mori Click 机械钥匙扣', '小物收藏', 18.00, '', 52, false, 80),
    ('Sundaze 旅行香氛片', '家居灵感', 16.00, '', 37, false, 90),
    ('Tide 轻量防水收纳袋', '出行装备', 25.00, '', 12, false, 100),
    ('NOVA Note 便携备忘本', '小物收藏', 14.00, 'NEW', 44, false, 110),
    ('Soft Form 冰箱磁贴套装', '小物收藏', 12.00, '', 61, false, 120)
) as seed(name, category, price, label, sold_count, is_featured, sort_order)
where not exists (select 1 from public.products);
