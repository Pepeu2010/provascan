"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, Menu } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { DashboardSidebar, dashboardNavigationItems } from "@/components/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const DIALOG_TRANSITION_MS = 200;

export function DashboardShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const router = useRouter();
  const { authResolved, data, isHydrated, logoutTeacher, session, syncError, syncStatus } = useAppData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialogReady, setDialogReady] = useState(false);
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogTransitionHandlerRef = useRef<((event: TransitionEvent) => void) | null>(null);
  const activeLabel = dashboardNavigationItems.find((item) => item.href === active)?.label ?? "Painel";

  const summary = useMemo(
    () =>
      [
        `${data.classes.length} turmas`,
        `${data.students.length} alunos`,
        `${data.exams.length} provas`,
        `${data.corrections.length} correções`,
      ].join(" • "),
    [data.classes.length, data.corrections.length, data.exams.length, data.students.length],
  );

  const clearDialogCloseTransition = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialogTransitionHandlerRef.current && dialog) {
      dialog.removeEventListener("transitionend", dialogTransitionHandlerRef.current);
    }
    if (dialogCloseTimerRef.current) {
      clearTimeout(dialogCloseTimerRef.current);
    }
    dialogTransitionHandlerRef.current = null;
    dialogCloseTimerRef.current = null;
  }, []);

  const finishMobileClose = useCallback(() => {
    clearDialogCloseTransition();
    const dialog = dialogRef.current;
    setDialogReady(false);
    if (dialog?.open) {
      dialog.close();
      return;
    }
    setMobileMenuOpen(false);
  }, [clearDialogCloseTransition]);

  const requestMobileClose = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) {
      setMobileMenuOpen(false);
      setDialogReady(false);
      return;
    }

    clearDialogCloseTransition();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      finishMobileClose();
      return;
    }

    setDialogReady(false);
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== dialog || event.propertyName !== "opacity") return;
      finishMobileClose();
    };
    dialogTransitionHandlerRef.current = onTransitionEnd;
    dialog.addEventListener("transitionend", onTransitionEnd);
    dialogCloseTimerRef.current = setTimeout(finishMobileClose, DIALOG_TRANSITION_MS + 80);
  }, [clearDialogCloseTransition, finishMobileClose]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const frame = requestAnimationFrame(() => setDialogReady(true));
    return () => cancelAnimationFrame(frame);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen && !tabletExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen, tabletExpanded]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      clearDialogCloseTransition();
      if (dialog?.open) dialog.close();
    };
  }, [clearDialogCloseTransition, mobileMenuOpen]);

  useEffect(() => {
    if (isHydrated && authResolved && !session) router.replace("/login");
  }, [authResolved, isHydrated, router, session]);

  if (isHydrated && authResolved && !session) {
    return <SessionNotice label="Sessão necessária" title="Redirecionando para o login do professor" detail="O painel exige uma sessão ativa neste navegador para reduzir a exposição acidental do workspace." />;
  }

  if (isHydrated && !authResolved) {
    return <SessionNotice label="Validando sessão" title="Confirmando acesso ao painel" detail="O painel aguarda a validação da sessão antes de decidir qualquer redirecionamento." />;
  }

  return (
    <div className="dashboard-shell">
      {tabletExpanded ? (
        <button
          type="button"
          className="dashboard-tablet-scrim"
          aria-label="Fechar navegação expandida"
          onClick={() => setTabletExpanded(false)}
        />
      ) : null}

      <div className="dashboard-shell__sidebar-slot">
        <DashboardSidebar
          active={active}
          compact={!tabletExpanded}
          expanded={tabletExpanded}
          onNavigate={() => setTabletExpanded(false)}
          onToggleCompact={() => setTabletExpanded((value) => !value)}
        />
      </div>

      <main className="dashboard-shell__main">
        <header className="dashboard-shell-panel mb-4 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={menuTriggerRef}
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card-solid)] text-[var(--foreground)] md:hidden"
                aria-label="Abrir menu"
                aria-expanded={mobileMenuOpen}
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <h1 className="dashboard-section-title text-2xl font-semibold text-[var(--foreground)] sm:text-3xl">{activeLabel}</h1>
                <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">{summary}</p>
              </div>
            </div>

            <div className="flex flex-none items-center justify-end gap-2">
              {syncStatus === "saving" ? (
                <div aria-live="polite" className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] px-3 py-2 text-xs font-semibold text-[var(--accent)]">
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  Salvando alterações
                </div>
              ) : null}
              <Button variant="ghost" className="hidden sm:inline-flex" onClick={async () => { await logoutTeacher(); router.push("/login"); }}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {syncStatus === "error" && syncError ? (
          <Card className="mb-6 border-[color-mix(in_srgb,var(--error)_38%,var(--border))] bg-[color-mix(in_srgb,var(--error)_10%,var(--card-solid))] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--error)]">Falha na carga operacional</p>
            <p className="mt-3 text-base font-semibold text-[var(--foreground)]">O painel não conseguiu carregar os dados.</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">{syncError}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">Se este login for de professor, confira a coluna `disciplina` na aba `usuários`.</p>
          </Card>
        ) : null}

        {children}
      </main>

      {mobileMenuOpen ? (
        <dialog
          ref={dialogRef}
          className="dashboard-mobile-dialog"
          data-ready={dialogReady ? "true" : "false"}
          aria-label="Menu de navegação"
          onCancel={(event) => {
            event.preventDefault();
            requestMobileClose();
          }}
          onClick={(event) => {
            const dialog = event.currentTarget;
            const bounds = dialog.getBoundingClientRect();
            const clickedOutsidePanel = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
            if (clickedOutsidePanel) requestMobileClose();
          }}
          onClose={() => {
            clearDialogCloseTransition();
            setDialogReady(false);
            setMobileMenuOpen(false);
            requestAnimationFrame(() => menuTriggerRef.current?.focus());
          }}
        >
          <DashboardSidebar active={active} modal onNavigate={requestMobileClose} onRequestClose={requestMobileClose} />
        </dialog>
      ) : null}
    </div>
  );
}

function SessionNotice({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{detail}</p>
      </Card>
    </div>
  );
}
