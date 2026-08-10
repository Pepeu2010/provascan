"use client";

import { usePathname, useRouter } from "next/navigation";
import { Command, LoaderCircle, LogOut, Menu, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLoading from "@/app/dashboard/loading";
import { useAppData } from "@/components/app-data-provider";
import { DashboardSidebar, dashboardNavigationItems } from "@/components/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canAccessSensitiveSettings } from "@/lib/access-control";

const DIALOG_TRANSITION_MS = 200;
const TABLET_SIDEBAR_TRANSITION_MS = 280;

export function DashboardShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { authResolved, data, isHydrated, logoutTeacher, operationalDataReady, session, syncError, syncStatus } = useAppData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dialogReady, setDialogReady] = useState(false);
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [tabletSidebarClosing, setTabletSidebarClosing] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ label: string; path: string } | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const commandDialogRef = useRef<HTMLDialogElement | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogTransitionHandlerRef = useRef<((event: TransitionEvent) => void) | null>(null);
  const tabletCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const commandItems = useMemo(
    () => (session?.role === "professor"
      ? [{ href: "/dashboard/minhas-provas", label: "Minhas provas", icon: Command }]
      : dashboardNavigationItems.filter((item) => !item.privileged || canAccessSensitiveSettings(session?.role ?? "professor"))),
    [session?.role],
  );
  const visibleCommandItems = commandItems.filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(commandQuery.trim().toLocaleLowerCase("pt-BR")));

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

  const requestTabletClose = useCallback(() => {
    if (!tabletExpanded || tabletSidebarClosing) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTabletExpanded(false);
      return;
    }

    setTabletSidebarClosing(true);
    tabletCloseTimerRef.current = setTimeout(() => {
      setTabletExpanded(false);
      setTabletSidebarClosing(false);
      tabletCloseTimerRef.current = null;
    }, TABLET_SIDEBAR_TRANSITION_MS);
  }, [tabletExpanded, tabletSidebarClosing]);

  const toggleTabletSidebar = useCallback(() => {
    if (tabletExpanded) {
      requestTabletClose();
      return;
    }

    setTabletSidebarClosing(false);
    setTabletExpanded(true);
  }, [requestTabletClose, tabletExpanded]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const dialog = commandDialogRef.current;
    if (!dialog) return;
    if (commandOpen && !dialog.open) dialog.showModal();
    if (!commandOpen && dialog.open) dialog.close();
  }, [commandOpen]);

  useEffect(() => {
    return () => {
      if (tabletCloseTimerRef.current) clearTimeout(tabletCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isHydrated && authResolved && !session) router.replace("/login");
  }, [authResolved, isHydrated, router, session]);

  useEffect(() => {
    const showNavigationFeedback = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target || target.hasAttribute("download") || target.getAttribute("target") === "_blank") return;

      const href = target.getAttribute("href");
      if (!href) return;

      const destination = new URL(href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin || destination.pathname === current.pathname) return;

      const label = target.getAttribute("aria-label") || target.textContent?.trim() || "a próxima área";
      setPendingNavigation({ label: label.replace(/\s+/g, " "), path: destination.pathname });
    };

    document.addEventListener("click", showNavigationFeedback, true);
    return () => document.removeEventListener("click", showNavigationFeedback, true);
  }, []);

  if (isHydrated && authResolved && !session) {
    return <SessionNotice label="Sessão necessária" title="Redirecionando para o login do professor" detail="O painel exige uma sessão ativa neste navegador para reduzir a exposição acidental do workspace." />;
  }

  if (!isHydrated || !authResolved || (session && !operationalDataReady)) {
    return <DashboardLoading />;
  }

  return (
    <div className="dashboard-shell">
      {pendingNavigation && pendingNavigation.path !== pathname ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgb(4_3_7_/_66%)] p-5 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex min-w-[230px] items-center gap-3 rounded-[20px] border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-[var(--card-solid)] px-5 py-4 shadow-[var(--shadow-floating)]">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            </span>
            <span className="grid gap-0.5">
              <strong className="text-sm font-semibold text-[var(--foreground)]">Carregando</strong>
              <span className="max-w-[220px] truncate text-xs text-[var(--muted-foreground)]">Abrindo {pendingNavigation.label}</span>
            </span>
          </div>
        </div>
      ) : null}
      {tabletExpanded ? (
        <button
          type="button"
          className={tabletSidebarClosing ? "dashboard-tablet-scrim dashboard-tablet-scrim--closing" : "dashboard-tablet-scrim"}
          aria-label="Fechar navegação expandida"
          onClick={requestTabletClose}
        />
      ) : null}

      <div className="dashboard-shell__sidebar-slot">
        <DashboardSidebar
          active={active}
          compact={!tabletExpanded}
          expanded={tabletExpanded}
          closing={tabletSidebarClosing}
          onNavigate={requestTabletClose}
          onToggleCompact={toggleTabletSidebar}
        />
      </div>

      <main className="dashboard-shell__main">
        <header className="dashboard-shell-panel mb-4 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-4 sm:px-5">
          <div className="app-page-header">
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
                <p className="app-page-header__eyebrow">Workspace · {session?.role === "professor" ? "Professor" : "Gestão acadêmica"}</p>
                <h1 className="app-page-header__title">{activeLabel}</h1>
                <p className="app-page-header__meta truncate">{summary}</p>
              </div>
            </div>

            <div className="flex flex-none items-center justify-end gap-2">
              <button type="button" className="app-page-header__command" onClick={() => setCommandOpen(true)} aria-label="Abrir busca rápida">
                <Search className="size-4" aria-hidden="true" />
                <span>Ir para uma área</span>
                <kbd>Ctrl K</kbd>
              </button>
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
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">Confira se o perfil e o status de acesso deste usuário estão corretos.</p>
          </Card>
        ) : null}

        <div key={pathname} className="dashboard-page-transition">
          {children}
        </div>
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
      <dialog
        ref={commandDialogRef}
        className="command-palette"
        aria-label="Busca rápida"
        onClose={() => { setCommandOpen(false); setCommandQuery(""); }}
      >
        <form method="dialog">
          <input
            autoFocus
            className="command-palette__input"
            value={commandQuery}
            onChange={(event) => setCommandQuery(event.target.value)}
            placeholder="Ir para…"
            aria-label="Filtrar áreas"
          />
        </form>
        <div className="command-palette__list" role="list">
          {visibleCommandItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.href} type="button" className="command-palette__item" onClick={() => { setCommandOpen(false); router.push(item.href); }}><span><Icon className="size-4" aria-hidden="true" /></span>{item.label}</button>;
          })}
          {!visibleCommandItems.length ? <p className="command-palette__empty">Nenhuma área encontrada.</p> : null}
        </div>
      </dialog>
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
