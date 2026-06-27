"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookCheck,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Settings,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  { href: "/dashboard/correcao", label: "Correcao por foto", icon: ScanLine },
  { href: "/dashboard/relatorios", label: "Relatorios", icon: BarChart3 },
  { href: "/dashboard/configuracoes", label: "Configuracoes", icon: Settings },
];

type OverlayMode = "none" | "integration" | "export";

export function DashboardShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data, exportData, getOperationalCsv, importData, isHydrated, logoutTeacher, session } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("none");
  const [message, setMessage] = useState("");

  const summary = useMemo(
    () => [
      `${data.classes.length} turmas`,
      `${data.students.length} alunos`,
      `${data.exams.length} provas`,
      `${data.corrections.length} correcoes`,
    ].join(" • "),
    [data.classes.length, data.corrections.length, data.exams.length, data.students.length],
  );

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`provascan-backup-${stamp}.json`, exportData(), "application/json");
    downloadFile(`provascan-resumo-${stamp}.csv`, getOperationalCsv(), "text/csv;charset=utf-8");
    setMessage("Backup JSON e resumo CSV baixados com sucesso.");
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    const result = importData(text);
    setMessage(result.message);
    if (result.ok) {
      setOverlayMode("none");
    }
  };

  useEffect(() => {
    if (isHydrated && !session) {
      router.replace("/login");
    }
  }, [isHydrated, router, session]);

  if (isHydrated && !session) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[960px] items-center justify-center px-4 py-10">
        <Card className="w-full max-w-xl p-6">
          <p className="text-sm text-[var(--muted-foreground)]">Sessao local necessaria</p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            Redirecionando para o login do professor
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
            O painel local exige uma sessao ativa neste navegador para reduzir exposicao acidental do workspace.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[280px] shrink-0 rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-5 lg:flex lg:flex-col">
          <ProvaScanLogo variant="sidebar" />
          <div className="mt-8 space-y-1">{renderNavItems(active, () => setMenuOpen(false))}</div>
          <div className="mt-auto rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] p-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">Operacao local ativa</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Seu fluxo base ja funciona sem servicos externos. Use backup, importacao e painel de integracao quando precisar.
            </p>
            <Button className="mt-4 w-full" onClick={() => setOverlayMode("integration")}>
              Conectar planilha
            </Button>
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
                  {data.teacherProfile.escola}
                </h1>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{summary}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <ThemeSwitcher />
              <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] px-4 py-2 text-right sm:block">
                <p className="text-sm font-semibold text-[var(--foreground)]">{data.teacherProfile.nome}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{session?.email ?? data.teacherProfile.email}</p>
              </div>
              <Button variant="secondary" onClick={() => setOverlayMode("export")}>
                Exportar visao
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  logoutTeacher();
                  router.push("/login");
                }}
              >
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </header>
          {message ? (
            <div className="mb-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              {message}
            </div>
          ) : null}
          {children}
        </main>
        {menuOpen ? (
          <div className="fixed inset-0 z-50 bg-[var(--overlay-scrim)] backdrop-blur-sm lg:hidden">
            <div className="absolute inset-y-0 left-0 flex w-[82vw] max-w-sm flex-col border-r border-[var(--border)] bg-[var(--card-solid)] p-5 shadow-[var(--shadow-floating)]">
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
              <div className="mt-6 space-y-1">{renderNavItems(active, () => setMenuOpen(false))}</div>
              <div className="mt-6">
                <ThemeSwitcher compact />
              </div>
              <div className="mt-6 grid gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setMenuOpen(false);
                    setOverlayMode("integration");
                  }}
                >
                  Conectar planilha
                </Button>
                <Button
                  onClick={() => {
                    setMenuOpen(false);
                    handleExportAll();
                  }}
                >
                  Exportar backup
                </Button>
              </div>
              <div className="mt-auto rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-sm font-semibold text-[var(--foreground)]">Professor</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{data.teacherProfile.nome}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{session?.email ?? data.teacherProfile.email}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => {
          void handleImportFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      {overlayMode !== "none" ? (
        <div className="fixed inset-0 z-[80] bg-[var(--overlay-scrim)] px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-3xl items-center justify-center">
            <Card className="w-full max-h-[90vh] overflow-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {overlayMode === "integration" ? "Integracao e continuidade" : "Exportacao operacional"}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    {overlayMode === "integration" ? "Painel de integracao local" : "Baixe o estado atual do ProvaScan"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOverlayMode("none")}
                  className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  aria-label="Fechar painel"
                >
                  <X className="size-5" />
                </button>
              </div>

              {overlayMode === "integration" ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="size-5 text-[var(--accent)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">Status atual</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Operacao local pronta para uso no Vercel.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="accent">Sem dependencia externa</Badge>
                      <Badge tone="neutral">Backup local habilitado</Badge>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
                      Quando quiser evoluir para Google Sheets, use esta base local como origem oficial para importar, validar e subir dados.
                    </p>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Proximos passos uteis</p>
                    <div className="mt-4 grid gap-3">
                      <Button onClick={handleExportAll}>
                        <Download className="size-4" />
                        Baixar backup e resumo
                      </Button>
                      <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="size-4" />
                        Importar backup JSON
                      </Button>
                      <Link
                        href="/dashboard/configuracoes"
                        onClick={() => setOverlayMode("none")}
                        className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                      >
                        Abrir configuracoes
                      </Link>
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Card className="p-5">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Backup completo</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Exporta todas as turmas, alunos, provas, gabaritos, correcoes e perfil local em JSON.
                    </p>
                    <Button className="mt-5 w-full" onClick={() => {
                      const stamp = new Date().toISOString().slice(0, 10);
                      downloadFile(`provascan-backup-${stamp}.json`, exportData(), "application/json");
                      setMessage("Backup JSON baixado com sucesso.");
                      setOverlayMode("none");
                    }}>
                      <Download className="size-4" />
                      Exportar JSON
                    </Button>
                  </Card>
                  <Card className="p-5">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Resumo para planilhas</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                      Baixa um CSV enxuto com contagem operacional para auditoria e conferencia rapida.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-5 w-full"
                      onClick={() => {
                        const stamp = new Date().toISOString().slice(0, 10);
                        downloadFile(`provascan-resumo-${stamp}.csv`, getOperationalCsv(), "text/csv;charset=utf-8");
                        setMessage("Resumo CSV baixado com sucesso.");
                        setOverlayMode("none");
                      }}
                    >
                      <FileSpreadsheet className="size-4" />
                      Exportar CSV
                    </Button>
                  </Card>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
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
