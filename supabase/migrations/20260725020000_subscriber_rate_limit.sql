alter table public.subscribers
  add column if not exists last_requested_at timestamptz not null default now();

create or replace function public.subscribe_user_rate_limited(request_user_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted boolean;
begin
  insert into public.subscribers (user_id, last_requested_at)
  values (request_user_id, now())
  on conflict (user_id) do update
    set last_requested_at = excluded.last_requested_at
    where public.subscribers.last_requested_at <= now() - interval '30 seconds'
  returning true into accepted;

  return coalesce(accepted, false);
end;
$$;

revoke all on function public.subscribe_user_rate_limited(bigint) from public, anon, authenticated;
grant execute on function public.subscribe_user_rate_limited(bigint) to service_role;
