"use client";

import { useEffect, useState } from "react";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { CreatorCredit } from "@/components/creator-credit";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { AuthSecurityFlow } from "@/components/auth-security-flow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getSafePostAuthRedirect, navigateAfterAuth } from "@/lib/client-auth-navigation";

export function LoginForm() {
  const { authResolved, loginTeacher, session } = useAppData();
  const [email, setEmail] = useState(session?.email ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(session?.remember));
  const [showRecovery, setShowRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityFlow, setSecurityFlow] = useState(false);

  useEffect(() => {
    if (!authResolved || !session) return;
    const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
    navigateAfterAuth(session.forcePasswordChange ? "/trocar-senha" : getSafePostAuthRedirect(redirect, "/dashboard"));
  }, [authResolved, session]);

  const handleLogin = async () => {
    setIsSubmitting(true);
    const result = await loginTeacher({ email, password, remember });
    setIsSubmitting(false);
    setMessage(result.message);
    if (!result.ok) return;
    if (result.step) { setSecurityFlow(true); setMessage(""); return; }
    const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
    navigateAfterAuth(getSafePostAuthRedirect(redirect, result.redirectTo || "/dashboard"));
  };

  return (
    <main className="min-h-[100dvh] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-[1160px] justify-end"><ThemeSwitcher compact /></div>
      <div className="mx-auto flex min-h-[calc(100dvh-96px)] max-w-[1160px] items-center justify-center py-10">
        <div className="w-full max-w-[480px]">
          <Card className="p-5 sm:p-7">
            <ProvaScanLogo size="md" />
            <div className="mt-8 border-t border-[var(--border)] pt-6">
              <p className="text-sm text-[var(--muted-foreground)]">Acesso do professor</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] text-[var(--foreground)]">Entre no seu espaço de trabalho</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Use suas credenciais para continuar de onde parou.</p>
            </div>

            {securityFlow ? <AuthSecurityFlow onComplete={() => navigateAfterAuth("/dashboard")} /> : (
              <form className="mt-7 grid gap-5" onSubmit={(event) => { event.preventDefault(); void handleLogin(); }}>
                <AuthField icon={<Mail className="size-4" />} label="Nome de acesso" type="text" autoComplete="username" placeholder="Digite seu acesso" value={email} onChange={setEmail} />
                <AuthField icon={<KeyRound className="size-4" />} label="Senha" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={setPassword} />
                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"><Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} label="Manter acesso neste dispositivo" /><button type="button" onClick={() => setShowRecovery((previous) => !previous)} className="text-left font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">Ajuda com a senha</button></div>
                <Button size="lg" className="mt-1 w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar"}</Button>
              </form>
            )}

            {message ? <p role="status" className="mt-5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
            {showRecovery && !securityFlow ? <div className="mt-5 flex gap-3 border-t border-[var(--border)] pt-5"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" /><p className="text-sm leading-6 text-[var(--muted-foreground)]">No primeiro acesso, ou quando a troca for exigida, você definirá uma nova senha antes de abrir o painel.</p></div> : null}
          </Card>
          <CreatorCredit variant="inline" className="mt-4" />
        </div>
      </div>
    </main>
  );
}

function AuthField({ autoComplete, icon, label, onChange, placeholder, type, value }: { autoComplete: string; icon: React.ReactNode; label: string; onChange: (value: string) => void; placeholder: string; type: string; value: string }) {
  return <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">{label}<span className="flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 text-[var(--muted-foreground)] transition-colors focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_var(--focus-ring)]"><span className="mr-3">{icon}</span><input className="w-full bg-transparent text-[var(--foreground)] outline-none" type={type} autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></span></label>;
}
