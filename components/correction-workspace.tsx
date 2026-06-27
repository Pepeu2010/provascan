"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CorrectionWorkspace({ compact = false }: { compact?: boolean }) {
  const { data, saveCorrection } = useAppData();
  const [examId, setExamId] = useState(data.exams[0]?.id ?? "");
  const [studentId, setStudentId] = useState(data.students[0]?.id ?? "");
  const [imageLabel, setImageLabel] = useState("correcao-manual.jpg");
  const [notes, setNotes] = useState("Correcao revisada manualmente antes de salvar.");
  const [message, setMessage] = useState("");
  const exam = data.exams.find((item) => item.id === examId) ?? data.exams[0];
  const answerKey = useMemo(
    () =>
      data.answerKeys
        .filter((item) => item.provaId === exam?.id)
        .sort((a, b) => a.questao - b.questao),
    [data.answerKeys, exam?.id],
  );
  const [answers, setAnswers] = useState<string[]>(answerKey.map((item) => item.respostaCorreta));

  if (!exam || !data.students.length) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          Cadastre pelo menos uma prova e um aluno para começar a corrigir.
        </p>
      </Card>
    );
  }

  const score = answers.reduce(
    (acc, answer, index) => {
      const correct = answerKey[index]?.respostaCorreta === answer;
      return {
        acertos: acc.acertos + (correct ? 1 : 0),
        erros: acc.erros + (correct ? 0 : 1),
      };
    },
    { acertos: 0, erros: 0 },
  );

  return (
    <Card className="p-6">
      <div className={compact ? "flex flex-col gap-6" : "flex flex-col gap-6 lg:flex-row"}>
        <div className={compact ? "" : "lg:w-[320px]"}>
          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              Correção por foto
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
              Operação pronta para uso imediato: selecione a prova, confira o aluno, revise as respostas e salve no histórico.
            </p>
            <div className="mt-5 rounded-[24px] border border-[var(--hero-border)] bg-[linear-gradient(180deg,var(--hero-bg),var(--hero-bg-end))] p-4 text-[var(--hero-foreground)]">
              <div className="flex items-center justify-between text-sm">
                <span>{exam.titulo}</span>
                <Badge tone="accent">{exam.quantidadeQuestoes} questões</Badge>
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--hero-muted)]">Turma</p>
                  <p className="mt-2 text-sm font-semibold">
                    {data.classes.find((item) => item.id === exam.turma)?.nome}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--hero-muted)]">Aluno selecionado</p>
                  <p className="mt-2 text-sm font-semibold">
                    {data.students.find((item) => item.id === studentId)?.nome}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={examId}
              onChange={(event) => {
                const nextExamId = event.target.value;
                const nextAnswerKey = data.answerKeys
                  .filter((item) => item.provaId === nextExamId)
                  .sort((a, b) => a.questao - b.questao);
                setExamId(nextExamId);
                setAnswers(nextAnswerKey.map((item) => item.respostaCorreta));
              }}
              className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none"
            >
              {data.exams.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titulo}
                </option>
              ))}
            </select>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none"
            >
              {data.students.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
            <Input
              value={imageLabel}
              onChange={(event) => setImageLabel(event.target.value)}
              placeholder="nome-da-imagem.jpg"
            />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricCard label="Acertos" value={String(score.acertos)} helper="comparado com o gabarito" />
            <MetricCard label="Erros" value={String(score.erros)} helper="itens para revisão" />
            <MetricCard
              label="Percentual"
              value={`${answerKey.length ? Math.round((score.acertos / answerKey.length) * 100) : 0}%`}
              helper="resultado instantâneo"
            />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {answerKey.map((answer, index) => (
              <div key={answer.questao} className="rounded-[24px] border border-[var(--border)] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Questão {answer.questao}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Gabarito: {answer.respostaCorreta}</p>
                  </div>
                  <Badge tone={answers[index] === answer.respostaCorreta ? "success" : "warning"}>
                    {answers[index] === answer.respostaCorreta ? "Correta" : "Revisar"}
                  </Badge>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {exam.alternativas.map((alternative) => (
                    <button
                      key={alternative}
                      type="button"
                      onClick={() =>
                        setAnswers((previous) => previous.map((value, i) => (i === index ? alternative : value)))
                      }
                      className={cn(
                        "rounded-2xl border px-0 py-3 text-sm font-semibold",
                        "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]",
                        answer.respostaCorreta === alternative &&
                          "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]",
                        answers[index] === alternative &&
                          answers[index] !== answer.respostaCorreta &&
                          "border-[var(--error-border)] bg-[var(--error-soft)] text-[var(--error)]",
                      )}
                    >
                      {alternative}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-6 min-h-28 w-full rounded-[24px] border border-[var(--border)] bg-[var(--input-bg)] p-4 text-sm text-[var(--foreground)] outline-none"
            placeholder="Observações da correção"
          />
          <div className="mt-6">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              data-testid="save-correction"
              onClick={() => {
                const result = saveCorrection({
                  answers,
                  examId: exam.id,
                  imageLabel,
                  notes: [notes],
                  studentId,
                });
                setMessage(result.message);
              }}
            >
              Salvar correção no histórico
            </Button>
          </div>
          {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function MetricCard({ helper, label, value }: { helper: string; label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{helper}</p>
    </div>
  );
}
