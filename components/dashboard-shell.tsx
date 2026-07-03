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
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/turmas", label: "Turmas", icon: GraduationCap },
  { href: "/dashboard/alunos", label: "Alunos", icon: Users },
  { href: "/dashboard/provas", label: "Provas", icon: BookCheck },
  { href: "/dashboard/gabaritos", label: "Gabaritos", icon: ClipboardCheck },
  { href: "/dashboard/correcao", label: "Correção por foto", icon: ScanLine },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function DashboardShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const router = useRouter();
  const { data, isHydrated, logoutTeacher, session } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (isHydrated && !session) {
      router.replace("/login");
    }
  }, [isHydrated, router, session]);

  if (isHydrated && !session) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl p-6">
          <p className="text-sm text-[var(--muted-foreground)]">Sessão necessária</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Redirecionando para o login do professor
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            O painel exige uma sessão ativa neste navegador para reduzir exposição acidental do workspace.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-4 py-4 lg:px-6">
      <aside className="hidden w-[296px] shrink-0 lg:flex lg:flex-col">
        <Card className="sticky top-4 p-5">
          <div className="flex h-full flex-col">
            <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),transparent)] p-4">
              <ProvaScanLogo variant="sidebar" />
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Workspace ativo
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{data.teacherProfile.escola}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{summary}</p>
              </div>
            </div>

            <div className="mt-6 space-y-1.5">{renderNavItems(active, () => setMenuOpen(false))}</div>

            <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),transparent)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Acesso atual</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{session?.role ?? "professor"}</p>
                </div>
                <Badge tone="accent">Online</Badge>
              </div>
            </div>

            <div className="mt-auto rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Ambiente ativo</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                O painel está pronto para uso. Backup e restauração continuam disponíveis em Configurações.
              </p>
            </div>
          </div>
        </Card>
      </aside>

      <main className="min-w-0 flex-1">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative z-40 mb-6 overflow-hidden rounded-[32px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-5"
        >
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.1),transparent_24%)]" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start justify-between gap-3 xl:block">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] text-[var(--foreground)] lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="neutral">Workspace do professor</Badge>
                  <Badge tone="accent">Resposta imediata</Badge>
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl">
                  {data.teacherProfile.escola}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">{summary}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <ThemeSwitcher />
              <div className="hidden rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_86%,transparent)] px-4 py-3 text-right sm:block">
                <p className="text-sm font-semibold text-[var(--foreground)]">{session?.nome ?? data.teacherProfile.nome}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{session?.email ?? data.teacherProfile.email}</p>
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
        </motion.header>

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
              <div className="mt-6 space-y-1.5">{renderNavItems(active, () => setMenuOpen(false))}</div>
              <div className="mt-6">
                <ThemeSwitcher compact />
              </div>
              <div className="mt-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">{session?.nome ?? data.teacherProfile.nome}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{session?.email ?? data.teacherProfile.email}</p>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function renderNavItems(active: string, onNavigate: () => void) {
  return items.map((item) => {
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
            ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,var(--surface-strong),transparent)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"
            : "border-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
        )}
      >
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl border transition-colors",
            isActive
              ? "border-[var(--border)] bg-[var(--card-solid)] text-[var(--accent)]"
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
