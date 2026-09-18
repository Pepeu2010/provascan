"use client";

import "./auth-security-flow.css";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import CodeSlots from "@/components/CodeSlots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthStep } from "@/types/auth";

type FlowState = { step: AuthStep; mfaConfigured: boolean; user: { nome: string; acesso: string }; policy: { required: boolean } };
type CopyState = "idle" | "success" | "error";
type CodeSlotsStatus = "idle" | "success" | "error";
type Props = { flow: FlowState; loading: boolean; error: string; run: (action: () => Promise<Record<string, unknown>>) => Promise<boolean>; refresh: () => Promise<boolean> };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir esta etapa.");
  return payload as Record<string, unknown>;
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.cssText = "position:fixed;opacity:0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("COPY_FAILED");
}

export function AuthSecurityFlow({ onComplete }: { onComplete: () => void }) {
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [totp, setTotp] = useState<{ uri: string; manual: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/flow", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setFlow(payload);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar sua sessão de segurança.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, []);

  const run = async (action: () => Promise<Record<string, unknown>>) => {
    setLoading(true);
    setError("");
    try {
      const payload = await action();
      if (payload.redirectTo) { onComplete(); return true; }
      if (Array.isArray(payload.recoveryCodes)) setRecoveryCodes(payload.recoveryCodes as string[]);
      if (typeof payload.otpauthUri === "string" && typeof payload.manualKey === "string") setTotp({ uri: payload.otpauthUri, manual: payload.manualKey });
      return refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir esta etapa.");
      setLoading(false);
      return false;
    }
  };

  if (loading && !flow) return <FlowMessage icon={<RefreshCw className="size-5 animate-spin" />} title="Preparando sua segurança" text="Validando as próximas etapas permitidas." />;
  if (!flow) return <FlowMessage icon={<LockKeyhole className="size-5" />} title="Sessão expirada" text={error || "Faça login novamente para continuar."} />;
  const common = { loading, error, run, refresh, flow };
  let content: React.ReactNode;
  switch (flow.step) {
    case "PASSWORD_CHANGE": content = <PasswordStep {...common} />; break;
    case "MFA_METHOD":
    case "TOTP_SETUP": content = <MethodStep {...common} />; break;
    case "TOTP_VERIFY": content = <TotpStep {...common} configured={flow.mfaConfigured} totp={totp} />; break;
    case "RECOVERY_CODES_SAVE": content = <RecoveryCodesStep {...common} codes={recoveryCodes} />; break;
    default: content = <FlowMessage icon={<ShieldCheck className="size-5" />} title="Verificação necessária" text="Recarregue a página para continuar." />;
  }
  return <div className="security-flow__journey-shell"><SecurityJourney step={flow.step} />{content}</div>;
}

function SecurityJourney({ step }: { step: AuthStep }) {
  const activeIndex = step === "PASSWORD_CHANGE" ? 0 : step === "MFA_METHOD" || step === "TOTP_SETUP" || step === "TOTP_VERIFY" ? 1 : 2;
  return <ol className="security-flow__journey" aria-label="Etapas de proteção da conta">{["Senha", "Autenticador", "Recuperação"].map((label, index) => <li key={label} className={index <= activeIndex ? "is-current" : ""} aria-current={index === activeIndex ? "step" : undefined}><span>{index < activeIndex ? <Check className="size-3" aria-hidden="true" /> : index + 1}</span><strong>{label}</strong></li>)}</ol>;
}

function PasswordStep({ flow, loading, error, run }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const strength = useMemo(() => (newPassword.length >= 10 ? (/[a-z]/i.test(newPassword) && /\d/.test(newPassword) ? "Forte" : "Quase lá") : "Use 10+ caracteres"), [newPassword]);
  return <section className="security-flow security-flow__stage"><StepHeader icon={<KeyRound />} title="Troque sua senha" text={`${flow.user.nome}, defina uma senha nova antes de continuar.`} /><PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" /><PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} autoComplete="new-password" /><p className="security-flow__hint">Força: {strength}. Use letras e números; evite seu nome de acesso.</p><PasswordField label="Confirme a nova senha" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" /><ActionError error={error} /><Button size="lg" className="security-flow__primary" disabled={loading} onClick={() => run(() => post("/api/auth/password", { currentPassword, newPassword, confirmPassword }))}>{loading ? "Salvando..." : "Salvar nova senha"}</Button></section>;
}

function MethodStep({ loading, error, run }: Props) {
  const choose = async () => { await run(async () => { await post("/api/auth/mfa/method", { method: "TOTP" }); return post("/api/auth/mfa/totp", { action: "begin" }); }); };
  return <section className="security-flow security-flow__stage"><StepHeader icon={<ShieldCheck />} title="Proteja sua conta" text="Configure um aplicativo autenticador para impedir acessos não autorizados." /><button type="button" disabled={loading} onClick={() => void choose()} className="security-flow__method"><div><Smartphone className="size-5" /><strong>Aplicativo autenticador</strong><span>OBRIGATÓRIO</span></div><p>Google Authenticator, Microsoft Authenticator, 2FAS ou outro app compatível. Funciona sem internet.</p></button><ActionError error={error} /></section>;
}

function TotpStep({ configured, loading, error, run, totp }: Props & { configured: boolean; totp: { uri: string; manual: string } | null }) {
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<CodeSlotsStatus>("idle");
  const [recovery, setRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [qr, setQr] = useState("");
  const [manualCopyState, setManualCopyState] = useState<CopyState>("idle");
  useEffect(() => { if (totp?.uri) void QRCode.toDataURL(totp.uri, { width: 220, margin: 2 }).then(setQr); }, [totp]);
  const verify = async (submittedCode = code) => {
    const ok = await run(() => post("/api/auth/mfa/totp", { action: "verify", code: submittedCode }));
    setCodeStatus(ok ? "success" : "error");
  };
  const updateCode = (nextCode: string) => { setCodeStatus("idle"); setCode(nextCode); };
  const completeCode = (nextCode: string) => { setCode(nextCode); void verify(nextCode); };
  const copyManualKey = async () => { try { await copyText(totp?.manual ?? ""); setManualCopyState("success"); } catch { setManualCopyState("error"); } };

  if (!totp && configured) return <section className="security-flow security-flow__stage"><StepHeader icon={<Smartphone />} title="Confirme sua identidade" text="Abra seu aplicativo autenticador e informe o código atual de seis dígitos." /><OtpInput value={code} onChange={updateCode} onComplete={completeCode} status={codeStatus} disabled={loading} /><ActionError error={error} /><Button size="lg" className="security-flow__primary" disabled={loading || code.length !== 6 || codeStatus !== "idle"} onClick={() => void verify()}>{loading ? "Verificando..." : "Verificar código"}</Button></section>;
  if (!totp) return <FlowMessage icon={<ShieldCheck className="size-5" />} title="Configure seu autenticador" text="A configuração anterior não foi concluída. Recarregue a página para iniciar com o QR Code." />;

  return <section className="security-flow security-flow__stage"><StepHeader icon={<Smartphone />} title="Configure seu autenticador" text="Escaneie o QR Code e informe o código de seis dígitos gerado pelo aplicativo." /><div className="security-flow__qr">{qr ? <><span className="sr-only">QR Code pronto para leitura pelo autenticador.</span><Image src={qr} unoptimized alt="QR Code para configurar o autenticador" width={220} height={220} /></> : <div className="size-[220px]" />}</div><details className="security-flow__manual"><summary>Não consegue escanear?</summary><div><code>{totp.manual}</code><button type="button" aria-label="Copiar chave para o autenticador" onClick={() => void copyManualKey()}>{manualCopyState === "success" ? <><Check className="size-4" aria-hidden="true" />Copiado</> : <><Copy className="size-4" aria-hidden="true" />Copiar</>}</button></div>{manualCopyState === "success" ? <p className="security-flow__status" role="status" aria-live="polite">Chave copiada. Cole-a no seu aplicativo autenticador.</p> : null}{manualCopyState === "error" ? <p className="security-flow__status security-flow__status--error" role="alert">Não foi possível copiar. Selecione a chave acima e copie manualmente.</p> : null}</details>{recovery ? <div className="security-flow__recovery"><label>Código de recuperação<Input value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" autoComplete="off" /></label><Button size="lg" className="w-full" disabled={loading} onClick={() => run(() => post("/api/auth/mfa/recovery", { code: recoveryCode }))}>Usar código de recuperação</Button></div> : <><OtpInput value={code} onChange={updateCode} onComplete={completeCode} status={codeStatus} disabled={loading} /><Button size="lg" className="security-flow__primary" disabled={loading || code.length !== 6 || codeStatus !== "idle"} onClick={() => void verify()}>{loading ? "Verificando..." : "Ativar autenticador"}</Button><button type="button" className="security-flow__alternate" onClick={() => setRecovery(true)}>Não tenho acesso ao meu autenticador</button></>}<ActionError error={error} /></section>;
}

function RecoveryCodesStep({ loading, error, run, codes }: Props & { codes: string[] }) {
  const [saved, setSaved] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const copy = async () => { try { await copyText(codes.join("\n")); setCopyState("success"); } catch { setCopyState("error"); } };
  return <section className="security-flow security-flow__stage"><StepHeader icon={<KeyRound />} title="Salve seus códigos de recuperação" text="Eles permitem acessar sua conta caso você perca o celular. Cada código funciona uma única vez." />{codes.length ? <div className="security-flow__recovery-codes">{codes.map((code) => <code key={code}>{code}</code>)}</div> : <p className="security-flow__notice">Os códigos foram exibidos uma única vez. Refaça a configuração caso não os tenha salvo.</p>}<div className="security-flow__split-actions"><Button type="button" variant="secondary" className="flex-1" onClick={() => void copy()} disabled={!codes.length}>{copyState === "success" ? <><Check className="mr-2 size-4" />Copiado</> : <><Copy className="mr-2 size-4" />Copiar</>}</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => { const blob = new Blob([codes.join("\n")], { type: "text/plain" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "provascan-codigos-recuperacao.txt"; link.click(); URL.revokeObjectURL(url); }} disabled={!codes.length}>Baixar .txt</Button></div>{copyState === "success" ? <p className="security-flow__status" role="status" aria-live="polite">Códigos copiados. Guarde-os em um local seguro.</p> : null}{copyState === "error" ? <p className="security-flow__status security-flow__status--error" role="alert">Não foi possível copiar os códigos. Use o download ou copie manualmente.</p> : null}<label className="security-flow__saved"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />Salvei meus códigos em um local seguro.</label><ActionError error={error} /><Button size="lg" className="security-flow__primary" disabled={loading || !saved} onClick={() => run(() => post("/api/auth/mfa/totp", { action: "confirm-recovery" }))}>{loading ? "Finalizando..." : <><Check className="mr-2 size-4" />Concluir proteção</>}</Button></section>;
}

function OtpInput({ value, onChange, onComplete, status, disabled }: { value: string; onChange: (value: string) => void; onComplete: (value: string) => void; status: CodeSlotsStatus; disabled: boolean }) {
  return <div className="security-flow__otp"><span>Código de seis dígitos</span><CodeSlots length={6} value={value} status={status} onChange={onChange} onComplete={onComplete} disabled={disabled} autoFocus accentColor="#5716b0" inkColor="#f5f5f5" slotColor="#27272a" digitColor="#ffffff" dangerColor="#ff3b30" slotSize={46} gap={8} radius={12} bounce={0.25} settle={0.3} rise={8} cascade={25} ariaLabel="Código de seis dígitos" className="security-flow__code-slots" /><p>Digite ou cole o código. O envio começa ao completar os seis números.</p></div>;
}
function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) { return <label className="security-flow__field">{label}<Input type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function StepHeader({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <header className="security-flow__header"><div className="security-flow__eyebrow">{icon}<span>SEGURANÇA DA CONTA</span></div><h2>{title}</h2><p>{text}</p></header>; }
function ActionError({ error }: { error: string }) { return error ? <p role="alert" className="security-flow__status security-flow__status--error">{error}</p> : null; }
function FlowMessage({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="security-flow__message"><div>{icon}</div><h2>{title}</h2><p>{text}</p></div>; }
