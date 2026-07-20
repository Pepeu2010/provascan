"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Check, Copy, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthStep } from "@/types/auth";

type FlowState = { step: AuthStep; user: { nome: string; acesso: string }; policy: { required: boolean } };

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir esta etapa.");
  return payload as Record<string, unknown>;
}

export function AuthSecurityFlow({ onComplete }: { onComplete: () => void }) {
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [totp, setTotp] = useState<{ uri: string; manual: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const refresh = async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/auth/flow", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setFlow(payload); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar sua sessão de segurança."); }
    finally { setLoading(false); }
  };
  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, []);

  const run = async (action: () => Promise<Record<string, unknown>>) => {
    setLoading(true); setError("");
    try { const payload = await action(); if (payload.redirectTo) { onComplete(); return; } if (Array.isArray(payload.recoveryCodes)) setRecoveryCodes(payload.recoveryCodes as string[]); if (typeof payload.otpauthUri === "string" && typeof payload.manualKey === "string") setTotp({ uri: payload.otpauthUri, manual: payload.manualKey }); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível concluir esta etapa."); setLoading(false); }
  };

  if (loading && !flow) return <FlowMessage icon={<RefreshCw className="size-5 animate-spin" />} title="Preparando sua segurança" text="Validando as próximas etapas permitidas." />;
  if (!flow) return <FlowMessage icon={<LockKeyhole className="size-5" />} title="Sessão expirada" text={error || "Faça login novamente para continuar."} />;
  const common = { loading, error, run, refresh, flow };
  switch (flow.step) {
    case "PASSWORD_CHANGE": return <PasswordStep {...common} />;
    case "MFA_METHOD": return <MethodStep {...common} />;
    case "TOTP_SETUP": return <MethodStep {...common} />;
    case "TOTP_VERIFY": return <TotpStep {...common} totp={totp} />;
    case "RECOVERY_CODES_SAVE": return <RecoveryCodesStep {...common} codes={recoveryCodes} />;
    default: return <FlowMessage icon={<ShieldCheck className="size-5" />} title="Verificação necessária" text="Recarregue a página para continuar." />;
  }
}

type Props = { flow: FlowState; loading: boolean; error: string; run: (action: () => Promise<Record<string, unknown>>) => Promise<void>; refresh: () => Promise<void> };

function PasswordStep({ flow, loading, error, run }: Props) {
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const strength = useMemo(() => (newPassword.length >= 10 ? (/[a-z]/i.test(newPassword) && /\d/.test(newPassword) ? "Forte" : "Quase lá") : "Use 10+ caracteres"), [newPassword]);
  return <section className="mt-6 grid gap-4"><StepHeader icon={<KeyRound />} title="Troque sua senha" text={`${flow.user.nome}, defina uma senha nova antes de continuar.`} /><PasswordField label="Senha atual" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" /><PasswordField label="Nova senha" value={newPassword} onChange={setNewPassword} autoComplete="new-password" /><p className="text-xs text-[var(--muted-foreground)]">Força: {strength}. Use letras e números; evite seu nome de acesso.</p><PasswordField label="Confirme a nova senha" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" /><ActionError error={error} /><Button size="lg" className="h-[52px] w-full rounded-[18px]" disabled={loading} onClick={() => run(() => post("/api/auth/password", { currentPassword, newPassword, confirmPassword }))}>{loading ? "Salvando..." : "Salvar nova senha"}</Button></section>;
}

function MethodStep({ loading, error, run }: Props) {
  const choose = async () => { await run(async () => { await post("/api/auth/mfa/method", { method: "TOTP" }); return post("/api/auth/mfa/totp", { action: "begin" }); }); };
  return <section className="mt-6 grid gap-4"><StepHeader icon={<ShieldCheck />} title="Proteja sua conta" text="Configure um aplicativo autenticador para impedir acessos não autorizados." /><button type="button" disabled={loading} onClick={() => void choose()} className="rounded-[22px] border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_9%,var(--surface))] p-4 text-left transition hover:-translate-y-0.5"><div className="flex items-center gap-3"><Smartphone className="size-5 text-[var(--accent)]" /><strong>Aplicativo autenticador</strong><span className="ml-auto text-[10px] font-bold tracking-[.12em] text-[var(--accent)]">OBRIGATÓRIO</span></div><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Google Authenticator, Microsoft Authenticator, 2FAS ou outro app compatível. Funciona sem internet.</p></button><ActionError error={error} /></section>;
}

