import Link from "next/link";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="relative grid min-h-screen gap-6 px-4 py-4 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
      <div className="absolute right-4 top-4 z-20 lg:right-6 lg:top-6">
        <ThemeSwitcher />
      </div>
      <Card className="hidden overflow-hidden lg:block">
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(180deg,var(--hero-bg),var(--hero-bg-end))] p-8 text-[var(--hero-foreground)]">
          <ProvaScanLogo />
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--hero-muted)]">Acesso do professor</p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-[-0.05em]">
              Entre para corrigir provas, revisar OCR e manter a planilha sempre atualizada.
            </h1>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ["OCR seguro", "Nome ou matrícula com conferência manual"],
                ["Banco em Sheets", "Nada de credenciais no frontend"],
                ["Tela responsiva", "Fluxo suave no celular e no desktop"],
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
          <ProvaScanLogo />
          <div className="mt-10">
            <p className="text-sm text-[var(--muted-foreground)]">Professor, faça seu login</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Acesse o seu painel ProvaScan
            </h2>
          </div>
          <div className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
              E-mail institucional
              <div className="flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4">
                <Mail className="mr-3 size-4 text-[var(--muted-foreground)]" />
                <input className="w-full bg-transparent outline-none" placeholder="professor@escola.com" />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
              Senha
              <div className="flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4">
                <KeyRound className="mr-3 size-4 text-[var(--muted-foreground)]" />
                <input className="w-full bg-transparent outline-none" type="password" placeholder="Digite sua senha" />
              </div>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[var(--muted-foreground)]">
              <input type="checkbox" className="size-4 rounded border-[var(--border)]" />
              Lembrar acesso
            </label>
            <a href="#" className="font-medium text-[var(--accent)]">
              Esqueci minha senha
            </a>
          </div>
          <Link href="/dashboard">
            <Button size="lg" className="mt-6 w-full">
              Entrar como professor
            </Button>
          </Link>
          <div className="mt-6 rounded-[24px] bg-[var(--surface)] p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-5 text-[var(--accent)]" />
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                A autenticação final pode ser conectada com NextAuth ou provedor institucional. Nesta entrega,
                o fluxo visual e a proteção da camada de servidor já estão preparados.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
