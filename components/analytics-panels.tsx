import type { AnalyticsSnapshot } from "@/lib/app-data";
import { Card } from "@/components/ui/card";

export function AnalyticsPanels({ analytics }: { analytics: AnalyticsSnapshot }) {
  const { classAverages, errorRanking, gradeEvolution } = analytics;
  const barMax = Math.max(...classAverages.map((item) => item.media));
  const lineMax = Math.max(...gradeEvolution.map((item) => item.media));
  const lineMin = Math.min(...gradeEvolution.map((item) => item.media));
  const lineRange = Math.max(lineMax - lineMin, 1);
  const points = gradeEvolution
    .map((item, index) => {
      const x = gradeEvolution.length === 1 ? 50 : (index / (gradeEvolution.length - 1)) * 100;
      const y = 100 - ((item.media - lineMin) / lineRange) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="dashboard-grid-card p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Desempenho
            </p>
            <h3 className="dashboard-section-title mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Média das turmas
            </h3>
          </div>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Compare o desempenho geral antes de aplicar novas avaliações.
          </p>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_94%,transparent),transparent)] p-6">
          <div className="flex h-56 items-end gap-4 sm:gap-6">
            {classAverages.map((item) => (
              <div key={item.turma} className="flex flex-1 flex-col items-center gap-4">
                <div className="flex h-full w-full items-end justify-center rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface),transparent)] px-3 pb-3 sm:px-4 sm:pb-4">
                  <div
                    className="w-full rounded-[18px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent-strong)_88%,white),var(--accent))] shadow-[var(--shadow-soft)]"
                    style={{ height: `${(item.media / barMax) * 100}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{item.turma}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{item.media}% média</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="dashboard-grid-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Prioridades
        </p>
        <h3 className="dashboard-section-title mt-2 text-2xl font-semibold text-[var(--foreground)]">
          Questões com mais erro
        </h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Priorize revisão nas questões abaixo.
        </p>

        <div className="mt-6 space-y-4">
          {errorRanking.map((item) => (
            <div
              key={item.questao}
              className="rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-strong)_72%,transparent),transparent)] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-[var(--foreground)]">{item.questao}</span>
                <span className="text-[var(--muted-foreground)]">{item.erros} erros</span>
              </div>
              <div className="h-2.5 rounded-full bg-[var(--surface-strong)]">
                <div
                  className="h-2.5 rounded-full bg-[linear-gradient(90deg,var(--error),color-mix(in_srgb,var(--error)_62%,white))]"
                  style={{ width: `${Math.min(item.erros * 4, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="dashboard-grid-card p-6 xl:col-span-2">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Tendência
            </p>
            <h3 className="dashboard-section-title mt-2 text-2xl font-semibold text-[var(--foreground)]">
              Evolução das notas
            </h3>
          </div>
          <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
            Tendência consolidada das últimas aplicações.
          </p>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--card-solid)_94%,transparent),transparent)] p-6">
          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <svg viewBox="0 0 100 100" className="h-56 w-full overflow-visible">
                {[20, 40, 60, 80].map((line) => (
                  <line
                    key={line}
                    x1="0"
                    y1={line}
                    x2="100"
                    y2={line}
                    stroke="var(--grid)"
                    strokeWidth="0.6"
                  />
                ))}
                <polyline
                  fill="none"
                  stroke="var(--foreground)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                  points={points}
                />
                {gradeEvolution.map((item, index) => {
                  const cx = gradeEvolution.length === 1 ? 50 : (index / (gradeEvolution.length - 1)) * 100;
                  const cy = 100 - ((item.media - lineMin) / lineRange) * 100;
                  return (
                    <circle
                      key={`${item.periodo}-${index}`}
                      cx={cx}
                      cy={cy}
                      r="2.4"
                      fill="var(--accent)"
                      stroke="var(--foreground)"
                      strokeWidth="0.7"
                    />
                  );
                })}
              </svg>
              <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm text-[var(--muted-foreground)]">
                {gradeEvolution.map((item, index) => (
                  <div key={`${item.periodo}-${index}`}>{item.periodo}</div>
                ))}
              </div>
            </div>

            <div className="flex flex-row justify-between text-xs text-[var(--muted-foreground)] md:flex-col md:text-right">
              <span>{lineMax}%</span>
              <span>{Math.round((lineMax + lineMin) / 2)}%</span>
              <span>{lineMin}%</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
