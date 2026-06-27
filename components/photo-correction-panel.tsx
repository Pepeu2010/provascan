"use client";

import { Camera, CheckCircle2, ScanSearch } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { correctionSessions, students } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const activeSession = correctionSessions[0];

export function PhotoCorrectionPanel() {
  const [selectedStudent, setSelectedStudent] = useState(activeSession.aluno.id);
  const [answers, setAnswers] = useState(activeSession.respostas);

  const score = useMemo(() => {
    const acertos = answers.filter((item) => item.respostaAluno === item.respostaCorreta).length;
    const erros = answers.length - acertos;
    const percentual = Math.round((acertos / answers.length) * 100);
    return { acertos, erros, percentual, nota: (percentual / 10).toFixed(1) };
  }, [answers]);

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[320px]">
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Camera className="size-4 text-[var(--accent)]" />
              Correção por foto
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              Foto capturada pelo celular, grade detectada, brilho ajustado e identidade conferida pelo OCR.
            </p>
            <div className="mt-5 rounded-[24px] border border-[var(--hero-border)] bg-[linear-gradient(180deg,var(--hero-bg),var(--hero-bg-end))] p-4 text-[var(--hero-foreground)]">
              <div className="flex items-center justify-between text-sm">
                <span>{activeSession.prova.titulo}</span>
                <Badge tone="accent">{activeSession.confiancaOcr}% OCR</Badge>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--hero-muted)]">
                    Nome detectado
                  </p>
                  <p className="mt-2 text-sm font-semibold">{activeSession.correction.nomeDetectado}</p>
                </div>
                <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--hero-muted)]">
                    Tempo da correção
                  </p>
                  <p className="mt-2 text-sm font-semibold">{activeSession.correction.tempoCorrecao}</p>
                </div>
              </div>
            </div>
            <Button className="mt-5 w-full" size="lg">
              <ScanSearch className="size-4" />
              Escanear nova imagem
            </Button>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Revisão antes de salvar</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Nunca dependa 100% do OCR: ajuste aluno e respostas antes de confirmar.
              </p>
            </div>
            <select
              value={selectedStudent}
              onChange={(event) => setSelectedStudent(event.target.value)}
              className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm outline-none"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Nota" value={score.nota} helper="escala 0-10" />
            <Metric label="Acertos" value={String(score.acertos)} helper="respostas corretas" />
            <Metric label="Erros" value={String(score.erros)} helper="exigem reforço" />
            <Metric label="Percentual" value={`${score.percentual}%`} helper="resultado final" />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {answers.map((answer, index) => (
              <div key={answer.questao} className="rounded-[24px] border border-[var(--border)] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Questão {answer.questao}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Gabarito: {answer.respostaCorreta}
                    </p>
                  </div>
                  {answer.respostaAluno === answer.respostaCorreta ? (
                    <Badge tone="success">Correta</Badge>
                  ) : (
                    <Badge tone="warning">Revisada</Badge>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {activeSession.prova.alternativas.map((alternative) => {
                    const isSelected = answer.respostaAluno === alternative;
                    const isCorrect = answer.respostaCorreta === alternative;
                    return (
                      <button
                        key={alternative}
                        type="button"
                        onClick={() =>
                          setAnswers((previous) =>
                            previous.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, respostaAluno: alternative } : item,
                            ),
                          )
                        }
                        className={cn(
                          "rounded-2xl border px-0 py-3 text-sm font-semibold",
                          "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
                          isCorrect &&
                            "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]",
                          isSelected &&
                            !isCorrect &&
                            "border-[var(--error-border)] bg-[var(--error-soft)] text-[var(--error)]",
                        )}
                      >
                        {alternative}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="sm:flex-1">
              <CheckCircle2 className="size-4" />
              Confirmar correção
            </Button>
            <Button size="lg" variant="secondary" className="sm:flex-1">
              Salvar como revisão pendente
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{helper}</p>
    </div>
  );
}
