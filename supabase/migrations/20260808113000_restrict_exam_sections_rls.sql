-- The application uses this table exclusively through server-side service_role
-- calls. Keep an explicit deny-all policy so the intent remains clear to the
-- Supabase security advisor and future maintainers.
create policy "server_only_exam_sections"
on public.exam_sections
as restrictive
for all
to public
using (false)
with check (false);
