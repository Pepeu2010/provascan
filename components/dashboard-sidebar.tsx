"use client";

import Link from "next/link";
import {
  BarChart3,
  BookCheck,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ScanLine,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { canAccessSensitiveSettings } from "@/lib/access-control";
import { getSubjectLabel } from "@/lib/subject-scope";
import { cn } from "@/lib/utils";

export const dashboardNavigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/turmas", label: "Turmas", icon: GraduationCap },
  { href: "/dashboard/alunos", label: "Alunos", icon: Users },
  { href: "/dashboard/provas", label: "Provas", icon: BookCheck },
  { href: "/dashboard/gabaritos", label: "Gabaritos", icon: ClipboardCheck },
  { href: "/dashboard/correcao", label: "Correção por foto", icon: ScanLine },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings, privileged: true },
];

type DashboardSidebarProps = {
  active: string;
  compact?: boolean;
  expanded?: boolean;
  modal?: boolean;
  onNavigate: () => void;
  onToggleCompact?: () => void;
  onRequestClose?: () => void;
};

export function DashboardSidebar({
  active,
  compact = false,
  expanded = false,
  modal = false,
  onNavigate,
  onToggleCompact,
  onRequestClose,
}: DashboardSidebarProps) {
  const { data, session } = useAppData();
  const subjectLabel = getSubjectLabel(session?.subject);
  const summary = [
    `${data.classes.length} turmas`,
    `${data.students.length} alunos`,
    `${data.exams.length} provas`,
    `${data.corrections.length} correções`,
  ].join(" · ");

  return (
    <aside
      className={cn(
        "dashboard-sidebar",
        compact && "dashboard-sidebar--compact",
        expanded && "dashboard-sidebar--expanded",
        modal && "dashboard-sidebar--modal",
      )}
      aria-label="Navegação do dashboard"
    >
      <header className="dashboard-sidebar__header">
        <ProvaScanLogo variant="sidebar" className="dashboard-sidebar__logo" />
        {modal ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="dashboard-sidebar__icon-button dashboard-sidebar__close"
            aria-label="Fechar menu"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : onToggleCompact ? (
          <button
            type="button"
            onClick={onToggleCompact}
            className="dashboard-sidebar__icon-button dashboard-sidebar__expand"
            aria-label={expanded ? "Recolher navegação" : "Expandir navegação"}
            aria-expanded={expanded}
          >
            <ChevronRight className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <section className="dashboard-sidebar__workspace" aria-label="Workspace ativo">
        <p className="dashboard-sidebar__eyebrow">Workspace ativo</p>
        <p className="dashboard-sidebar__workspace-name">{data.teacherProfile.escola}</p>
        <p className="dashboard-sidebar__workspace-summary">{summary}</p>
        {subjectLabel ? <p className="dashboard-sidebar__subject">Matéria: {subjectLabel}</p> : null}
      </section>

      <nav className="dashboard-sidebar__navigation" aria-label="Navegação principal">
        {dashboardNavigationItems
          .filter((item) => !item.privileged || canAccessSensitiveSettings(session?.role ?? "professor"))
          .map((item) => {
            const Icon = item.icon;
            const isActive = active === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                aria-label={compact ? item.label : undefined}
                title={compact ? item.label : undefined}
                className={cn("dashboard-sidebar__item", isActive && "dashboard-sidebar__item--active")}
              >
                <span className="dashboard-sidebar__item-icon">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="dashboard-sidebar__item-label">{item.label}</span>
                {isActive ? <span className="dashboard-sidebar__active-indicator" aria-hidden="true" /> : null}
              </Link>
            );
          })}
      </nav>

      <footer className="dashboard-sidebar__footer">
        <div className="dashboard-sidebar__access">
          <div>
            <p className="dashboard-sidebar__access-label">Acesso atual</p>
            <p className="dashboard-sidebar__access-role">{session?.role ?? "professor"}</p>
          </div>
          <Badge tone="accent">Online</Badge>
        </div>
        {modal ? <ThemeSwitcher compact /> : null}
        <p className="dashboard-sidebar__credit">Desenvolvido por Pedro Miguel</p>
      </footer>
    </aside>
  );
}
