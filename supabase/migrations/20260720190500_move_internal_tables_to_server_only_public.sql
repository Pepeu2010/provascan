-- PostgREST só expõe o schema public por padrão. Estas tabelas continuam
-- inacessíveis a anon/authenticated por RLS e por privilégios revogados, mas
-- ficam utilizáveis pelo adaptador servidor com a service key.

alter table private.users rename to app_users;
alter table private.app_settings rename to app_settings_internal;
alter table private.operational_meta rename to operational_meta_internal;
alter table private.audit_log rename to audit_log_internal;
alter table private.legacy_sheet_archive rename to legacy_sheet_archive_internal;
alter table private.migration_runs rename to migration_runs_internal;

alter table private.app_users set schema public;
alter table private.app_settings_internal set schema public;
alter table private.operational_meta_internal set schema public;
alter table private.audit_log_internal set schema public;
alter table private.legacy_sheet_archive_internal set schema public;
alter table private.migration_runs_internal set schema public;

revoke all on public.app_users, public.app_settings_internal, public.operational_meta_internal,
  public.audit_log_internal, public.legacy_sheet_archive_internal, public.migration_runs_internal
  from anon, authenticated;
