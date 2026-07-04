"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const highlights = [
  "Acesso seguro por perfil",
  "Planilha protegida no servidor",
  "Fluxo rapido para primeiro acesso",
];

export function LoginForm() {
  const router = useRouter();
  const { loginTeacher, session } = useAppData();
  const [email, setEmail] = useState(session?.email ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(session?.remember));
  const [showRecovery, setShowRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setIsSubmitting(true);
    const result = await loginTeacher({ email, password, remember });
    setIsSubmitting(false);
    setMessage(result.message);

    if (result.ok) {
      const redirect =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
      router.push(redirect || result.redirectTo || "/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 lg:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(8,15,28,0.58),transparent)]" />

      <div className="absolute right-4 top-4 z-20 lg:right-6 lg:top-6">
        <ThemeSwitcher compact />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1480px] items-center justify-center">
        <div className="w-full max-w-xl">
          <Card className="relative overflow-hidden p-4 sm:p-5">
            <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.7),transparent)]" />

            <div className="login-hero-panel rounded-[28px] border border-[var(--border)] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <ProvaScanLogo size="md" />
                  <p className="mt-5 text-sm text-[var(--muted-foreground)]">Professor, faca seu login</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--foreground)] sm:text-[2.3rem]">
                    Acesse o painel ProvaScan
                  </h1>
                </div>
                <Badge tone="neutral" className="hidden sm:inline-flex">Login seguro</Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_82%,transparent)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Acesso</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">Professor e equipe autorizada</p>
                </div>
                <div className="rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_82%,transparent)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Fluxo</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">Entrar, revisar, corrigir e salvar</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]"
                >
                  <Sparkles className="size-3.5 text-[var(--accent)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <form
              className="login-form-panel mt-4 grid gap-4 rounded-[28px] border border-[var(--border)] p-5 sm:p-6"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
              <AuthField
                icon={<Mail className="size-4 text-[var(--muted-foreground)]" />}
                label="Nome de acesso"
                type="text"
                autoComplete="username"
                placeholder="Digite o nome salvo na planilha"
                value={email}
                onChange={setEmail}
              />

              <AuthField
                icon={<KeyRound className="size-4 text-[var(--muted-foreground)]" />}
                label="Senha"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={setPassword}
              />

              <div className="mt-1 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <Checkbox
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  label="Manter acesso neste dispositivo"
                />
                <button
                  type="button"
                  onClick={() => setShowRecovery((previous) => !previous)}
                  className="text-left font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
                >
                  Como funciona a troca de senha?
                </button>
              </div>

              <Button size="lg" className="mt-2 h-[54px] w-full rounded-[20px]" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            {message ? (
              <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_64%,transparent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                {message}
              </div>
            ) : null}

            {showRecovery ? (
              <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-[var(--accent)]" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Primeiro acesso e troca obrigatoria</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      O acesso depende da aba `usuarios` no Google Sheets. Se `trocar_senha = SIM`, o usuario sera
                      redirecionado para definir uma nova senha antes de entrar no painel.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AuthField({
  autoComplete,
  icon,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  autoComplete: string;
  icon: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
      {label}
      <div className="flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--border-strong)]">
        <span className="mr-3">{icon}</span>
        <input
          className="w-full bg-transparent outline-none"
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}