function TotpStep({ loading, error, run, totp }: Props & { totp: { uri: string; manual: string } | null }) { const [code, setCode] = useState(""); const [recovery, setRecovery] = useState(false); const [recoveryCode, setRecoveryCode] = useState(""); const [qr, setQr] = useState(""); useEffect(() => { if (totp?.uri) void QRCode.toDataURL(totp.uri, { width: 220, margin: 2 }).then(setQr); }, [totp]); const verify = () => run(() => post("/api/auth/mfa/totp", { action: "verify", code })); if (!totp) return <section className="mt-6 grid gap-4"><StepHeader icon={<Smartphone />} title="Confirme sua identidade" text="Abra seu aplicativo autenticador e informe o código atual de seis dígitos." /><OtpInput value={code} onChange={setCode} disabled={loading} /><ActionError error={error} /><Button size="lg" className="h-[52px] w-full rounded-[18px]" disabled={loading || code.length !== 6} onClick={verify}>{loading ? "Verificando..." : "Verificar código"}</Button></section>; return <section className="mt-6 grid gap-4"><StepHeader icon={<Smartphone />} title="Configure seu autenticador" text="Escaneie o QR Code e informe o código de seis dígitos gerado pelo aplicativo." /><div className="mx-auto rounded-[22px] bg-white p-3">{qr ? <><span className="sr-only">QR Code pronto para leitura pelo autenticador.</span><Image src={qr} unoptimized alt="QR Code para configurar o autenticador" width={220} height={220} /></> : <div className="size-[220px]" />}</div><details className="rounded-xl border border-[var(--border)] p-3"><summary className="cursor-pointer text-sm font-medium">Não consegue escanear?</summary><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 break-all text-xs">{totp.manual}</code><button type="button" aria-label="Copiar chave manual" onClick={() => void navigator.clipboard.writeText(totp.manual)}><Copy className="size-4" /></button></div></details>{recovery ? <><label className="grid gap-2 text-sm font-medium">Código de recuperação<Input value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" autoComplete="one-time-code" /></label><Button size="lg" className="w-full" disabled={loading} onClick={() => run(() => post("/api/auth/mfa/recovery", { code: recoveryCode }))}>Usar código de recuperação</Button></> : <><OtpInput value={code} onChange={setCode} disabled={loading} /><Button size="lg" className="h-[52px] w-full rounded-[18px]" disabled={loading || code.length !== 6} onClick={verify}>{loading ? "Verificando..." : "Ativar autenticador"}</Button><button type="button" className="text-sm font-medium text-[var(--accent)]" onClick={() => setRecovery(true)}>Não tenho acesso ao meu autenticador</button></>}<ActionError error={error} /></section>; }

function RecoveryCodesStep({ loading, error, run, codes }: Props & { codes: string[] }) { const [saved, setSaved] = useState(false); const copy = () => void navigator.clipboard.writeText(codes.join("\n")); return <section className="mt-6 grid gap-4"><StepHeader icon={<KeyRound />} title="Salve seus códigos de recuperação" text="Eles permitem acessar sua conta caso você perca o celular. Cada código funciona uma única vez." />{codes.length ? <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-[var(--border)] p-4 font-mono text-sm">{codes.map((code) => <code key={code}>{code}</code>)}</div> : <p className="rounded-xl border border-amber-400/40 p-3 text-sm">Os códigos foram exibidos uma única vez. Refaça a configuração caso não os tenha salvo.</p>}<div className="flex gap-2"><Button type="button" variant="secondary" className="flex-1" onClick={copy} disabled={!codes.length}><Copy className="mr-2 size-4" />Copiar</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => { const blob = new Blob([codes.join("\n")], { type: "text/plain" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "provascan-codigos-recuperacao.txt"; link.click(); URL.revokeObjectURL(url); }} disabled={!codes.length}>Baixar .txt</Button></div><label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} className="mt-1 size-4" />Salvei meus códigos em um local seguro.</label><ActionError error={error} /><Button size="lg" className="h-[52px] w-full rounded-[18px]" disabled={loading || !saved} onClick={() => run(() => post("/api/auth/mfa/totp", { action: "confirm-recovery" }))}>{loading ? "Finalizando..." : <><Check className="mr-2 size-4" />Concluir proteção</>}</Button></section>; }

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) { const ref = useRef<HTMLInputElement>(null); const digits = value.padEnd(6, " ").slice(0, 6).split(""); return <div className="grid gap-2"><label className="text-sm font-medium">Código de seis dígitos</label><div className="relative grid grid-cols-6 gap-2" onClick={() => ref.current?.focus()}>{digits.map((digit, index) => <span key={index} className="flex h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-lg font-semibold">{digit.trim()}</span>)}<input ref={ref} aria-label="Código de seis dígitos" className="absolute inset-0 cursor-text opacity-0" value={value} disabled={disabled} inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" enterKeyHint="done" onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div></div>; }
function PasswordField({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) { return <label className="grid gap-2 text-sm font-medium">{label}<Input type="password" autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function StepHeader({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div><div className="flex items-center gap-2 text-[var(--accent)]">{icon}<span className="text-xs font-bold tracking-[.14em]">SEGURANÇA DA CONTA</span></div><h2 className="mt-3 text-2xl font-semibold tracking-[-.04em]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{text}</p></div>; }
function ActionError({ error }: { error: string }) { return error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p> : null; }
function FlowMessage({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="mt-8 rounded-[22px] border border-[var(--border)] p-5 text-center"><div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]">{icon}</div><h2 className="mt-3 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">{text}</p></div>; }
