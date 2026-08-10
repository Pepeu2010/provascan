import { Check, LoaderCircle, ScanLine } from "lucide-react";
import { ProvaScanLogo } from "@/components/provascan-logo";

export default function DashboardLoading() {
  return (
    <main className="dashboard-loading" aria-busy="true">
      <div className="dashboard-loading__glow" aria-hidden="true" />
      <section className="dashboard-loading__content" role="status" aria-live="polite">
        <div className="dashboard-loading__brand">
          <ProvaScanLogo size="sm" />
          <span className="dashboard-loading__tag">Preparando workspace</span>
        </div>

        <div className="dashboard-loading__scanner" aria-hidden="true">
          <span className="dashboard-loading__scanner-orbit dashboard-loading__scanner-orbit--outer" />
          <span className="dashboard-loading__scanner-orbit dashboard-loading__scanner-orbit--inner" />
          <span className="dashboard-loading__scanner-core"><ScanLine className="size-6" /></span>
          <span className="dashboard-loading__scanner-beam" />
        </div>

        <div className="dashboard-loading__copy">
          <p className="dashboard-loading__eyebrow">SISTEMA DE CORREÇÃO</p>
          <h1>Seu painel está chegando.</h1>
          <p>Sincronizando provas, turmas e permissões de acesso.</p>
        </div>

        <div className="dashboard-loading__steps" aria-label="Progresso do carregamento">
          <span className="dashboard-loading__step dashboard-loading__step--done"><Check className="size-3.5" />Sessão confirmada</span>
          <span className="dashboard-loading__step dashboard-loading__step--active"><LoaderCircle className="size-3.5 animate-spin" />Organizando dados</span>
          <span className="dashboard-loading__step">Abrindo painel</span>
        </div>
        <div className="dashboard-loading__progress" aria-hidden="true"><span /></div>
      </section>
    </main>
  );
}
