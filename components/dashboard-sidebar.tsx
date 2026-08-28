"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import {
  BarChart3,
  BookCheck,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Heart,
  LayoutDashboard,
  LogOut,
  ScanLine,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { Button } from "@/components/ui/button";
import { canAccessSensitiveSettings } from "@/lib/access-control";
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
  closing?: boolean;
  modal?: boolean;
  onNavigate: () => void;
  onToggleCompact?: () => void;
  onRequestClose?: () => void;
};

export function DashboardSidebar({
  active,
  compact = false,
  expanded = false,
  closing = false,
  modal = false,
  onNavigate,
  onToggleCompact,
  onRequestClose,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { data, logoutTeacher, session } = useAppData();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLogout = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      await logoutTeacher();
      onNavigate();
      router.replace("/login");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <aside
      className={cn(
        "dashboard-sidebar",
        compact && "dashboard-sidebar--compact",
        expanded && "dashboard-sidebar--expanded",
        closing && "dashboard-sidebar--closing",
        modal && "dashboard-sidebar--modal",
      )}
      aria-label="Navegação do dashboard"
    >
      <header className="dashboard-sidebar__header">
        <ProvaScanLogo variant="sidebar" compact={compact} className="dashboard-sidebar__logo" />
        {modal ? (
          <button type="button" onClick={onRequestClose} className="dashboard-sidebar__icon-button dashboard-sidebar__close" aria-label="Fechar menu">
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : onToggleCompact ? (
          <button type="button" onClick={onToggleCompact} className="dashboard-sidebar__icon-button dashboard-sidebar__expand" aria-label={expanded ? "Recolher navegação" : "Expandir navegação"} aria-expanded={expanded}>
            <ChevronRight className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")} aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <section className="dashboard-sidebar__workspace" aria-label="Workspace ativo">
        <p className="dashboard-sidebar__workspace-name">{data.teacherProfile.escola}</p>
      </section>

      <nav className="dashboard-sidebar__navigation" aria-label="Navegação principal">
        {(session?.role === "professor"
          ? [
              { href: "/dashboard/minhas-provas", label: "Minhas provas", icon: ClipboardCheck },
              { href: "/dashboard/correcao", label: "Correção por foto", icon: ScanLine },
            ]
          : dashboardNavigationItems.filter((item) => !item.privileged || canAccessSensitiveSettings(session?.role ?? "professor")))
          .map((item, index) => {
            const Icon = item.icon;
            const isActive = active === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} aria-label={compact ? item.label : undefined} title={compact ? item.label : undefined} className={cn("dashboard-sidebar__item", isActive && "dashboard-sidebar__item--active")} style={{ "--sidebar-item-index": index } as CSSProperties}>
                <span className="dashboard-sidebar__item-icon"><Icon className="size-[18px]" aria-hidden="true" /></span>
                <span className="dashboard-sidebar__item-label">{item.label}</span>
                {isActive ? <span className="dashboard-sidebar__active-indicator" aria-hidden="true" /> : null}
              </Link>
            );
          })}
      </nav>

      <div className="dashboard-sidebar__support">
        <button type="button" onClick={() => { onNavigate(); window.dispatchEvent(new Event("provascan:open-support")); }} aria-label={compact ? "Apoiar o ProvaScan" : undefined} title={compact ? "Apoiar o ProvaScan" : undefined} className="dashboard-sidebar__item dashboard-sidebar__support-button">
          <span className="dashboard-sidebar__item-icon"><Heart className="size-[18px]" aria-hidden="true" /></span>
          <span className="dashboard-sidebar__item-label">Apoiar o ProvaScan</span>
        </button>
        <Button variant="ghost" loading={isLeaving} onClick={() => void handleLogout()} className="dashboard-sidebar__logout" aria-label="Sair da conta">
          <LogOut className="size-[18px]" aria-hidden="true" />
          <span className="dashboard-sidebar__item-label">Sair</span>
        </Button>
      </div>
    </aside>
  );
}
