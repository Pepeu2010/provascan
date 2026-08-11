-- Deletion is intentionally atomic: a collaborative exam must never be
-- partially removed from one teacher while remaining available to another.
create or replace function public.delete_collaborative_exam(p_exam_id text)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.exam_sections where exam_id = p_exam_id) then
    return false;
  end if;

  -- Corrections use RESTRICT; the remaining dependent rows cascade when the
  -- parent exam is removed after its collaborative sections are removed.
  delete from public.corrections where exam_id = p_exam_id;
  delete from public.exam_sections where exam_id = p_exam_id;
  delete from public.exams where id = p_exam_id;

  return found;
end;
$$;

revoke all on function public.delete_collaborative_exam(text) from public;
revoke all on function public.delete_collaborative_exam(text) from anon, authenticated;
grant execute on function public.delete_collaborative_exam(text) to service_role;
