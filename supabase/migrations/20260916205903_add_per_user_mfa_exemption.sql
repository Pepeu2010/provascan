-- Exceções de MFA são individuais, servidor-side e fechadas por padrão.
-- O campo não é exposto ao cliente nem ao formulário administrativo comum.
alter table public.app_users
  add column if not exists mfa_exempt boolean not null default false;
