"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Heart, QrCode, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PixQrCode } from "@/components/pix-qr-code";
import { Button } from "@/components/ui/button";
import { createPixPayload } from "@/lib/pix-payload";
import { isPixConfigured } from "@/lib/support-config";

type SupportStep = "intro" | "pix" | "thanks";
const DISMISSED_KEY = "provascan-support-dismissed";
const FIRST_SEEN_KEY = "provascan-support-first-seen-at";
const COOLDOWN_KEY = "provascan-support-next-prompt-at";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const OPEN_EVENT = "provascan:open-support";

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); return true; } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value; textarea.style.position = "fixed"; textarea.style.opacity = "0";
    document.body.appendChild(textarea); textarea.select();
    const copied = document.execCommand("copy"); textarea.remove();
    return copied;
  }
}

export function SupportDialog({ canPrompt }: { canPrompt: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const payload = createPixPayload();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SupportStep>("intro");
  const [copied, setCopied] = useState(false);
  const close = useCallback((permanently = false) => {
    if (permanently) localStorage.setItem(DISMISSED_KEY, "true");
    else localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_MS));
    setOpen(false);
  }, []);
  const show = useCallback(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStep("intro"); setCopied(false); setOpen(true);
  }, []);
  useEffect(() => {
    const handler = () => show(); window.addEventListener(OPEN_EVENT, handler);
    return () => window.removeEventListener(OPEN_EVENT, handler);
  }, [show]);
  useEffect(() => {
    if (!canPrompt || localStorage.getItem(DISMISSED_KEY) === "true") return;
    const now = Date.now(); const firstSeen = Number(localStorage.getItem(FIRST_SEEN_KEY) ?? 0);
    if (!firstSeen) { localStorage.setItem(FIRST_SEEN_KEY, String(now)); return; }
    const nextPromptAt = Number(localStorage.getItem(COOLDOWN_KEY) ?? firstSeen + COOLDOWN_MS);
    if (now >= nextPromptAt) {
      const timer = window.setTimeout(show, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [canPrompt, show]);
  useEffect(() => {
    const dialog = dialogRef.current; if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  const copyPayload = async () => { if (payload && await copyText(payload)) { setCopied(true); setStep("thanks"); } };

  return <dialog ref={dialogRef} className="support-dialog" aria-labelledby="support-dialog-title" aria-describedby="support-dialog-description" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close(); }} onClose={() => { setOpen(false); requestAnimationFrame(() => triggerRef.current?.focus()); }}>
    <div className="support-dialog__panel">
      <button type="button" className="support-dialog__close" onClick={() => close()} aria-label="Fechar apoio ao ProvaScan"><X className="size-4" aria-hidden="true" /></button>
      <AnimatePresence mode="wait" initial={false}><motion.div key={step} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}>
        {step === "intro" ? <>
          <div className="support-dialog__mark"><Heart className="size-5" fill="currentColor" aria-hidden="true" /></div><p className="support-dialog__eyebrow">APOIO VOLUNTÁRIO</p>
          <h2 id="support-dialog-title" className="support-dialog__title">Ajude a manter o ProvaScan gratuito</h2>
          <p id="support-dialog-description" className="support-dialog__copy">O ProvaScan foi criado para facilitar a rotina de professores e continuará gratuito. Se a ferramenta está ajudando você e quiser contribuir com a manutenção e evolução do projeto, qualquer apoio é muito bem-vindo.</p>
          <p className="support-dialog__assurance">A contribuição é totalmente opcional e não libera nenhuma funcionalidade extra.</p>
          <div className="support-dialog__actions"><Button size="lg" className="w-full" onClick={() => setStep("pix")}><Heart className="size-4" fill="currentColor" aria-hidden="true" /> Apoiar o ProvaScan</Button><Button variant="ghost" className="w-full" onClick={() => close()}>Agora não</Button></div>
          <button type="button" className="support-dialog__never" onClick={() => close(true)}>Não mostrar novamente</button>
        </> : step === "pix" ? <>
          <div className="support-dialog__mark"><QrCode className="size-5" aria-hidden="true" /></div><p className="support-dialog__eyebrow">PIX VOLUNTÁRIO</p>
          <h2 id="support-dialog-title" className="support-dialog__title">Seu apoio faz diferença</h2>
          {isPixConfigured ? <div className="support-dialog__pix"><PixQrCode payload={payload} /><p>Escaneie com o aplicativo do seu banco</p><Button size="lg" className="w-full" onClick={() => void copyPayload()}><Copy className="size-4" aria-hidden="true" /> Copiar código PIX</Button></div> : <p className="support-dialog__setup">O PIX ainda não foi configurado. Defina as variáveis públicas de suporte antes de disponibilizar este canal.</p>}
          <button type="button" className="support-dialog__back" onClick={() => setStep("intro")}>Voltar</button>
        </> : <>
          <div className="support-dialog__mark support-dialog__mark--success"><Check className="size-5" aria-hidden="true" /></div><p className="support-dialog__eyebrow">CÓDIGO PRONTO</p>
          <h2 id="support-dialog-title" className="support-dialog__title">Obrigado por apoiar o ProvaScan 💜</h2><p id="support-dialog-description" className="support-dialog__copy">Seu apoio ajuda a manter o projeto gratuito e continuar melhorando a ferramenta.</p>
          {copied ? <p className="support-dialog__copied" role="status">Código PIX copiado!</p> : null}<Button size="lg" className="mt-7 w-full" onClick={() => close()}>Fechar</Button>
        </>}
      </motion.div></AnimatePresence>
    </div>
  </dialog>;
}
