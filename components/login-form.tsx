"use client";

import { useEffect, useId, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Mail, ScanLine, ShieldCheck } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { CreatorCredit } from "@/components/creator-credit";
import { ProvaScanLogo } from "@/components/provascan-logo";
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
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityFlow, setSecurityFlow] = useState(false);

  useEffect(() => {
    if (!authResolved || !session) return;
    const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
    navigateAfterAuth(session.forcePasswordChange ? "/trocar-senha" : getSafePostAuthRedirect(redirect, "/dashboard"));
  }, [authResolved, session]);

  const handleLogin = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await loginTeacher({ email, password, remember });
      setMessageTone(result.ok ? "success" : "error");
      setMessage(result.message);
      if (!result.ok) return;
      if (result.step) { setSecurityFlow(true); setMessage(""); return; }
      const redirect = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") : null;
      navigateAfterAuth(getSafePostAuthRedirect(redirect, result.redirectTo || "/dashboard"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page min-h-[100dvh] px-4 py-4 sm:px-6 sm:py-6">
      <div className="login-page__frame mx-auto grid min-h-[calc(100dvh-32px)] max-w-[1160px] items-center py-6 lg:grid-cols-[1.08fr_.92fr] lg:py-10">
        <section className="login-page__instrument" aria-label="Como o ProvaScan trabalha">
          <p className="login-page__eyebrow"><ScanLine className="size-3.5" /> ProvaScan · leitura assistida</p>
          <h1>Da folha à decisão, com rastreabilidade.</h1>
          <p>O ProvaScan identifica a leitura, marca as exceções e mantém a confirmação final nas suas mãos.</p>
          <div className="login-page__scan-card" aria-hidden="true">
            <span className="login-page__scan-grid" />
            <span className="login-page__scan-line" />
            <span className="login-page__scan-chip">OCR</span>
          </div>
          <div className="login-page__assurances">
            <span><CheckCircle2 className="size-4" /> Revisão obrigatória</span>
            <span><CheckCircle2 className="size-4" /> Dados por turma</span>
          </div>
        </section>
        <div className="login-page__form w-full max-w-[480px] justify-self-center lg:justify-self-end">
          <Card className="login-page__form-card p-5 sm:p-7">
            <ProvaScanLogo size="md" />
            <div className="mt-6 border-t border-[var(--border)] pt-5 sm:mt-8 sm:pt-6">
              <p className="text-sm text-[var(--muted-foreground)]">Acesso do professor</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-.045em] text-[var(--foreground)] sm:text-3xl">Entre no seu espaço de trabalho</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">Use suas credenciais para continuar de onde parou.</p>
            </div>

            {securityFlow ? <AuthSecurityFlow onComplete={() => navigateAfterAuth("/dashboard")} /> : (
              <form className="login-page__auth-form mt-6 grid gap-4 sm:mt-7 sm:gap-5" onSubmit={(event) => { event.preventDefault(); void handleLogin(); }}>
                <AuthField icon={<Mail className="size-4" />} label="Nome de acesso" type="text" autoComplete="username" placeholder="Digite seu acesso" value={email} onChange={setEmail} />
                <AuthField icon={<KeyRound className="size-4" />} label="Senha" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={setPassword} />
                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"><Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} label="Lembrar este dispositivo por 30 dias" /><button type="button" onClick={() => setShowRecovery((previous) => !previous)} className="text-left font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]">Ajuda com a senha</button></div>
                <Button size="lg" className="mt-1 w-full" type="submit" loading={isSubmitting}>{isSubmitting ? "Entrando…" : "Entrar"}</Button>
              </form>
            )}

            {message ? <p role={messageTone === "error" ? "alert" : "status"} className={`login-page__message login-page__message--${messageTone} mt-5 rounded-[var(--radius-sm)] border px-3 py-3 text-sm`}>{message}</p> : null}
            {showRecovery && !securityFlow ? <div className="mt-5 flex gap-3 border-t border-[var(--border)] pt-5"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" /><p className="text-sm leading-6 text-[var(--muted-foreground)]">O código do autenticador é pedido no primeiro acesso. Em computador pessoal, marque a opção acima para não repetir o login por 30 dias. Não use em máquina compartilhada.</p></div> : null}
          </Card>
          <CreatorCredit variant="inline" className="mt-4" />
        </div>
      </div>
    </main>
  );
}

function AuthField({ autoComplete, icon, label, onChange, placeholder, type, value }: { autoComplete: string; icon: React.ReactNode; label: string; onChange: (value: string) => void; placeholder: string; type: string; value: string }) {
  const inputId = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

  return <div className="auth-field grid gap-2 text-sm font-medium text-[var(--foreground)]"><label htmlFor={inputId}>{label}</label><span className="auth-field__control flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--input-bg)] px-3.5 text-[var(--muted-foreground)]"><span className="mr-3">{icon}</span><input id={inputId} className="w-full bg-transparent text-[var(--foreground)] outline-none" type={inputType} autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />{isPassword ? <button type="button" className="auth-field__reveal" onClick={() => setRevealed((current) => !current)} aria-label={revealed ? "Ocultar senha" : "Mostrar senha"} aria-pressed={revealed}>{revealed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</button> : null}</span></div>;
}
