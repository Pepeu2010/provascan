"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const trustSignals = [
  ["Acesso governado", "Permissões definidas por perfil e sessão protegida no backend."],
  ["Sheets no servidor", "A planilha nunca é acessada diretamente pelo navegador."],
  ["Fluxo responsivo", "Experiência refinada no desktop, tablet e mobile."],
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
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.1),transparent_26%)]" />
      <div className="absolute right-4 top-4 z-20 lg:right-6 lg:top-6">
        <ThemeSwitcher />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1480px] gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.36, ease: "easeOut" }}
        >
          <Card className="hidden h-full overflow-hidden lg:block">
            <div className="flex h-full flex-col justify-between bg-[linear-gradient(180deg,var(--hero-bg),var(--hero-bg-end))] p-8 text-[var(--hero-foreground)] xl:p-10">
              <div>
                <Badge tone="accent">Suíte do professor</Badge>
                <div className="mt-6">
                  <ProvaScanLogo size="lg" priority />
                </div>
              </div>

              <div>
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--hero-muted)]">Acesso institucional</p>
                <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-[-0.06em] xl:text-6xl">
                  Corrija provas com um painel claro, rápido e pronto para operação real.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-8 text-[var(--hero-muted)]">
                  Uma experiência de software educacional com densidade de produto, organização operacional e leitura impecável.
                </p>

                <div className="mt-10 grid gap-4 xl:grid-cols-3">
                  {trustSignals.map(([title, text]) => (
                    <div
                      key={title}
                      className="rounded-[24px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-5"
                    >
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="mt-3 text-sm leading-6 text-[var(--hero-muted)]">{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Perfis", "admin, professor e vice_diretor"],
                  ["Banco inicial", "Google Sheets com leitura server-side"],
                  ["Sessão", "Cookie httpOnly assinado"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[22px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--hero-muted)]">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--hero-foreground)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.36, ease: "easeOut", delay: 0.04 }}
          className="flex items-center justify-center"
        >
          <Card className="w-full max-w-xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <ProvaScanLogo size="md" />
                <p className="mt-6 text-sm text-[var(--muted-foreground)]">Professor, faça seu login</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  Acesse o painel ProvaScan
                </h2>
              </div>
              <Badge tone="neutral">Login seguro</Badge>
            </div>

            <form
              className="mt-8 grid gap-4"
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

              <Button size="lg" className="mt-2 w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            {message ? (
              <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_64%,transparent)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                {message}
              </div>
            ) : null}

            {showRecovery ? (
              <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Recuperação e primeira troca</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    O acesso depende da aba `usuarios` no Google Sheets. Se `trocar_senha = SIM`, o usuário será redirecionado para uma etapa obrigatória antes de entrar no painel.
                    </p>
                  </div>
                  <Badge tone="accent">Sheets</Badge>
                </div>
              </div>
            ) : null}
          </Card>
        </motion.div>
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
