-- Subscriber IDs must only be written by trusted server-side code.
revoke insert on table public.subscribers from anon;
