-- Existing deployments grant EXECUTE broadly for historical functions.
-- The deletion routine is server-only and must not inherit that access.
revoke all on function public.delete_collaborative_exam(text) from public, anon, authenticated;
grant execute on function public.delete_collaborative_exam(text) to service_role;
