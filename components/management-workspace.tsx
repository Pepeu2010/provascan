"use client";

import { useMemo, useRef, useState } from "react";
import { Edit3, FileUp, RotateCcw, Save, Trash2 } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { AnalyticsPanels } from "@/components/analytics-panels";
import { StudentTable } from "@/components/student-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { StudentStatus } from "@/types/domain";

function FieldSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none"
    >
      {children}
    </select>
  );
}

export function ClassesManager() {
  const { createClass, data, deleteClass, updateClass } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    ano: "2026",
    nome: "",
    periodo: "Manha",
    professor: data.teacherProfile.nome,
  });

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Gerenciamento de turmas</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Cadastre, ajuste e remova turmas reais para operar o sistema hoje mesmo.
          </p>
        </div>
        <Badge tone="accent">{data.classes.length} turmas salvas</Badge>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Input
          placeholder="Nome da turma"
          value={form.nome}
          onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
        />
        <Input
          placeholder="Professor"
          value={form.professor}
          onChange={(event) => setForm((prev) => ({ ...prev, professor: event.target.value }))}
        />
        <Input
          placeholder="Ano letivo"
          value={form.ano}
          onChange={(event) => setForm((prev) => ({ ...prev, ano: event.target.value }))}
        />
        <FieldSelect value={form.periodo} onChange={(periodo) => setForm((prev) => ({ ...prev, periodo }))}>
          <option>Manha</option>
          <option>Tarde</option>
          <option>Noite</option>
          <option>Integral</option>
        </FieldSelect>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            if (!form.nome.trim()) return;
            if (editingId) {
              const result = updateClass(editingId, form);
              setMessage(result.message);
              setEditingId(null);
            } else {
              createClass(form);
              setMessage("Turma criada com sucesso.");
            }

            setForm((prev) => ({ ...prev, nome: "" }));
          }}
        >
          {editingId ? "Salvar turma" : "Nova turma"}
        </Button>
        {editingId ? (
          <Button
            variant="secondary"
            onClick={() => {
              setEditingId(null);
              setForm((prev) => ({ ...prev, nome: "", professor: data.teacherProfile.nome, ano: "2026", periodo: "Manha" }));
            }}
          >
            Cancelar edicao
          </Button>
        ) : null}
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.classes.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
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
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(item.id);
                  setForm({
                    ano: item.ano,
                    nome: item.nome,
                    periodo: item.periodo,
                    professor: item.professor,
                  });
                  setMessage(`Editando ${item.nome}.`);
                }}
              >
                <Edit3 className="size-4" />
                Editar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const result = deleteClass(item.id);
                  setMessage(result.message);
                }}
              >
                <Trash2 className="size-4" />
                Excluir
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

export function StudentsManager() {
  const { createStudent, data, deleteStudent, updateStudent } = useAppData();
  const [status, setStatus] = useState<StudentStatus>("Ativo");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [student, setStudent] = useState({
    matricula: "",
    nome: "",
    turma: data.classes[0]?.id ?? "",
  });

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Gerenciamento de alunos</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Cadastre alunos e mantenha a base pronta para correcao imediata.
            </p>
          </div>
          <Badge tone="accent">{data.students.length} alunos salvos</Badge>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <Input
            placeholder="Nome do aluno"
            value={student.nome}
            onChange={(event) => setStudent((prev) => ({ ...prev, nome: event.target.value }))}
          />
          <Input
            placeholder="Matricula"
            value={student.matricula}
            onChange={(event) => setStudent((prev) => ({ ...prev, matricula: event.target.value }))}
          />
          <FieldSelect value={student.turma} onChange={(turma) => setStudent((prev) => ({ ...prev, turma }))}>
            {data.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </FieldSelect>
          <FieldSelect value={status} onChange={(value) => setStatus(value as StudentStatus)}>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Transferido">Transferido</option>
          </FieldSelect>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              if (!student.nome.trim() || !student.matricula.trim() || !student.turma) return;

              if (editingId) {
                const result = updateStudent(editingId, { ...student, status });
                setMessage(result.message);
                setEditingId(null);
              } else {
                createStudent({ ...student, status });
                setMessage("Aluno cadastrado com sucesso.");
              }

              setStudent((prev) => ({ ...prev, matricula: "", nome: "" }));
              setStatus("Ativo");
            }}
          >
            {editingId ? "Salvar aluno" : "Novo aluno"}
          </Button>
          {editingId ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setStudent({ matricula: "", nome: "", turma: data.classes[0]?.id ?? "" });
                setStatus("Ativo");
              }}
            >
              Cancelar edicao
            </Button>
          ) : null}
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </Card>
      <div className="mt-5">
        <StudentTable
          classes={data.classes}
          students={data.students}
          onDelete={(studentId) => {
            const result = deleteStudent(studentId);
            setMessage(result.message);
          }}
          onEdit={(studentId) => {
            const current = data.students.find((item) => item.id === studentId);
            if (!current) return;
            setEditingId(current.id);
            setStudent({
              matricula: current.matricula,
              nome: current.nome,
              turma: current.turma,
            });
            setStatus(current.status);
            setMessage(`Editando ${current.nome}.`);
          }}
        />
      </div>
    </>
  );
}

