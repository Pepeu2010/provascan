-- A collaborative section represents a teacher-owned delivery.  It must not
-- disappear as a side effect of the legacy whole-state replacement flow.
-- RESTRICT fails the enclosing transaction before any cascading deletion.
alter table public.exam_sections
  drop constraint if exists exam_sections_exam_id_fkey;

alter table public.exam_sections
  add constraint exam_sections_exam_id_fkey
  foreign key (exam_id)
  references public.exams(id)
  on delete restrict;
