"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookCheck,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { CreatorCredit } from "@/components/creator-credit";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canAccessSensitiveSettings } from "@/lib/access-control";
import { getSubjectLabel } from "@/lib/subject-scope";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/turmas", label: "Turmas", icon: GraduationCap },
  { href: "/dashboard/alunos", label: "Alunos", icon: Users },
  { href: "/dashboard/provas", label: "Provas", icon: BookCheck },
  { href: "/dashboard/gabaritos", label: "Gabaritos", icon: ClipboardCheck },
  { href: "/dashboard/correcao", label: "Correção por foto", icon: ScanLine },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings, privileged: true },
];

export function DashboardShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const router = useRouter();
  const { authResolved, data, isHydrated, logoutTeacher, session, syncError, syncStatus } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const subjectLabel = getSubjectLabel(session?.subject);

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

  useEffect(() => {
    if (isHydrated && authResolved && !session) {
      router.replace("/login");
    }
  }, [authResolved, isHydrated, router, session]);

  if (isHydrated && authResolved && !session) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl p-6">
          <p className="text-sm text-[var(--muted-foreground)]">Sessão necessária</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Redirecionando para o login do professor
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            O painel exige uma sessão ativa neste navegador para reduzir a exposição acidental do workspace.
          </p>
        </Card>
      </div>
    );
  }

  if (isHydrated && !authResolved) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl p-6">
          <p className="text-sm text-[var(--muted-foreground)]">Validando sessão</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Confirmando acesso ao painel
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            O painel aguarda a validação da sessão antes de decidir qualquer redirecionamento.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-4 py-4 lg:px-6">
      <aside className="hidden w-[296px] shrink-0 lg:flex lg:flex-col">
        <Card className="dashboard-shell-panel sticky top-4 p-5">
          <div className="flex h-full flex-col">
            <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_98%,transparent),transparent)] p-4">
              <ProvaScanLogo variant="sidebar" />
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Workspace ativo
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{data.teacherProfile.escola}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{summary}</p>
                {subjectLabel ? (
                  <p className="mt-2 text-sm font-medium text-[var(--accent)]">Matéria: {subjectLabel}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {renderNavItems(active, session?.role ?? "professor", () => setMenuOpen(false))}
            </div>

            <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-strong)_92%,transparent),transparent)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Acesso atual</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{session?.role ?? "professor"}</p>
                </div>
                <Badge tone="accent">Online</Badge>
              </div>
            </div>

            <div className="mt-auto rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_98%,transparent),color-mix(in_srgb,var(--surface)_86%,transparent))] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Ambiente ativo
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">Painel operacional pronto</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                O painel está pronto para uso. Backup e restauração continuam disponíveis em Configurações.
              </p>
            </div>
            <CreatorCredit className="mt-4" />
          </div>
        </Card>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="dashboard-shell-panel relative z-40 mb-6 overflow-hidden rounded-[32px] border border-[var(--border)] p-4 sm:p-5">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(107,231,216,0.1),transparent_26%)]" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start justify-between gap-3 xl:block">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_94%,transparent)] text-[var(--foreground)] lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="neutral">Workspace do professor</Badge>
                  <Badge tone="accent">Monitoramento ao vivo</Badge>
                  <CreatorCredit variant="badge" />
                  {subjectLabel ? <Badge tone="warning">Matéria: {subjectLabel}</Badge> : null}
                </div>
                <h1 className="dashboard-section-title mt-4 text-2xl font-semibold text-[var(--foreground)] sm:text-4xl">
                  {data.teacherProfile.escola}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">{summary}</p>
                {subjectLabel ? (
                  <p className="mt-2 text-sm font-medium text-[var(--accent)]">
                    As provas, os gabaritos e as correções desta sessão estão vinculados a {subjectLabel}.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:hidden">
              <div className="rounded-[22px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_88%,transparent)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Sessão</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{session?.nome ?? data.teacherProfile.nome}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_88%,transparent)] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Perfil</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold capitalize text-[var(--foreground)]">{session?.role ?? "professor"}</p>
                  <Badge tone="accent">Online</Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 xl:max-w-[360px]">
              <ThemeSwitcher />
              <div className="hidden min-w-[150px] rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_96%,transparent),transparent)] px-4 py-3 text-right sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Sessão atual
                </p>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {session?.nome ?? data.teacherProfile.nome}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={async () => {
                  await logoutTeacher();
                  router.push("/login");
                }}
              >
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        {syncStatus === "error" && syncError ? (
          <Card className="mb-6 border-[color-mix(in_srgb,var(--error)_38%,var(--border))] bg-[color-mix(in_srgb,var(--error)_10%,var(--card-solid))] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--error)]">
              Falha na carga operacional
            </p>
            <p className="mt-3 text-base font-semibold text-[var(--foreground)]">
              O painel não conseguiu carregar os dados da planilha.
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">{syncError}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              Se este login for de professor, confira a coluna `disciplina` na aba `usuários`.
            </p>
          </Card>
        ) : null}

        {children}
      </main>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--overlay-scrim)] backdrop-blur-sm lg:hidden"
          >
            <motion.div
              initial={{ x: -24, opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0.9 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 flex w-[84vw] max-w-sm flex-col border-r border-[var(--border)] bg-[var(--card-solid)] p-5 shadow-[var(--shadow-floating)]"
            >
              <div className="flex items-center justify-between">
                <ProvaScanLogo variant="sidebar" className="max-w-[220px]" />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  aria-label="Fechar menu"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-6 space-y-1.5">
                {renderNavItems(active, session?.role ?? "professor", () => setMenuOpen(false))}
              </div>
              <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_88%,transparent),transparent)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Workspace ativo</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{data.teacherProfile.escola}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{summary}</p>
                {subjectLabel ? <p className="mt-2 text-sm font-medium text-[var(--accent)]">Matéria: {subjectLabel}</p> : null}
              </div>
              <div className="mt-6">
                <ThemeSwitcher compact />
              </div>
              <CreatorCredit className="mt-6" />
              <div className="mt-auto rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-strong)_92%,transparent),transparent)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {session?.nome ?? data.teacherProfile.nome}
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function renderNavItems(active: string, role: string, onNavigate: () => void) {
  return items
    .filter((item) => !item.privileged || canAccessSensitiveSettings(role))
    .map((item) => {
      const Icon = item.icon;
      const isActive = active === item.href;

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200",
            isActive
              ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-contrast)_62%,transparent),transparent)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
              : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] hover:text-[var(--foreground)]",
          )}
        >
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl border transition-colors",
              isActive
                ? "border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--accent-soft)_76%,transparent)] text-[var(--accent)]"
                : "border-transparent bg-transparent text-[var(--muted-foreground)] group-hover:bg-[var(--card-solid)]",
            )}
          >
            <Icon className="size-4" />
          </span>
          <span className="flex-1">{item.label}</span>
          {isActive ? <span className="size-2 rounded-full bg-[var(--accent)]" aria-hidden="true" /> : null}
        </Link>
      );
    });
}
