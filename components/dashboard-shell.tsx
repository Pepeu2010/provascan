"use client";

import Link from "next/link";
import {
  BarChart3,
  BookCheck,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ScanLine,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { teacherProfile } from "@/lib/mock-data";
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
      <aside className="hidden w-[280px] shrink-0 rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-5 lg:flex lg:flex-col">
        <ProvaScanLogo />
        <div className="mt-8 space-y-1">{renderNavItems(active, () => setMenuOpen(false))}</div>
        <div className="mt-auto rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] p-5">
          <p className="text-sm font-semibold text-[var(--foreground)]">Próxima etapa</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Conecte a Planilha Google e habilite o OCR para sair do modo demonstrativo.
          </p>
          <Button className="mt-4 w-full">Conectar planilha</Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="relative z-40 mb-6 flex flex-col gap-4 rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start justify-between gap-3 sm:block">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] text-[var(--foreground)] lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Workspace do professor</p>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                {teacherProfile.escola}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] px-4 py-2 text-right sm:block">
              <p className="text-sm font-semibold text-[var(--foreground)]">{teacherProfile.nome}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{teacherProfile.email}</p>
            </div>
            <Button variant="secondary">Exportar visão</Button>
          </div>
        </header>
        {children}
      </main>
      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-[var(--overlay-scrim)] backdrop-blur-sm lg:hidden">
          <div className="absolute inset-y-0 left-0 flex w-[82vw] max-w-sm flex-col border-r border-[var(--border)] bg-[var(--card-solid)] p-5 shadow-[var(--shadow-floating)]">
            <div className="flex items-center justify-between">
              <ProvaScanLogo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6 space-y-1">{renderNavItems(active, () => setMenuOpen(false))}</div>
            <div className="mt-6">
              <ThemeSwitcher compact />
            </div>
            <div className="mt-auto rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Professor</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{teacherProfile.nome}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{teacherProfile.email}</p>
            </div>
          </div>
        </div>
      ) : null}
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
          "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium",
          isActive
            ? "bg-[var(--surface-strong)] text-[var(--foreground)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
        )}
      >
        <Icon className="size-4" />
        {item.label}
      </Link>
    );
  });
}
