"use client";

import "./login-form.css";

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
    <main className="login-page">
      <div className="login-page__shell">
        <section className="login-page__story" aria-label="Como o ProvaScan trabalha">
          <p className="login-page__eyebrow"><ScanLine className="size-3.5" /> ProvaScan · leitura assistida</p>
          <h1>Da folha à decisão, com rastreabilidade.</h1>
          <p>O ProvaScan identifica a leitura, marca as exceções e mantém a confirmação final nas suas mãos.</p>
          <div className="login-page__scan-card" aria-hidden="true">
            <span className="login-page__scan-grid" />
            <span className="login-page__scan-sheet"><i /><i /><i /><i /></span>
            <span className="login-page__scan-line" />
            <span className="login-page__scan-chip">LEITURA ASSISTIDA</span>
          </div>
          <ol className="login-page__workflow" aria-label="Fluxo do ProvaScan">
            <li><span>01</span><div><strong>Organize</strong><small>Provas e turmas</small></div></li>
            <li><span>02</span><div><strong>Confira</strong><small>Exceções em foco</small></div></li>
            <li><span>03</span><div><strong>Decida</strong><small>Resultados claros</small></div></li>
          </ol>
          <div className="login-page__assurances">
            <span><CheckCircle2 className="size-4" /> Revisão obrigatória</span>
            <span><CheckCircle2 className="size-4" /> Dados por turma</span>
          </div>
        </section>
        <section className="login-page__access" aria-label="Acesso ao ProvaScan">
          <Card className="login-page__form-card">
            <ProvaScanLogo size="md" />
            <div className="login-page__heading">
              <p><ShieldCheck className="size-3.5" aria-hidden="true" />Acesso protegido</p>
              <h1>Entre para continuar</h1>
              <span>Use seu usuário e sua senha. Leva só um instante.</span>
            </div>

            {securityFlow ? <AuthSecurityFlow onComplete={() => navigateAfterAuth("/dashboard")} /> : (
              <form className="login-page__auth-form" onSubmit={(event) => { event.preventDefault(); void handleLogin(); }}>
                <AuthField autoFocus icon={<Mail className="size-4" />} label="Usuário" type="text" autoComplete="username" placeholder="Digite seu usuário" value={email} onChange={setEmail} />
                <AuthField icon={<KeyRound className="size-4" />} label="Senha" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={setPassword} />
                <div className="login-page__options"><Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} label="Lembrar neste aparelho" /><button type="button" onClick={() => setShowRecovery((previous) => !previous)}>Precisa de ajuda?</button></div>
                <Button size="lg" className="login-page__submit" type="submit" loading={isSubmitting}>{isSubmitting ? "Entrando…" : "Entrar"}</Button>
              </form>
            )}

            {message ? <p role={messageTone === "error" ? "alert" : "status"} className={`login-page__message login-page__message--${messageTone}`}>{message}</p> : null}
            {showRecovery && !securityFlow ? <div className="login-page__help"><ShieldCheck className="size-5" /><p>Se sua conta pedir um código de confirmação, use o aplicativo autenticador no primeiro acesso. Marque “Lembrar neste aparelho” apenas em um computador pessoal.</p></div> : null}
          </Card>
          <CreatorCredit variant="inline" className="mt-4" />
        </section>
      </div>
    </main>
  );
}

function AuthField({ autoComplete, autoFocus = false, icon, label, onChange, placeholder, type, value }: { autoComplete: string; autoFocus?: boolean; icon: React.ReactNode; label: string; onChange: (value: string) => void; placeholder: string; type: string; value: string }) {
  const inputId = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

  return <div className="auth-field"><label htmlFor={inputId}>{label}</label><span className="auth-field__control"><span className="auth-field__icon">{icon}</span><input id={inputId} autoFocus={autoFocus} type={inputType} autoComplete={autoComplete} autoCapitalize="none" spellCheck={false} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />{isPassword ? <button type="button" className="auth-field__reveal" onClick={() => setRevealed((current) => !current)} aria-label={revealed ? "Ocultar senha" : "Mostrar senha"} aria-pressed={revealed}>{revealed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</button> : null}</span></div>;
}
