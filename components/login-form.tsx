"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const { data, loginTeacher, session } = useAppData();
  const [email, setEmail] = useState(session?.email ?? data.teacherProfile.email);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(session?.remember));
  const [showRecovery, setShowRecovery] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = () => {
    const result = loginTeacher({ email, remember });
    setMessage(result.message);
    if (result.ok) {
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative grid min-h-screen gap-6 px-4 py-4 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
      <div className="absolute right-4 top-4 z-20 lg:right-6 lg:top-6">
        <ThemeSwitcher />
      </div>
      <Card className="hidden overflow-hidden lg:block">
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(180deg,var(--hero-bg),var(--hero-bg-end))] p-8 text-[var(--hero-foreground)]">
          <ProvaScanLogo size="lg" priority />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--hero-muted)]">Acesso do professor</p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-[-0.05em]">
              Entre para corrigir provas, revisar lancamentos e manter seu historico local organizado.
            </h1>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["Fluxo local", "Tudo funciona ja no navegador, sem backend obrigatorio."],
                ["Backup pronto", "Exporte e restaure seu estado sempre que precisar."],
                ["Uso em qualquer tela", "Experiencia objetiva no celular e completa no desktop."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[24px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--hero-muted)]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-center">
        <Card className="w-full max-w-xl p-8">
          <ProvaScanLogo size="md" />
          <div className="mt-10">
            <p className="text-sm text-[var(--muted-foreground)]">Professor, faca seu login</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Acesse o seu painel ProvaScan
            </h2>
          </div>
          <form
            className="mt-8 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleLogin();
            }}
          >
            <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
              E-mail institucional
              <div className="flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4">
                <Mail className="mr-3 size-4 text-[var(--muted-foreground)]" />
                <input
                  className="w-full bg-transparent outline-none"
                  type="email"
                  autoComplete="username"
                  placeholder="professor@escola.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
              Senha
              <div className="flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4">
                <KeyRound className="mr-3 size-4 text-[var(--muted-foreground)]" />
                <input
                  className="w-full bg-transparent outline-none"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </label>
            <div className="mt-1 flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="size-4 rounded border-[var(--border)]"
                />
                Lembrar acesso
              </label>
              <button
                type="button"
                onClick={() => setShowRecovery((previous) => !previous)}
                className="font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
              >
                Esqueci minha senha
              </button>
            </div>
            <Button size="lg" className="mt-2 w-full" type="button" onClick={handleLogin}>
              Entrar como professor
            </Button>
          </form>
          {message ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p>
          ) : null}
          {showRecovery ? (
            <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Recuperacao nesta versao</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    A autenticacao institucional ainda nao esta conectada. Para continuar agora, use qualquer e-mail e inicie uma sessao local neste navegador.
                  </p>
                </div>
                <Badge tone="accent">Local</Badge>
              </div>
            </div>
          ) : null}
          <div className="mt-6 rounded-[24px] bg-[var(--surface)] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-5 text-[var(--accent)]" />
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Esta versao ja opera com sessao local, cadastros, gabaritos, correcoes e backup no navegador. Integracoes externas continuam opcionais.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
