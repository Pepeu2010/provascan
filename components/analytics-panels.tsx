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
      const x = (index / (gradeEvolution.length - 1)) * 100;
      const y = 100 - ((item.media - lineMin) / lineRange) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Média das turmas</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Compare o desempenho geral antes de aplicar novas avaliações.
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-solid)] p-6">
          <div className="flex h-56 items-end gap-6">
            {classAverages.map((item) => (
              <div key={item.turma} className="flex flex-1 flex-col items-center gap-4">
                <div className="flex h-full w-full items-end justify-center rounded-[20px] bg-[var(--surface)] px-4 pb-4">
                  <div
                    className="w-full rounded-[18px] bg-[var(--accent)]"
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Questões com mais erro</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Priorize revisão nas questões abaixo.
        </p>
        <div className="mt-6 space-y-4">
          {errorRanking.map((item) => (
            <div key={item.questao}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--foreground)]">{item.questao}</span>
                <span className="text-[var(--muted-foreground)]">{item.erros} erros</span>
              </div>
              <div className="h-3 rounded-full bg-[var(--surface)]">
                <div
                  className="h-3 rounded-full bg-[var(--error)]"
                  style={{ width: `${item.erros * 4}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6 xl:col-span-2">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Evolução das notas</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tendência consolidada das últimas aplicações.
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-solid)] p-6">
          <div className="grid grid-cols-[1fr_auto] gap-6">
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
                  strokeWidth="1.4"
                  points={points}
                />
                {gradeEvolution.map((item, index) => {
                  const cx = (index / (gradeEvolution.length - 1)) * 100;
                  const cy = 100 - ((item.media - lineMin) / lineRange) * 100;
                  return (
                    <circle
                      key={`${item.periodo}-${index}`}
                      cx={cx}
                      cy={cy}
                      r="2.2"
                      fill="var(--accent)"
                      stroke="var(--foreground)"
                      strokeWidth="0.6"
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
            <div className="flex flex-col justify-between text-right text-xs text-[var(--muted-foreground)]">
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
