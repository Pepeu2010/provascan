"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Edit3, FileUp, KeyRound, Printer, QrCode, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { AnalyticsPanels } from "@/components/analytics-panels";
import { StudentTable } from "@/components/student-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getClassLabel } from "@/lib/app-data";
import { canManageUsers } from "@/lib/access-control";
import { formatDate } from "@/lib/utils";
import { ANSWER_SHEET_TEMPLATE, getQuestionLayout } from "@/services/answer-sheet-template";
import {
  buildAnswerSheetModel,
  buildDefaultCorrectionRule,
  getCorrectionRule,
} from "@/services/exam-correction";
import type { StudentStatus } from "@/types/domain";

type AdminUserRow = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: string;
  trocar_senha: string;
};

function getRoleBadgeTone(role: string) {
  if (role === "admin") {
    return "accent" as const;
  }

  if (role === "vice_diretor") {
    return "warning" as const;
  }

  return "neutral" as const;
}

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
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </Select>
  );
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeForHtml(value: string) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

function openPrintWindow(title: string, body: string) {
  const html = `
    <html>
      <head>
        <title>ProvaScan - Impressão</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
          .sheet { position: relative; width: ${ANSWER_SHEET_TEMPLATE.page.width}px; min-height: ${ANSWER_SHEET_TEMPLATE.page.height}px; page-break-inside: avoid; border: 1px solid #111827; padding: 24px; margin: 0 auto 24px; box-sizing: border-box; }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #111827; padding-bottom: 16px; margin-bottom: 16px; }
          .meta { font-size: 13px; line-height: 1.6; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
          .code { font-family: monospace; font-size: 13px; padding: 8px 12px; border: 1px solid #111827; display: inline-block; }
          .qr-block { position: absolute; right: 40px; top: 124px; width: 124px; text-align: center; }
          .qr-block img { width: 124px; height: 124px; display: block; margin-bottom: 8px; }
          .questions { position: absolute; left: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.x * ANSWER_SHEET_TEMPLATE.page.width)}px; top: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.y * ANSWER_SHEET_TEMPLATE.page.height)}px; width: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.width * ANSWER_SHEET_TEMPLATE.page.width)}px; height: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.height * ANSWER_SHEET_TEMPLATE.page.height)}px; }
          .question { position: absolute; left: 0; right: 0; display: grid; align-items: center; }
          .question-number { font-weight: 700; font-size: 15px; }
          .bubble-track { display: grid; gap: 0; }
          .bubble { width: 22px; height: 22px; border: 1.5px solid #111827; border-radius: 999px; display: inline-block; justify-self: center; }
          .footer { position: absolute; left: 32px; right: 32px; bottom: 74px; display: grid; gap: 10px; font-size: 12px; }
          .signature { margin-top: 20px; border-top: 1px solid #111827; width: 280px; padding-top: 8px; font-size: 12px; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank", "noopener,noreferrer,width=980,height=720");
  if (!printWindow) {
    URL.revokeObjectURL(url);
    return false;
  }

  printWindow.addEventListener(
    "load",
    () => {
      try {
        printWindow.document.title = title;
        printWindow.focus();
        printWindow.print();
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    { once: true },
  );

  return true;
}

export function ClassesManager() {
  const { createClass, data, deleteClass, updateClass } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    ano: "2026",
    nome: "",
    periodo: "Manhã",
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
        <Input placeholder="Nome da turma" value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} />
        <Input placeholder="Professor" value={form.professor} onChange={(event) => setForm((prev) => ({ ...prev, professor: event.target.value }))} />
        <Input placeholder="Ano letivo" value={form.ano} onChange={(event) => setForm((prev) => ({ ...prev, ano: event.target.value }))} />
        <FieldSelect value={form.periodo} onChange={(periodo) => setForm((prev) => ({ ...prev, periodo }))}>
          <option>Manhã</option>
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
              setForm({ ano: "2026", nome: "", periodo: "Manhã", professor: data.teacherProfile.nome });
            }}
          >
            Cancelar edição
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
                  setForm({ ano: item.ano, nome: item.nome, periodo: item.periodo, professor: item.professor });
                  setMessage(`Editando ${item.nome}.`);
                }}
              >
                <Edit3 className="size-4" />
                Editar
              </Button>
              <Button variant="ghost" onClick={() => setMessage(deleteClass(item.id).message)}>
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
            <p className="text-sm text-[var(--muted-foreground)]">Cadastre alunos e mantenha a base pronta para correção imediata.</p>
          </div>
          <Badge tone="accent">{data.students.length} alunos salvos</Badge>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <Input placeholder="Nome do aluno" value={student.nome} onChange={(event) => setStudent((prev) => ({ ...prev, nome: event.target.value }))} />
          <Input placeholder="Matrícula" value={student.matricula} onChange={(event) => setStudent((prev) => ({ ...prev, matricula: event.target.value }))} />
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
                setMessage(updateStudent(editingId, { ...student, status }).message);
                setEditingId(null);
              } else {
                createStudent({ ...student, status });
                setMessage("Aluno cadastrado com sucesso.");
              }
              setStudent({ matricula: "", nome: "", turma: data.classes[0]?.id ?? "" });
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
              Cancelar edição
            </Button>
          ) : null}
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      </Card>
      <div className="mt-5">
        <StudentTable
          classes={data.classes}
          students={data.students}
          onDelete={(studentId) => setMessage(deleteStudent(studentId).message)}
          onEdit={(studentId) => {
            const current = data.students.find((item) => item.id === studentId);
            if (!current) return;
            setEditingId(current.id);
            setStudent({ matricula: current.matricula, nome: current.nome, turma: current.turma });
            setStatus(current.status);
            setMessage(`Editando ${current.nome}.`);
          }}
        />
      </div>
    </>
  );
}

export function ExamsManager() {
  const { createExam, data, deleteExam, saveCorrectionRule, updateExam } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedExamId, setSelectedExamId] = useState(data.exams[0]?.id ?? "");
  const [sheetMode, setSheetMode] = useState<"blank" | "class" | "student">("class");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [form, setForm] = useState({
    alternativas: "A,B,C,D,E",
    data: new Date().toISOString().slice(0, 10),
    quantidadeQuestoes: "10",
    titulo: "",
    turma: data.classes[0]?.id ?? "",
  });

  const activeExam = data.exams.find((item) => item.id === selectedExamId) ?? data.exams[0];
  const activeClass = data.classes.find((item) => item.id === activeExam?.turma);
  const rule = activeExam ? getCorrectionRule(activeExam, data.correctionRules) : null;
  const studentsForExam = useMemo(
    () => data.students.filter((item) => item.turma === activeExam?.turma),
    [activeExam?.turma, data.students],
  );

  const [ruleForm, setRuleForm] = useState(() => {
    if (!activeExam || !rule) {
      return {
        arredondamentoCasas: "1",
        modoQuestaoAnulada: "full-credit",
        notaMaxima: "10",
        pesoPadrao: "1",
        pesosPorQuestaoRaw: "",
        questoesAnuladasRaw: "",
      };
    }

    return {
      arredondamentoCasas: String(rule.arredondamentoCasas),
      modoQuestaoAnulada: rule.modoQuestaoAnulada,
      notaMaxima: String(rule.notaMaxima),
      pesoPadrao: String(rule.pesoPadrao),
      pesosPorQuestaoRaw: rule.pesosPorQuestao.map((item) => `${item.questao}=${item.peso}`).join("\n"),
      questoesAnuladasRaw: rule.questoesAnuladas.join(","),
    };
  });

  const syncRuleForm = (examId: string) => {
    const nextExam = data.exams.find((item) => item.id === examId);
    const nextRule = nextExam ? getCorrectionRule(nextExam, data.correctionRules) : null;
    setSelectedExamId(examId);
    setSelectedStudentId("");
    setRuleForm({
      arredondamentoCasas: String(nextRule?.arredondamentoCasas ?? 1),
      modoQuestaoAnulada: nextRule?.modoQuestaoAnulada ?? "full-credit",
      notaMaxima: String(nextRule?.notaMaxima ?? 10),
      pesoPadrao: String(nextRule?.pesoPadrao ?? 1),
      pesosPorQuestaoRaw: nextRule?.pesosPorQuestao.map((item) => `${item.questao}=${item.peso}`).join("\n") ?? "",
      questoesAnuladasRaw: nextRule?.questoesAnuladas.join(",") ?? "",
    });
  };

  const printSheets = async () => {
    if (!activeExam || !activeClass) {
      return;
    }

    const items =
      sheetMode === "blank"
        ? [buildAnswerSheetModel({ exam: activeExam, teacherName: data.teacherProfile.nome, teacherSchool: data.teacherProfile.escola, turma: activeClass, student: null })]
        : sheetMode === "student"
          ? studentsForExam
              .filter((item) => item.id === selectedStudentId)
              .map((student) =>
                buildAnswerSheetModel({
                  exam: activeExam,
                  teacherName: data.teacherProfile.nome,
                  teacherSchool: data.teacherProfile.escola,
                  turma: activeClass,
                  student,
                }),
              )
          : studentsForExam.map((student) =>
              buildAnswerSheetModel({
                exam: activeExam,
                teacherName: data.teacherProfile.nome,
                teacherSchool: data.teacherProfile.escola,
                turma: activeClass,
                student,
              }),
            );

    const { toDataURL } = await import("qrcode");

    const htmlParts = await Promise.all(
      items.map(async (item) => {
        const qrDataUrl = item.qrPayload
          ? await toDataURL(item.qrPayload, {
              errorCorrectionLevel: "M",
              margin: 1,
              width: 164,
            })
          : "";
        const layout = getQuestionLayout(item.questionNumbers.length, activeExam.alternativas);
        const bubbleTemplateColumns = `42px repeat(${Math.max(1, activeExam.alternativas.length)}, 1fr)`;

        return `
          <section class="sheet">
            <div class="header">
              <div>
                <div class="title">${escapeForHtml(item.examTitle)}</div>
                <div class="meta">
                  <div><strong>Escola/Professor:</strong> ${escapeForHtml(item.teacherSchool)} - ${escapeForHtml(item.teacherName)}</div>
                  <div><strong>Turma:</strong> ${escapeForHtml(item.turmaName)}</div>
                  <div><strong>Aluno:</strong> ${escapeForHtml(item.studentName)}</div>
                  <div><strong>Matrícula:</strong> ${escapeForHtml(item.studentRegistration)}</div>
                </div>
              </div>
              <div>
                <div class="code">${escapeForHtml(item.uniqueCode)}</div>
                <div class="meta" style="margin-top: 12px;">
                  <div><strong>Código da prova:</strong> ${escapeForHtml(item.examCode)}</div>
                  <div><strong>Template:</strong> ${ANSWER_SHEET_TEMPLATE.version}</div>
                  <div><strong>Turma:</strong> ${escapeForHtml(item.turmaName)}</div>
                </div>
              </div>
            </div>
            <div class="qr-block">
              ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code do cartão-resposta" />` : ""}
              <div class="meta"><strong>ID:</strong> ${escapeForHtml(item.uniqueCode)}</div>
            </div>
            <div class="questions">
              ${item.questionNumbers
                .map(
                  (question, index) => `
                    <div class="question" style="top:${Math.round(layout.rowHeight * index)}px;height:${Math.round(layout.rowHeight)}px;grid-template-columns:${bubbleTemplateColumns};">
                      <strong class="question-number">${question}</strong>
                      ${activeExam.alternativas.map(() => `<span class="bubble"></span>`).join("")}
                    </div>
                  `,
                )
                .join("")}
            </div>
            <div class="footer">
              ${item.instructions.map((instruction) => `<div>${escapeForHtml(instruction)}</div>`).join("")}
            </div>
            <div class="signature">Assinatura / nome adicional</div>
          </section>
        `;
      }),
    );

    const html = htmlParts.join("");

    if (openPrintWindow(`Cartões ${activeExam.titulo}`, html)) {
      setMessage("Cartões-resposta abertos para impressão ou salvamento em PDF.");
    } else {
      setMessage("Não foi possível abrir a janela de impressão neste navegador.");
    }
  };

  return (
    <div className="grid gap-5">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">Gerenciamento de provas</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Crie provas, defina regras e gere cartões padrão do próprio sistema.</p>
          </div>
          <Badge tone="accent">{data.exams.length} provas salvas</Badge>
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-5">
          <Input placeholder="Titulo da prova" value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} />
          <FieldSelect value={form.turma} onChange={(turma) => setForm((prev) => ({ ...prev, turma }))}>
            {data.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </FieldSelect>
          <Input type="date" value={form.data} onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))} />
          <Input type="number" min="1" value={form.quantidadeQuestoes} onChange={(event) => setForm((prev) => ({ ...prev, quantidadeQuestoes: event.target.value }))} />
          <Input placeholder="Alternativas: A,B,C,D,E" value={form.alternativas} onChange={(event) => setForm((prev) => ({ ...prev, alternativas: event.target.value }))} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              if (!form.titulo.trim() || !form.turma) return;
              const payload = {
                alternativas: form.alternativas.split(",").map((item) => item.trim()).filter(Boolean),
                data: form.data,
                quantidadeQuestoes: Number(form.quantidadeQuestoes),
                titulo: form.titulo,
                turma: form.turma,
              };

              if (editingId) {
                setMessage(updateExam(editingId, payload).message);
                setEditingId(null);
              } else {
                createExam(payload);
                setMessage("Prova criada com sucesso.");
              }

              setForm({
                alternativas: "A,B,C,D,E",
                data: new Date().toISOString().slice(0, 10),
                quantidadeQuestoes: "10",
                titulo: "",
                turma: data.classes[0]?.id ?? "",
              });
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
              Cancelar edição
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
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {formatDate(item.data)} • {getClassLabel(data.classes, item.turma)}
                  </p>
                </div>
                <Badge tone="neutral">{item.quantidadeQuestoes} questões</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="accent">{item.codigo}</Badge>
                <Badge tone="neutral">{item.templateVersion}</Badge>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.alternativas.map((alternative) => (
                  <span key={alternative} className="grid size-9 place-items-center rounded-xl bg-[var(--surface)] text-sm font-semibold text-[var(--foreground)]">
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
                    syncRuleForm(item.id);
                    setMessage(`Editando ${item.titulo}.`);
                  }}
                >
                  <Edit3 className="size-4" />
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => setMessage(deleteExam(item.id).message)}>
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {activeExam && activeClass ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Regras de correção</p>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">{activeExam.titulo}</h3>
              </div>
              <FieldSelect value={activeExam.id} onChange={syncRuleForm}>
                {data.exams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo}
                  </option>
                ))}
              </FieldSelect>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Input value={ruleForm.notaMaxima} onChange={(event) => setRuleForm((prev) => ({ ...prev, notaMaxima: event.target.value }))} placeholder="Nota maxima" type="number" min="1" step="0.1" />
              <Input value={ruleForm.pesoPadrao} onChange={(event) => setRuleForm((prev) => ({ ...prev, pesoPadrao: event.target.value }))} placeholder="Peso padrao" type="number" min="0.1" step="0.1" />
              <Input value={ruleForm.arredondamentoCasas} onChange={(event) => setRuleForm((prev) => ({ ...prev, arredondamentoCasas: event.target.value }))} placeholder="Casas decimais" type="number" min="0" max="3" />
              <FieldSelect value={ruleForm.modoQuestaoAnulada} onChange={(value) => setRuleForm((prev) => ({ ...prev, modoQuestaoAnulada: value as "full-credit" | "ignore" }))}>
                <option value="full-credit">Questao anulada vale ponto</option>
                <option value="ignore">Questao anulada sai do calculo</option>
              </FieldSelect>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Textarea
                value={ruleForm.questoesAnuladasRaw}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, questoesAnuladasRaw: event.target.value }))}
                className="min-h-28"
                placeholder="Questões anuladas: 3,7,11"
              />
              <Textarea
                value={ruleForm.pesosPorQuestaoRaw}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, pesosPorQuestaoRaw: event.target.value }))}
                className="min-h-28"
                placeholder={"Pesos por questao\n5=1.5\n12=2"}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setMessage(
                    saveCorrectionRule({
                      arredondamentoCasas: Number(ruleForm.arredondamentoCasas),
                      modoQuestaoAnulada: ruleForm.modoQuestaoAnulada as "full-credit" | "ignore",
                      notaMaxima: Number(ruleForm.notaMaxima),
                      pesoPadrao: Number(ruleForm.pesoPadrao),
                      pesosPorQuestaoRaw: ruleForm.pesosPorQuestaoRaw,
                      provaId: activeExam.id,
                      questoesAnuladasRaw: ruleForm.questoesAnuladasRaw,
                      totalQuestions: activeExam.quantidadeQuestoes,
                    }).message,
                  );
                }}
              >
                <Save className="size-4" />
                Salvar regras
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const fallback = buildDefaultCorrectionRule(activeExam);
                  setRuleForm({
                    arredondamentoCasas: String(fallback.arredondamentoCasas),
                    modoQuestaoAnulada: fallback.modoQuestaoAnulada,
                    notaMaxima: String(fallback.notaMaxima),
                    pesoPadrao: String(fallback.pesoPadrao),
                    pesosPorQuestaoRaw: "",
                    questoesAnuladasRaw: "",
                  });
                }}
              >
                Limpar regra
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Cartão-resposta padrão</p>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Gerar para impressão</h3>
              </div>
              <Badge tone="accent">QR + código único</Badge>
            </div>
            <div className="mt-6 grid gap-3">
              <FieldSelect value={sheetMode} onChange={(value) => setSheetMode(value as "blank" | "class" | "student")}>
                <option value="blank">Gerar cartão em branco</option>
                <option value="class">Gerar cartão por turma</option>
                <option value="student">Gerar cartão por aluno</option>
              </FieldSelect>
              {sheetMode === "student" ? (
                <FieldSelect value={selectedStudentId} onChange={setSelectedStudentId}>
                  <option value="">Selecione um aluno</option>
                  {studentsForExam.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </FieldSelect>
              ) : null}
            </div>
            <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{activeExam.titulo}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {activeClass.nome} • {activeExam.codigo}
                  </p>
                </div>
                <QrCode className="size-6 text-[var(--accent)]" />
              </div>
              <div className="mt-4 grid gap-3 text-sm text-[var(--muted-foreground)]">
                <p>Modelo próprio do sistema para reduzir variação do OCR e padronizar a identificação.</p>
                <p>Inclui código único da prova, aluno, turma e payload para leitura de QR antes do OCR nominal.</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  void printSheets();
                }}
                disabled={sheetMode === "student" && !selectedStudentId}
              >
                <Printer className="size-4" />
                Imprimir / salvar PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const payload = {
                    examId: activeExam.id,
                    generatedAt: new Date().toISOString(),
                    mode: sheetMode,
                    studentId: selectedStudentId || null,
                    templateVersion: activeExam.templateVersion,
                  };
                  downloadTextFile(`cartoes-${activeExam.codigo}.json`, JSON.stringify(payload, null, 2), "application/json");
                  setMessage("Manifesto de cartoes baixado com sucesso.");
                }}
              >
                <Download className="size-4" />
                Baixar manifesto
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export function AnswerKeyEditor() {
  const { data, saveAnswerKey } = useAppData();
  const activeExam = data.exams[0];
  const [examId, setExamId] = useState(activeExam?.id ?? "");
  const [message, setMessage] = useState("");
  const exam = data.exams.find((item) => item.id === examId) ?? activeExam;
  const alternatives = exam?.alternativas ?? ["A", "B", "C", "D", "E"];
  const [answers, setAnswers] = useState<string[]>(
    data.answerKeys.filter((item) => item.provaId === exam?.id).sort((a, b) => a.questao - b.questao).map((item) => item.respostaCorreta),
  );

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
          <p className="text-sm text-[var(--muted-foreground)]">No mobile, o lancamento e objetivo. No desktop, voce ganha mais densidade visual.</p>
        </div>
        <FieldSelect
          value={examId}
          onChange={(nextExamId) => {
            setExamId(nextExamId);
            setAnswers(
              data.answerKeys
                .filter((item) => item.provaId === nextExamId)
                .sort((a, b) => a.questao - b.questao)
                .map((item) => item.respostaCorreta),
            );
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
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{selected || "Não definido"}</p>
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
        <Badge tone="accent">{exam.quantidadeQuestoes} questões</Badge>
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
    </Card>
  );
}

export function ReportsWorkspace() {
  const { analytics, data } = useAppData();
  const [classFilter, setClassFilter] = useState("all");
  const [examFilter, setExamFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCorrections = useMemo(
    () =>
      data.corrections.filter((item) => {
        if (classFilter !== "all" && item.turma.id !== classFilter) return false;
        if (examFilter !== "all" && item.prova.id !== examFilter) return false;
        if (studentFilter !== "all" && item.aluno.id !== studentFilter) return false;
        if (statusFilter !== "all" && !item.respostas.some((answer) => answer.status === statusFilter)) return false;
        return true;
      }),
    [classFilter, data.corrections, examFilter, statusFilter, studentFilter],
  );

  const filteredAverage = filteredCorrections.length
    ? Math.round(filteredCorrections.reduce((sum, item) => sum + item.correction.percentual, 0) / filteredCorrections.length)
    : 0;

  return (
    <div className="grid gap-5">
      <Card className="p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <FieldSelect value={classFilter} onChange={setClassFilter}>
            <option value="all">Todas as turmas</option>
            {data.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </FieldSelect>
          <FieldSelect value={examFilter} onChange={setExamFilter}>
            <option value="all">Todas as provas</option>
            {data.exams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.titulo}
              </option>
            ))}
          </FieldSelect>
          <FieldSelect value={studentFilter} onChange={setStudentFilter}>
            <option value="all">Todos os alunos</option>
            {data.students.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </FieldSelect>
          <FieldSelect value={statusFilter} onChange={setStatusFilter}>
            <option value="all">Todos os status</option>
            <option value="erro">Com erro</option>
            <option value="em-branco">Com em branco</option>
            <option value="multipla-marcacao">Com multipla marcacao</option>
            <option value="anulada">Com anulada</option>
          </FieldSelect>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Correcoes filtradas</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{filteredCorrections.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Média filtrada</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{filteredAverage}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Ranking disponivel</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{analytics.studentRanking.length}</p>
          </Card>
        </div>
      </Card>
      <AnalyticsPanels analytics={analytics} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Ranking dos alunos</h3>
          <div className="mt-5 space-y-3">
            {analytics.studentRanking.map((item, index) => (
              <div key={`${item.aluno}-${index}`} className="flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{item.aluno}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{item.percentual}% de aproveitamento</p>
                </div>
                <Badge tone="accent">{item.nota.toFixed(1)}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Quebras operacionais</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {analytics.outcomeBreakdown.map((item) => (
              <div key={item.label} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{item.total}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function SettingsWorkspace() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data, exportData, getOperationalCsv, importData, resetData, session } = useAppData();
  const [payload, setPayload] = useState("");
  const [message, setMessage] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const canManagePasswordPolicy = canManageUsers(session?.role ?? "");

  useEffect(() => {
    if (!canManagePasswordPolicy) {
      return;
    }

    let cancelled = false;

    const loadUsers = async () => {
      setAdminLoading(true);
      try {
        const response = await fetch("/api/admin/users/password-reset", { cache: "no-store" });
        const payload = (await response.json()) as { error?: string; users?: AdminUserRow[] };
        if (!cancelled) {
          setAdminUsers(Array.isArray(payload.users) ? payload.users : []);
          setAdminMessage(payload.error ?? "");
        }
      } catch {
        if (!cancelled) {
          setAdminMessage("Não foi possível carregar os usuários da planilha.");
        }
      } finally {
        if (!cancelled) {
          setAdminLoading(false);
        }
      }
    };

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [canManagePasswordPolicy]);

  const refreshAdminUsers = async () => {
    if (!canManagePasswordPolicy) {
      return;
    }

    setAdminLoading(true);
    try {
      const response = await fetch("/api/admin/users/password-reset", { cache: "no-store" });
      const payload = (await response.json()) as { error?: string; users?: AdminUserRow[] };
      setAdminUsers(Array.isArray(payload.users) ? payload.users : []);
      setAdminMessage(payload.error ?? "");
    } catch {
      setAdminMessage("Não foi possível carregar os usuários da planilha.");
    } finally {
      setAdminLoading(false);
    }
  };

  const updatePasswordResetMode = async (body: { mode: "all"; shouldForce: boolean } | { mode: "single"; shouldForce: boolean; userId: string }) => {
    if (!canManagePasswordPolicy) {
      return;
    }

    setAdminLoading(true);
    try {
      const response = await fetch("/api/admin/users/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      setAdminMessage(payload.error ?? payload.message ?? "");
      if (response.ok) {
        await refreshAdminUsers();
        return;
      }
    } catch {
      setAdminMessage("Não foi possível atualizar a política de senha.");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="grid gap-5">
      {canManagePasswordPolicy ? (
        <Card className="p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="accent">Controle administrativo</Badge>
                <Badge tone="neutral">{adminUsers.length} usuários encontrados</Badge>
                <Badge tone="warning">Perfis de gestão: admin e vice_diretor</Badge>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Reset de primeiro acesso</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                Aqui você controla a coluna `trocar_senha` da planilha. Marcar `SIM` obriga cada usuário a entrar com a senha atual e definir uma nova senha pessoal antes de acessar o painel.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => void refreshAdminUsers()} disabled={adminLoading}>
                <ShieldCheck className="size-4" />
                Atualizar lista
              </Button>
              <Button onClick={() => void updatePasswordResetMode({ mode: "all", shouldForce: true })} disabled={adminLoading}>
                <KeyRound className="size-4" />
                Forçar troca para todos
              </Button>
              <Button variant="ghost" onClick={() => void updatePasswordResetMode({ mode: "all", shouldForce: false })} disabled={adminLoading}>
                Liberar todos
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {adminLoading && !adminUsers.length ? (
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">
                Carregando usuários da planilha...
              </div>
            ) : null}
            {!adminLoading && !adminUsers.length ? (
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">
                Nenhum usuário elegível foi encontrado na aba `usuarios`.
              </div>
            ) : null}
            {adminUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[var(--foreground)]">{user.nome}</p>
                    <Badge tone={user.ativo.toUpperCase() === "SIM" ? "success" : "error"}>{user.ativo}</Badge>
                    <Badge tone={user.trocar_senha.toUpperCase() === "SIM" ? "warning" : "neutral"}>
                      troca: {user.trocar_senha || "NÃO"}
                    </Badge>
                    <Badge tone={getRoleBadgeTone(user.perfil)}>{user.perfil || "sem perfil"}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {user.email || "Sem identificador de acesso"} • perfil {user.perfil || "sem perfil"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => void updatePasswordResetMode({ mode: "single", userId: user.id, shouldForce: true })}
                    disabled={adminLoading}
                  >
                    Forçar troca
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void updatePasswordResetMode({ mode: "single", userId: user.id, shouldForce: false })}
                    disabled={adminLoading}
                  >
                    Liberar
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {adminMessage ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{adminMessage}</p> : null}
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Modo operacional local</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">Ideal para uso imediato no Vercel sem backend obrigatório. Tudo fica salvo no navegador do professor.</p>
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
              downloadTextFile("provascan-backup-manual.json", content, "application/json");
              setMessage("Backup JSON gerado e baixado.");
            }}
          >
            Gerar backup JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              downloadTextFile("provascan-resumo-operacional.csv", getOperationalCsv(), "text/csv;charset=utf-8");
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
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">Importação e restauração</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">Importe um backup JSON colando o conteúdo abaixo ou escolhendo um arquivo salvo anteriormente.</p>
        <Textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          className="mt-6 min-h-56"
          placeholder="Cole aqui o JSON de backup do ProvaScan."
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => setMessage(importData(payload).message)}>
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
            setMessage(importData(text).message);
            event.target.value = "";
          }}
        />
      </Card>
      </div>
    </div>
  );
}



