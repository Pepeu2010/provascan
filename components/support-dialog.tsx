"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Heart, QrCode, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PixQrCode } from "@/components/pix-qr-code";
import { Button } from "@/components/ui/button";
import { createPixPayload } from "@/lib/pix-payload";
import { isPixConfigured } from "@/lib/support-config";

type SupportStep = "intro" | "pix";

const DISMISSED_KEY = "provascan-support-dismissed";
const OPEN_EVENT = "provascan:open-support";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export function SupportDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const payload = createPixPayload();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SupportStep>("intro");
  const [copied, setCopied] = useState(false);

  const close = useCallback((permanently = false) => {
    if (permanently) localStorage.setItem(DISMISSED_KEY, "true");
    setOpen(false);
  }, []);

  const show = useCallback(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStep("intro");
    setCopied(false);
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, [show]);

  useEffect(() => {
    const shouldPrompt = pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/correcao");
    if (!shouldPrompt || localStorage.getItem(DISMISSED_KEY) === "true") return;
    const timer = window.setTimeout(show, 360);
    return () => window.clearTimeout(timer);
  }, [pathname, show]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const copyPayload = async () => {
    if (payload && await copyText(payload)) {
      setCopied(true);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(calc(100vw-32px),496px)] max-h-[calc(100dvh-32px)] overflow-auto rounded-[26px] border border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] bg-[var(--card-solid)] p-0 text-[var(--foreground)] shadow-[0_32px_100px_rgb(0_0_0_/_48%)] backdrop:bg-[var(--overlay-scrim)] backdrop:backdrop-blur-[3px]"
      aria-labelledby="support-dialog-title"
      aria-describedby="support-dialog-description"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}
      onClose={() => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }}
    >
      <div className="relative overflow-hidden px-6 pb-6 pt-7 sm:px-9 sm:pb-9 sm:pt-10">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--accent),#d7d0ff,transparent)]" />
        <button type="button" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]" onClick={() => close()} aria-label="Fechar apoio ao ProvaScan"><X className="size-4" /></button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: -8 }} transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 27, mass: 0.8 }}>
            {step === "intro" ? <>
              <motion.div className="grid size-12 place-items-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] bg-[var(--accent-soft)] text-[var(--accent)] shadow-[0_10px_30px_rgb(108_89_212_/_16%)]" animate={reduceMotion ? undefined : { y: [0, -3, 0] }} transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}><Heart className="size-5" fill="currentColor" /></motion.div>
              <p className="mt-6 font-mono text-[10px] font-bold tracking-[0.18em] text-[var(--accent)]">APOIO VOLUNTÁRIO</p>
              <h2 id="support-dialog-title" className="mt-2 max-w-[390px] text-[clamp(1.8rem,7vw,2.45rem)] font-bold leading-[0.98] tracking-[-0.055em] text-[var(--foreground)]">Ajude a manter o ProvaScan gratuito</h2>
              <p id="support-dialog-description" className="mt-5 max-w-[418px] text-sm leading-6 text-[var(--muted-foreground)]">O ProvaScan foi criado para facilitar a rotina de professores e continuará gratuito. Se ele está ajudando você, qualquer apoio à sua manutenção e evolução é bem-vindo.</p>
              <div className="mt-5 flex gap-3 border-l-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] px-4 py-3 text-[13px] font-semibold leading-5 text-[var(--foreground)]">Apoiar é opcional. Nenhuma funcionalidade depende disso.</div>
              <div className="mt-7 grid gap-2"><Button size="lg" className="h-12 w-full rounded-[14px]" onClick={() => setStep("pix")}><Heart className="size-4" fill="currentColor" /> Apoiar o ProvaScan</Button><Button variant="ghost" className="h-10 w-full" onClick={() => close()}>Agora não</Button></div>
              <button type="button" className="mx-auto mt-3 block text-xs text-[var(--muted-foreground)] underline decoration-[var(--border-strong)] underline-offset-4 transition hover:text-[var(--foreground)]" onClick={() => close(true)}>Não mostrar novamente</button>
            </> : step === "pix" ? <>
              <motion.div className="grid size-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]" initial={reduceMotion ? false : { rotate: -8, scale: 0.86 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 360, damping: 22 }}><QrCode className="size-5" /></motion.div><p className="mt-6 font-mono text-[10px] font-bold tracking-[0.18em] text-[var(--accent)]">PIX VOLUNTÁRIO</p>
              <h2 id="support-dialog-title" className="mt-2 text-3xl font-bold tracking-[-0.05em]">Seu apoio faz diferença</h2>
              {isPixConfigured ? <div className="mt-6 grid justify-items-center gap-4 text-center"><PixQrCode payload={payload} /><p className="text-sm text-[var(--muted-foreground)]">Escaneie com o aplicativo do seu banco</p><Button size="lg" className="mt-1 h-12 w-full rounded-[14px]" onClick={() => void copyPayload()}><Copy className="size-4" /> Copiar código PIX</Button>{copied ? <motion.p initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]" role="status">Código PIX copiado. Aguardando a confirmação do pagamento.</motion.p> : null}</div> : <p className="mt-5 border-l-2 border-[var(--warning)] pl-4 text-sm leading-6 text-[var(--muted-foreground)]">O PIX ainda não foi configurado para esta publicação.</p>}
              <button type="button" className="mx-auto mt-5 block text-xs text-[var(--muted-foreground)] underline underline-offset-4" onClick={() => setStep("intro")}>Voltar</button>
            </> : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </dialog>
  );
}
