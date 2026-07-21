-- A migração foi validada; não retemos o espelho nem metadados da planilha.
drop table if exists public.legacy_sheet_archive_internal;
drop table if exists public.migration_runs_internal;