export function ExamsManager() {
  const { createExam, data, deleteExam, updateExam } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
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
          <p className="text-sm text-[var(--muted-foreground)]">
            Crie provas reais e deixe o gabarito pronto para uso imediato.
          </p>
        </div>
        <Badge tone="accent">{data.exams.length} provas salvas</Badge>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-5">
        <Input
          placeholder="Titulo da prova"
          value={form.titulo}
          onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))}
        />
        <FieldSelect value={form.turma} onChange={(turma) => setForm((prev) => ({ ...prev, turma }))}>
          {data.classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </FieldSelect>
        <Input
          type="date"
          value={form.data}
          onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))}
        />
        <Input
          type="number"
          min="1"
          value={form.quantidadeQuestoes}
          onChange={(event) => setForm((prev) => ({ ...prev, quantidadeQuestoes: event.target.value }))}
        />
        <Input
          placeholder="Alternativas: A,B,C,D,E"
          value={form.alternativas}
          onChange={(event) => setForm((prev) => ({ ...prev, alternativas: event.target.value }))}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            if (!form.titulo.trim() || !form.turma) return;

            const payload = {
              alternativas: form.alternativas
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              data: form.data,
              quantidadeQuestoes: Number(form.quantidadeQuestoes),
              titulo: form.titulo,
              turma: form.turma,
            };

            if (editingId) {
              const result = updateExam(editingId, payload);
              setMessage(result.message);
              setEditingId(null);
            } else {
              createExam(payload);
              setMessage("Prova criada com sucesso.");
            }

            setForm((prev) => ({ ...prev, titulo: "" }));
          }}
        >
          {editingId ? "Salvar prova" : "Nova prova"}
        </Button>
        {editingId ? (
          <Button
            variant="secondary"
            onClick={() => {
              setEditingId(null);
              setForm({
                alternativas: "A,B,C,D,E",
                data: new Date().toISOString().slice(0, 10),
                quantidadeQuestoes: "10",
                titulo: "",
                turma: data.classes[0]?.id ?? "",
              });
            }}
          >
            Cancelar edicao
          </Button>
        ) : null}
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {data.exams.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">{item.titulo}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{formatDate(item.data)}</p>
              </div>
              <Badge tone="neutral">{item.quantidadeQuestoes} questoes</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {item.alternativas.map((alternative) => (
                <span
                  key={alternative}
                  className="grid size-9 place-items-center rounded-xl bg-[var(--surface)] text-sm font-semibold text-[var(--foreground)]"
                >
                  {alternative}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(item.id);
                  setForm({
                    alternativas: item.alternativas.join(","),
                    data: item.data,
                    quantidadeQuestoes: String(item.quantidadeQuestoes),
                    titulo: item.titulo,
                    turma: item.turma,
                  });
                  setMessage(`Editando ${item.titulo}.`);
                }}
              >
                <Edit3 className="size-4" />
                Editar
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const result = deleteExam(item.id);
                  setMessage(result.message);
                }}
              >
                <Trash2 className="size-4" />
                Excluir
              </Button>
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
  const [message, setMessage] = useState("");
  const exam = data.exams.find((item) => item.id === examId) ?? activeExam;
  const alternatives = exam?.alternativas ?? ["A", "B", "C", "D", "E"];
  const initialAnswers = useMemo(
    () =>
      data.answerKeys
        .filter((item) => item.provaId === exam?.id)
        .sort((a, b) => a.questao - b.questao)
        .map((item) => item.respostaCorreta),
    [data.answerKeys, exam?.id],
  );
  const [answers, setAnswers] = useState<string[]>(initialAnswers);

  if (!exam) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--muted-foreground)]">Cadastre uma prova antes de editar o gabarito.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Editor do gabarito</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            No mobile, o lancamento e objetivo. No desktop, voce ganha mais densidade visual.
          </p>
        </div>
        <FieldSelect
          value={examId}
          onChange={(nextExamId) => {
            const nextAnswers = data.answerKeys
              .filter((item) => item.provaId === nextExamId)
              .sort((a, b) => a.questao - b.questao)
              .map((item) => item.respostaCorreta);
            setExamId(nextExamId);
            setAnswers(nextAnswers);
          }}
        >
          {data.exams.map((item) => (
            <option key={item.id} value={item.id}>
              {item.titulo}
            </option>
          ))}
        </FieldSelect>
      </div>

      <div className="mt-6 space-y-3 md:hidden">
        {answers.map((selected, index) => (
          <Card key={`mobile-${index + 1}`} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">Questao {index + 1}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Lancamento rapido para celular</p>
              </div>
              <Badge tone="neutral">{selected || "Sem resposta"}</Badge>
            </div>
            <div className="mt-4 rounded-[20px] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Gabarito correto</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {alternatives.map((alternative) => (
                  <button
                    key={alternative}
                    type="button"
                    onClick={() => setAnswers((previous) => previous.map((value, i) => (i === index ? alternative : value)))}
                    className={
                      selected === alternative
                        ? "rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-3 text-sm font-semibold text-[var(--accent)]"
                        : "rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] px-3 py-3 text-sm font-semibold text-[var(--foreground)]"
                    }
                  >
                    {alternative}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--border)] p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Para lancar</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">Toque na alternativa correta acima.</p>
              </div>
              <div className="rounded-[20px] border border-[var(--border)] p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Gabarito salvo</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{selected || "Nao definido"}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 hidden gap-4 xl:grid xl:grid-cols-2">
        {answers.map((selected, index) => (
          <div key={`${index + 1}-${selected}`} className="rounded-[24px] border border-[var(--border)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">Questao {index + 1}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Edicao em lote para desktop.</p>
              </div>
              <Badge tone="neutral">{selected || "Sem resposta"}</Badge>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {alternatives.map((alternative) => (
                <button
                  key={alternative}
                  type="button"
                  onClick={() => setAnswers((previous) => previous.map((value, i) => (i === index ? alternative : value)))}
                  className={
                    selected === alternative
                      ? "rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] py-3 text-sm font-semibold text-[var(--accent)]"
                      : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-semibold text-[var(--foreground)]"
                  }
                >
                  {alternative}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            saveAnswerKey(exam.id, answers);
            setMessage("Gabarito salvo com sucesso.");
          }}
        >
          <Save className="size-4" />
          Salvar gabarito
        </Button>
        <Badge tone="accent">{exam.quantidadeQuestoes} questoes</Badge>
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
    </Card>
  );
}

export function ReportsWorkspace() {
  const { analytics } = useAppData();
  return <AnalyticsPanels analytics={analytics} />;
}

export function SettingsWorkspace() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data, exportData, getOperationalCsv, importData, resetData } = useAppData();
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState("");

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Modo operacional local</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
          Ideal para uso imediato no Vercel sem backend obrigatorio. Tudo fica salvo no navegador do professor.
        </p>
        <div className="mt-6 rounded-[24px] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted-foreground)]">Resumo atual</p>
          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {data.classes.length} turmas, {data.students.length} alunos, {data.exams.length} provas
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              const content = exportData();
              setPayload(content);
              downloadFile("provascan-backup-manual.json", content, "application/json");
              setMessage("Backup JSON gerado e baixado.");
            }}
          >
            Gerar backup JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              downloadFile("provascan-resumo-operacional.csv", getOperationalCsv(), "text/csv;charset=utf-8");
              setMessage("Resumo CSV baixado.");
            }}
          >
            Exportar resumo CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              resetData();
              setMessage("Base local restaurada para o conjunto inicial.");
            }}
          >
            <RotateCcw className="size-4" />
            Restaurar base inicial
          </Button>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Importacao e restauracao</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
          Importe um backup JSON colando o conteudo abaixo ou escolhendo um arquivo salvo anteriormente.
        </p>
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="mt-6 min-h-56 w-full rounded-[24px] border border-[var(--border)] bg-[var(--input-bg)] p-4 text-sm text-[var(--foreground)] outline-none"
          placeholder="Cole aqui o JSON de backup do ProvaScan."
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              const result = importData(payload);
              setMessage(result.message);
            }}
          >
            <FileUp className="size-4" />
            Importar backup
          </Button>
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Escolher arquivo JSON
          </Button>
          <Badge tone="accent">Pronto para Vercel</Badge>
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            setPayload(text);
            const result = importData(text);
            setMessage(result.message);
            event.target.value = "";
          }}
        />
      </Card>
    </div>
  );
}
