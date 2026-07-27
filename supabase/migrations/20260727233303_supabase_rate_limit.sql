-- Durable, atomic request throttling for server-only API routes. This avoids
-- authentication outages when an external Redis provider is not configured.
create table if not exists public.request_rate_limits_internal (
  bucket text not null,
  rate_key text not null,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (bucket, rate_key)
);

alter table public.request_rate_limits_internal enable row level security;
revoke all privileges on table public.request_rate_limits_internal from anon, authenticated;
drop policy if exists server_only_no_direct_access on public.request_rate_limits_internal;
create policy server_only_no_direct_access
  on public.request_rate_limits_internal
  as restrictive for all to anon, authenticated
  using (false) with check (false);

create or replace function public.consume_request_rate_limit(
  p_bucket text,
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_attempts integer;
begin
  if p_bucket = '' or p_key = '' or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  insert into public.request_rate_limits_internal as target (bucket, rate_key, window_started_at, attempts, updated_at)
  values (p_bucket, p_key, v_window_start, 1, v_now)
  on conflict (bucket, rate_key) do update
    set window_started_at = excluded.window_started_at,
        attempts = case when target.window_started_at = excluded.window_started_at then target.attempts + 1 else 1 end,
        updated_at = v_now
  returning attempts into v_attempts;

  return query select
    v_attempts <= p_limit,
    greatest(p_limit - v_attempts, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_request_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_request_rate_limit(text, text, integer, integer) to service_role;
