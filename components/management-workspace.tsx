"use client";

import { useMemo, useState } from "react";
import { useAppData } from "@/components/app-data-provider";
import { AnalyticsPanels } from "@/components/analytics-panels";
import { StudentTable } from "@/components/student-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { StudentStatus } from "@/types/domain";

export function ClassesManager() {
  const { createClass, data } = useAppData();
  const [form, setForm] = useState({ ano: "2026", nome: "", periodo: "Manhã", professor: data.teacherProfile.nome });

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Gerenciamento de turmas</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Cadastre turmas reais para começar a operar o sistema hoje mesmo.</p>
        </div>
        <Badge tone="accent">{data.classes.length} turmas salvas</Badge>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Input placeholder="Nome da turma" value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} />
        <Input placeholder="Professor" value={form.professor} onChange={(event) => setForm((prev) => ({ ...prev, professor: event.target.value }))} />
        <Input placeholder="Ano letivo" value={form.ano} onChange={(event) => setForm((prev) => ({ ...prev, ano: event.target.value }))} />
        <select value={form.periodo} onChange={(event) => setForm((prev) => ({ ...prev, periodo: event.target.value }))} className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none">
          <option>Manhã</option>
          <option>Tarde</option>
          <option>Noite</option>
          <option>Integral</option>
        </select>
      </div>
      <div className="mt-4">
        <Button onClick={() => {
          if (!form.nome.trim()) return;
          createClass(form);
          setForm((prev) => ({ ...prev, nome: "" }));
        }}>Nova turma</Button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.classes.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">{item.nome}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.professor}</p>
              </div>
              <Badge tone="neutral">{item.periodo}</Badge>
            </div>
            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="text-[var(--muted-foreground)]">Ano letivo</span>
              <span className="font-medium text-[var(--foreground)]">{item.ano}</span>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

export function StudentsManager() {
  const { createStudent, data } = useAppData();
  const [status, setStatus] = useState<StudentStatus>("Ativo");
  const [student, setStudent] = useState({ matricula: "", nome: "", turma: data.classes[0]?.id ?? "" });

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Gerenciamento de alunos</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Cadastre alunos e mantenha a base pronta para correção imediata.</p>
          </div>
          <Badge tone="accent">{data.students.length} alunos salvos</Badge>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <Input placeholder="Nome do aluno" value={student.nome} onChange={(event) => setStudent((prev) => ({ ...prev, nome: event.target.value }))} />
          <Input placeholder="Matrícula" value={student.matricula} onChange={(event) => setStudent((prev) => ({ ...prev, matricula: event.target.value }))} />
          <select value={student.turma} onChange={(event) => setStudent((prev) => ({ ...prev, turma: event.target.value }))} className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none">
            {data.classes.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as StudentStatus)} className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none">
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Transferido">Transferido</option>
          </select>
        </div>
        <div className="mt-4">
          <Button onClick={() => {
            if (!student.nome.trim() || !student.matricula.trim() || !student.turma) return;
            createStudent({ ...student, status });
            setStudent((prev) => ({ ...prev, matricula: "", nome: "" }));
            setStatus("Ativo");
          }}>Novo aluno</Button>
        </div>
      </Card>
      <div className="mt-5">
        <StudentTable classes={data.classes} students={data.students} />
      </div>
    </>
  );
}

