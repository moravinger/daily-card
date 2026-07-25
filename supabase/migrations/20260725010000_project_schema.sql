create table if not exists public.cards (
  publish_date date primary key,
  image_url text not null,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards add column if not exists image_path text;
alter table public.cards add column if not exists created_at timestamptz not null default now();
alter table public.cards add column if not exists updated_at timestamptz not null default now();
create unique index if not exists cards_publish_date_key
  on public.cards (publish_date);

create table if not exists public.subscribers (
  user_id bigint primary key,
  created_at timestamptz not null default now()
);

alter table public.subscribers add column if not exists created_at timestamptz not null default now();
create unique index if not exists subscribers_user_id_key
  on public.subscribers (user_id);

alter table public.cards enable row level security;
alter table public.subscribers enable row level security;

revoke all on table public.cards from anon, authenticated;
grant select on table public.cards to anon, authenticated;
revoke all on table public.subscribers from anon, authenticated;

drop policy if exists "Public cards are readable" on public.cards;
create policy "Public cards are readable"
  on public.cards
  for select
  to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The application previously uploaded with the anon key. Revoke direct writes
-- even if a permissive legacy Storage policy still exists in the remote project.
revoke insert, update, delete on table storage.objects from anon, authenticated;
grant select on table storage.objects to anon, authenticated;

drop policy if exists "Public card images are readable" on storage.objects;
create policy "Public card images are readable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'card-images');
