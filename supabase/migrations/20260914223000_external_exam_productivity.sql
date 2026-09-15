alter table public.external_exam_templates
  add column if not exists grading_rules jsonb not null default '{"annulledPolicy":"full_credit","annulledQuestions":[],"defaultWeight":1,"maxScore":10,"multipleMarksPolicy":"review","questionWeights":{}}'::jsonb,
  add column if not exists is_favorite boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists last_used_at timestamptz;

alter table public.external_corrections
  add column if not exists grading_rules_snapshot jsonb not null default '{"annulledPolicy":"full_credit","annulledQuestions":[],"defaultWeight":1,"maxScore":10,"multipleMarksPolicy":"review","questionWeights":{}}'::jsonb,
  add column if not exists review_audit jsonb not null default '[]'::jsonb;

create index if not exists external_exam_templates_owner_library_idx
  on public.external_exam_templates(owner_id, is_favorite desc, last_used_at desc nulls last, updated_at desc)
  where archived_at is null;
