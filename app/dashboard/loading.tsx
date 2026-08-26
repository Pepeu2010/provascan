type DashboardLoadingProps = {
  active?: string;
};

export default function DashboardLoading({ active = "Painel" }: DashboardLoadingProps) {
  return (
    <main className="dashboard-loading dashboard-loading--shell" aria-busy="true" aria-live="polite">
      <aside className="dashboard-loading__sidebar" aria-hidden="true">
        <span className="dashboard-loading__logo" />
        <span className="dashboard-loading__workspace" />
        <div className="dashboard-loading__navigation">
          <span /><span /><span /><span /><span /><span />
        </div>
      </aside>
      <section className="dashboard-loading__main">
        <header className="dashboard-loading__header">
          <span className="dashboard-loading__overline">CARREGANDO ÁREA</span>
          <h1>{active.replace("/dashboard/", "").replace("/", "") || "Painel"}</h1>
          <span className="dashboard-loading__summary" />
        </header>
        <div className="dashboard-loading__content-skeleton">
          <div className="dashboard-loading__intro-skeleton"><span /><span /><span /></div>
          <div className="dashboard-loading__row-skeleton"><span /><span /></div>
          <div className="dashboard-loading__row-skeleton"><span /><span /></div>
        </div>
      </section>
    </main>
  );
}