export function ExamsManager() {
  const { createExam, data } = useAppData();
  const [form, setForm] = useState({
    alternativas: "A,B,C,D,E",
    data: new Date().toISOString().slice(0, 10),
    quantidadeQuestoes: "10",
    titulo: "",
    turma: data.classes[0]?.id ?? "",
  });

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Gerenciamento de provas</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Crie provas reais e já deixe o gabarito pronto para correção.</p>
        </div>
        <Badge tone="accent">{data.exams.length} provas salvas</Badge>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        <Input placeholder="Título da prova" value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} />
        <select value={form.turma} onChange={(event) => setForm((prev) => ({ ...prev, turma: event.target.value }))} className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none">
          {data.classes.map((item) => (
            <option key={item.id} value={item.id}>{item.nome}</option>
          ))}
        </select>
        <Input type="date" value={form.data} onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))} />
        <Input type="number" min="1" value={form.quantidadeQuestoes} onChange={(event) => setForm((prev) => ({ ...prev, quantidadeQuestoes: event.target.value }))} />
        <Input placeholder="Alternativas: A,B,C,D,E" value={form.alternativas} onChange={(event) => setForm((prev) => ({ ...prev, alternativas: event.target.value }))} />
      </div>
      <div className="mt-4">
        <Button onClick={() => {
          if (!form.titulo.trim() || !form.turma) return;
          createExam({
            alternativas: form.alternativas.split(",").map((item) => item.trim()).filter(Boolean),
            data: form.data,
            quantidadeQuestoes: Number(form.quantidadeQuestoes),
            titulo: form.titulo,
            turma: form.turma,
          });
          setForm((prev) => ({ ...prev, titulo: "" }));
        }}>Nova prova</Button>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {data.exams.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">{item.titulo}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{formatDate(item.data)}</p>
              </div>
              <Badge tone="neutral">{item.quantidadeQuestoes} questões</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.alternativas.map((alternative) => (
                <span key={alternative} className="grid size-9 place-items-center rounded-xl bg-[var(--surface)] text-sm font-semibold text-[var(--foreground)]">
                  {alternative}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

export function AnswerKeyEditor() {
  const { data, saveAnswerKey } = useAppData();
  const activeExam = data.exams[0];
  const [examId, setExamId] = useState(activeExam?.id ?? "");
  const exam = data.exams.find((item) => item.id === examId) ?? activeExam;
  const alternatives = exam?.alternativas ?? ["A", "B", "C", "D", "E"];
  const initialAnswers = useMemo(
    () => data.answerKeys.filter((item) => item.provaId === exam?.id).sort((a, b) => a.questao - b.questao).map((item) => item.respostaCorreta),
    [data.answerKeys, exam?.id],
  );
  const [answers, setAnswers] = useState<string[]>(initialAnswers);

  if (!exam) {
    return <Card className="p-6"><p className="text-sm text-[var(--muted-foreground)]">Cadastre uma prova antes de editar o gabarito.</p></Card>;
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Editor do gabarito</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Escolha a prova e salve o gabarito que será usado nas correções.</p>
        </div>
        <select
          value={examId}
          onChange={(event) => {
            const nextExamId = event.target.value;
            const nextAnswers = data.answerKeys
              .filter((item) => item.provaId === nextExamId)
              .sort((a, b) => a.questao - b.questao)
              .map((item) => item.respostaCorreta);
            setExamId(nextExamId);
            setAnswers(nextAnswers);
          }}
          className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none"
        >
          {data.exams.map((item) => (
            <option key={item.id} value={item.id}>{item.titulo}</option>
          ))}
        </select>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {answers.map((selected, index) => (
          <div key={`${index + 1}-${selected}`} className="rounded-[24px] border border-[var(--border)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">Questão {index + 1}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Clique para alterar a alternativa correta.</p>
              </div>
              <Badge tone="neutral">Questão {index + 1}</Badge>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {alternatives.map((alternative) => (
                <button
                  key={alternative}
                  type="button"
                  onClick={() => setAnswers((previous) => previous.map((value, i) => (i === index ? alternative : value)))}
                  className={selected === alternative ? "rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] py-3 text-sm font-semibold text-[var(--accent)]" : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-semibold text-[var(--foreground)]"}
                >
                  {alternative}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Button onClick={() => saveAnswerKey(exam.id, answers)}>Salvar gabarito</Button>
      </div>
    </Card>
  );
}

export function ReportsWorkspace() {
  const { analytics } = useAppData();
  return <AnalyticsPanels analytics={analytics} />;
}

export function SettingsWorkspace() {
  const { data, exportData, importData, resetData } = useAppData();
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Modo operacional local</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">Ideal para uso imediato no Vercel sem backend obrigatório. Tudo fica salvo no navegador do professor.</p>
        <div className="mt-6 rounded-[24px] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted-foreground)]">Resumo atual</p>
          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{data.classes.length} turmas, {data.students.length} alunos, {data.exams.length} provas</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => {
            setPayload(exportData());
            setMessage("Backup JSON gerado abaixo.");
          }}>Gerar backup JSON</Button>
          <Button variant="secondary" onClick={() => {
            resetData();
            setMessage("Base local restaurada para o conjunto inicial.");
          }}>Restaurar base inicial</Button>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Importação e publicação</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">Use o campo abaixo para importar um backup JSON ou copiar seus dados para outro navegador.</p>
        <textarea value={payload} onChange={(event) => setPayload(event.target.value)} className="mt-6 min-h-56 w-full rounded-[24px] border border-[var(--border)] bg-[var(--input-bg)] p-4 text-sm text-[var(--foreground)] outline-none" placeholder="Cole aqui o JSON de backup do ProvaScan." />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => {
            const result = importData(payload);
            setMessage(result.message);
          }}>Importar backup</Button>
          <Badge tone="accent">Pronto para Vercel</Badge>
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </Card>
    </div>
  );
}
