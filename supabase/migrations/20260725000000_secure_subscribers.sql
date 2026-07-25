-- Subscriber IDs must only be written by trusted server-side code.
create table if not exists public.subscribers (
  user_id bigint primary key,
  created_at timestamptz not null default now()
);

revoke insert on table public.subscribers from anon;
