"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Edit3, Heart, KeyRound, Printer, QrCode, Save, ShieldCheck, Trash2 } from "lucide-react";
import { AdministrationCenter } from "@/components/administration-center";
import { useAppData } from "@/components/app-data-provider";
import { AnalyticsPanels } from "@/components/analytics-panels";
import { StudentTable } from "@/components/student-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canManageTargetUser, canManageUsers } from "@/lib/access-control";
import { UserManagementPanel } from "@/components/user-management-panel";
import { compareClassrooms, formatEducationalLabel } from "@/lib/education-labels";
import {
  buildExamAudienceOptions,
  getRepresentativeClassForExam,
  getStudentsForExam,
  hasAmbiguousClasses,
} from "@/lib/exam-audience";
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
  children: ReactNode;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
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
          @page { size: A4 portrait; margin: 0; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #101828; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet { position: relative; width: ${ANSWER_SHEET_TEMPLATE.page.width}px; height: ${ANSWER_SHEET_TEMPLATE.page.height}px; overflow: hidden; page-break-inside: avoid; border: 2px solid #101828; padding: 30px; margin: 0 auto; background: #fff; }
          .brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; color: #101828; }
          .brand-mark { display: inline-flex; width: 19px; height: 19px; align-items: center; justify-content: center; border: 2px solid #101828; border-radius: 4px; font-size: 13px; font-weight: 800; line-height: 1; }
          .brand-name { font-size: 11px; font-weight: 800; letter-spacing: 2px; }
          .brand-divider { width: 1px; height: 15px; background: #98a2b3; }
          .brand-context { font-size: 10px; font-weight: 700; letter-spacing: .8px; color: #475467; }
          .header { display: grid; grid-template-columns: minmax(0, 1fr) 162px; gap: 22px; min-height: 170px; border-top: 3px solid #101828; border-bottom: 1px solid #98a2b3; padding: 12px 0; }
          .title { max-width: 455px; font-size: 26px; font-weight: 800; letter-spacing: -.4px; line-height: 1.1; margin: 0 0 5px; }
          .subtitle { margin: 0 0 12px; color: #475467; font-size: 11px; line-height: 1.45; }
          .student-data { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 18px; max-width: 475px; }
          .data-item { min-width: 0; border-bottom: 1px solid #d0d5dd; padding-bottom: 5px; }
          .data-item--wide { grid-column: 1 / -1; }
          .data-label { display: block; color: #667085; font-size: 9px; font-weight: 800; letter-spacing: .8px; margin-bottom: 3px; text-transform: uppercase; }
          .data-value { display: block; font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
          .identity-block { align-self: stretch; border-left: 1px solid #98a2b3; padding-left: 15px; text-align: center; }
          .code { display: inline-block; margin-bottom: 5px; padding: 4px 6px; background: #101828; color: #fff; font-family: "Courier New", monospace; font-size: 9px; font-weight: 700; letter-spacing: .2px; }
          .identity-meta { margin: 0 0 5px; color: #475467; font-size: 8px; font-weight: 700; line-height: 1.25; }
          .qr-block { display: grid; justify-items: center; }
          .qr-label { margin: 0 0 3px; color: #475467; font-size: 7px; font-weight: 800; letter-spacing: .55px; text-transform: uppercase; }
          .qr-block img { width: 112px; height: 112px; display: block; }
          .qr-id { margin: 3px 0 0; color: #101828; font-family: "Courier New", monospace; font-size: 8px; font-weight: 700; overflow-wrap: anywhere; }
          .answer-caption { position: absolute; left: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.x * ANSWER_SHEET_TEMPLATE.page.width)}px; top: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.y * ANSWER_SHEET_TEMPLATE.page.height) - 40}px; color: #101828; font-size: 11px; font-weight: 800; letter-spacing: .45px; }
          .answer-caption span { color: #475467; font-size: 9px; font-weight: 600; letter-spacing: 0; }
          .questions { position: absolute; left: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.x * ANSWER_SHEET_TEMPLATE.page.width)}px; top: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.y * ANSWER_SHEET_TEMPLATE.page.height)}px; width: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.width * ANSWER_SHEET_TEMPLATE.page.width)}px; height: ${Math.round(ANSWER_SHEET_TEMPLATE.answerArea.height * ANSWER_SHEET_TEMPLATE.page.height)}px; }
          .answer-legend { position: absolute; top: -20px; display: grid; align-items: center; color: #475467; font-size: 9px; font-weight: 800; letter-spacing: .65px; text-align: center; }
          .answer-legend span:first-child { text-align: left; }
          .question { position: absolute; display: grid; align-items: center; }
          .question-number { color: #101828; font-size: 13px; font-weight: 800; }
          .bubble { width: var(--bubble-size, 22px); height: var(--bubble-size, 22px); border: 1.7px solid #101828; border-radius: 999px; display: inline-block; justify-self: center; }
          .footer { position: absolute; left: 30px; right: 30px; bottom: 30px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 20px; border-top: 1px solid #98a2b3; padding-top: 10px; color: #344054; font-size: 9px; line-height: 1.35; }
          .footer div::before { content: "•"; margin-right: 5px; color: #101828; font-weight: 800; }
          @media print { .sheet { margin: 0; border-width: 2px; } }
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
  const { createClass, data, deleteClass, syncError, syncStatus, updateClass } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    ano: "2026",
    nome: "",
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
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Input aria-label="Nome da turma" placeholder="Nome da turma" value={form.nome} onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))} />
        <Input aria-label="Ano letivo" placeholder="Ano letivo" value={form.ano} onChange={(event) => setForm((prev) => ({ ...prev, ano: event.target.value }))} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          loading={syncStatus === "saving"}
          onClick={() => {
            if (!form.nome.trim()) {
              setMessage("Informe o nome da turma.");
              return;
            }
            void (async () => {
              const result = editingId ? await updateClass(editingId, form) : await createClass(form);
              setMessage(result.message);
              if (result.ok) {
                setEditingId(null);
                setForm((prev) => ({ ...prev, nome: "" }));
              }
            })();
          }}
        >
          {editingId ? "Salvar turma" : "Nova turma"}
        </Button>
        {editingId ? (
          <Button
            variant="secondary"
            onClick={() => {
              setEditingId(null);
              setForm({ ano: "2026", nome: "" });
            }}
          >
            Cancelar edição
          </Button>
        ) : null}
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      {syncStatus === "error" && syncError ? <p className="mt-2 text-sm text-[var(--error)]">{syncError}</p> : null}
      <div className="mt-6 overflow-hidden rounded-[20px] border border-[var(--border)]" role="list" aria-label="Turmas cadastradas">
        {data.classes.slice().sort(compareClassrooms).map((item) => (
          <div key={item.id} role="listitem" className="flex flex-col gap-4 border-b border-[var(--border)] bg-[var(--card-solid)] px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--accent)]" aria-hidden="true">{formatEducationalLabel(item.nome).match(/^\d+/)?.[0] ?? "—"}</span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[var(--foreground)]">{formatEducationalLabel(item.nome)}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Ano letivo {item.ano}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(item.id);
                  setForm({ ano: item.ano, nome: item.nome });
                  setMessage(`Editando ${item.nome}.`);
                }}
              >
                <Edit3 className="size-4" />
                Editar
              </Button>
              <Button variant="ghost" onClick={() => {
                if (window.confirm(`Excluir a turma ${item.nome}? Esta ação não pode ser desfeita.`)) {
                  void (async () => setMessage((await deleteClass(item.id)).message))();
                }
              }}>
                <Trash2 className="size-4" />
                Excluir
              </Button>
            </div>
          </div>
        ))}
        {!data.classes.length ? <p className="px-5 py-8 text-sm text-[var(--muted-foreground)]">Nenhuma turma cadastrada ainda. Use o formulário acima para criar a primeira.</p> : null}
      </div>
    </Card>
  );
}

export function StudentsManager() {
  const { createStudent, data, deleteStudent, syncError, syncStatus, updateStudent } = useAppData();
  const [status, setStatus] = useState<StudentStatus>("Ativo");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [student, setStudent] = useState({
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
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <Input placeholder="Nome do aluno" value={student.nome} onChange={(event) => setStudent((prev) => ({ ...prev, nome: event.target.value }))} />
          <FieldSelect value={student.turma} onChange={(turma) => setStudent((prev) => ({ ...prev, turma }))}>
            {data.classes.slice().sort(compareClassrooms).map((item) => (
              <option key={item.id} value={item.id}>
                {formatEducationalLabel(item.nome)}
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
          loading={syncStatus === "saving"}
          onClick={() => {
            if (!student.nome.trim() || !student.turma) return;
            void (async () => {
              const result = editingId
                ? await updateStudent(editingId, { ...student, status })
                : await createStudent({ ...student, status });
              setMessage(result.message);
              if (result.ok) {
                setEditingId(null);
                setStudent({ nome: "", turma: data.classes[0]?.id ?? "" });
                setStatus("Ativo");
              }
            })();
          }}
        >
            {editingId ? "Salvar aluno" : "Novo aluno"}
          </Button>
          {editingId ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setStudent({ nome: "", turma: data.classes[0]?.id ?? "" });
                setStatus("Ativo");
              }}
            >
              Cancelar edição
            </Button>
          ) : null}
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
        {syncStatus === "error" && syncError ? <p className="mt-2 text-sm text-[var(--error)]">{syncError}</p> : null}
      </Card>
      <div className="mt-5">
        <StudentTable
          classes={data.classes}
          students={data.students}
          onDelete={(studentId) => {
            const student = data.students.find((item) => item.id === studentId);
            if (student && window.confirm(`Excluir ${student.nome}? Esta ação não pode ser desfeita.`)) {
              void (async () => setMessage((await deleteStudent(studentId)).message))();
            }
          }}
          onEdit={(studentId) => {
            const current = data.students.find((item) => item.id === studentId);
            if (!current) return;
            setEditingId(current.id);
            setStudent({ nome: current.nome, turma: current.turma });
            setStatus(current.status);
            setMessage(`Editando ${current.nome}.`);
          }}
        />
      </div>
    </>
  );
}

export function ExamsManager() {
  const { createExam, data, deleteExam, saveCorrectionRule, syncError, syncStatus, updateExam } = useAppData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedExamId, setSelectedExamId] = useState(data.exams[0]?.id ?? "");
  const [sheetMode, setSheetMode] = useState<"blank" | "class" | "student">("class");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const audienceOptions = useMemo(() => buildExamAudienceOptions(data.classes), [data.classes]);
  const fallbackAudience = audienceOptions[0];
  const [form, setForm] = useState({
    alternativas: "A,B,C,D,E",
    audienceId: fallbackAudience?.id ?? "",
    data: new Date().toISOString().slice(0, 10),
    quantidadeQuestoes: "10",
    titulo: "",
  });
  const selectedAudienceId = audienceOptions.some((option) => option.id === form.audienceId)
    ? form.audienceId
    : (fallbackAudience?.id ?? "");

  const activeExam = data.exams.find((item) => item.id === selectedExamId) ?? data.exams[0];
  const activeClass = getRepresentativeClassForExam(activeExam, data.classes);
  const rule = activeExam ? getCorrectionRule(activeExam, data.correctionRules) : null;
  const studentsForExam = useMemo(
    () => getStudentsForExam(activeExam, data.students, data.classes),
    [activeExam, data.classes, data.students],
  );
  const hasYearTwoAmbiguity = useMemo(() => hasAmbiguousClasses(data.classes, "2"), [data.classes]);
  const hasYearThreeAmbiguity = useMemo(() => hasAmbiguousClasses(data.classes, "3"), [data.classes]);
  const questionCount = Math.max(0, Number(form.quantidadeQuestoes) || 0);

  const resetExamForm = () => {
    setForm({
      alternativas: "A,B,C,D,E",
      audienceId: audienceOptions[0]?.id ?? "",
      data: new Date().toISOString().slice(0, 10),
      quantidadeQuestoes: "10",
      titulo: "",
    });
  };

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
    if (!activeExam) {
      return;
    }

    const items =
      sheetMode === "blank"
        ? [
            buildAnswerSheetModel({
              exam: activeExam,
              teacherName: data.teacherProfile.nome,
              teacherSchool: data.teacherProfile.escola,
              turma: activeClass,
              turmaLabel: activeExam.audienceLabel,
              student: null,
            }),
          ]
        : sheetMode === "student"
          ? studentsForExam
              .filter((item) => item.id === selectedStudentId)
              .map((student) => {
                const studentClass = data.classes.find((item) => item.id === student.turma) ?? activeClass;
                return buildAnswerSheetModel({
                  exam: activeExam,
                  teacherName: data.teacherProfile.nome,
                  teacherSchool: data.teacherProfile.escola,
                  turma: studentClass,
                  turmaLabel: studentClass?.nome ?? activeExam.audienceLabel,
                  student,
                });
              })
          : studentsForExam.map((student) => {
              const studentClass = data.classes.find((item) => item.id === student.turma) ?? activeClass;
              return buildAnswerSheetModel({
                exam: activeExam,
                teacherName: data.teacherProfile.nome,
                teacherSchool: data.teacherProfile.escola,
                turma: studentClass,
                turmaLabel: studentClass?.nome ?? activeExam.audienceLabel,
                student,
              });
            });

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
        const bubbleTemplateColumns = `${Math.round(layout.numberColumnWidth)}px repeat(${Math.max(1, activeExam.alternativas.length)}, 1fr)`;
        const answerLegends = Array.from({ length: layout.columnCount }, (_, columnIndex) => `
          <div class="answer-legend" style="left:${Math.round(columnIndex * (layout.columnWidth + layout.columnGap))}px;width:${Math.round(layout.columnWidth)}px;grid-template-columns:${bubbleTemplateColumns};">
            <span>Q</span>
            ${activeExam.alternativas.map((alternative) => `<span>${escapeForHtml(alternative)}</span>`).join("")}
          </div>
        `).join("");

        return `
          <section class="sheet">
            <div class="brand-row">
              <span class="brand-mark">✓</span>
              <span class="brand-name">PROVASCAN</span>
              <span class="brand-divider"></span>
              <span class="brand-context">CARTÃO-RESPOSTA</span>
            </div>
            <header class="header">
              <div>
                <div class="title">${escapeForHtml(item.examTitle)}</div>
                <p class="subtitle">Marque somente uma alternativa por questão, preenchendo a bolha por completo.</p>
                <div class="student-data">
                  <div class="data-item data-item--wide"><span class="data-label">Aluno(a)</span><span class="data-value">${escapeForHtml(item.studentName)}</span></div>
                  <div class="data-item"><span class="data-label">Turma</span><span class="data-value">${escapeForHtml(item.turmaName)}</span></div>
                  <div class="data-item"><span class="data-label">Escola / Professor(a)</span><span class="data-value">${escapeForHtml(item.teacherSchool)} · ${escapeForHtml(item.teacherName)}</span></div>
                </div>
              </div>
              <aside class="identity-block">
                <div class="code">${escapeForHtml(item.uniqueCode)}</div>
                <p class="identity-meta">${escapeForHtml(item.examCode)} · ${ANSWER_SHEET_TEMPLATE.version}</p>
                <div class="qr-block">
                  <p class="qr-label">Leitura por QR</p>
                  ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code do cartão-resposta" />` : ""}
                  <p class="qr-id">ID: ${escapeForHtml(item.uniqueCode)}</p>
                </div>
              </aside>
            </header>
            <div class="answer-caption">RESPOSTAS <span>Preencha uma única bolha em cada questão.</span></div>
            <div class="questions">
              ${answerLegends}
              ${item.questionNumbers
                .map(
                  (question, index) => {
                    const columnIndex = Math.floor(index / layout.rowsPerColumn);
                    const rowIndex = index % layout.rowsPerColumn;
                    return `
                    <div class="question" style="left:${Math.round(columnIndex * (layout.columnWidth + layout.columnGap))}px;top:${Math.round(layout.rowHeight * rowIndex)}px;width:${Math.round(layout.columnWidth)}px;height:${Math.round(layout.rowHeight)}px;grid-template-columns:${bubbleTemplateColumns};--bubble-size:${Math.max(14, Math.round(layout.bubbleRadius * 2))}px;">
                      <strong class="question-number">${question}</strong>
                      ${activeExam.alternativas.map(() => `<span class="bubble"></span>`).join("")}
                    </div>
                  `;
                  },
                )
                .join("")}
            </div>
            <div class="footer">
              ${item.instructions.map((instruction) => `<div>${escapeForHtml(instruction)}</div>`).join("")}
            </div>
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
        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <Input placeholder="Título da prova" value={form.titulo} onChange={(event) => setForm((prev) => ({ ...prev, titulo: event.target.value }))} />
          <FieldSelect value={selectedAudienceId} onChange={(audienceId) => setForm((prev) => ({ ...prev, audienceId }))}>
            {!audienceOptions.length ? (
              <option value="">Nenhum público disponível</option>
            ) : null}
            {audienceOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </FieldSelect>
          <Input type="date" value={form.data} onChange={(event) => setForm((prev) => ({ ...prev, data: event.target.value }))} />
          <Input placeholder="Alternativas: A,B,C,D,E" value={form.alternativas} onChange={(event) => setForm((prev) => ({ ...prev, alternativas: event.target.value }))} />
          <Input aria-label="Quantidade de questões" type="number" min="1" max="200" placeholder="Quantidade de questões" value={form.quantidadeQuestoes} onChange={(event) => setForm((prev) => ({ ...prev, quantidadeQuestoes: event.target.value }))} />
        </div>
        {hasYearTwoAmbiguity || hasYearThreeAmbiguity ? (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            Existem turmas de 2º/3º série sem itinerário claro no nome. A prova agora é criada por público-alvo; revise o agrupamento escolhido antes de salvar.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
            <Button
              loading={syncStatus === "saving"}
              onClick={() => {
              if (!form.titulo.trim() || !selectedAudienceId || !questionCount) {
                setMessage("Informe o título e a quantidade de questões da prova.");
                return;
              }
              const audience = audienceOptions.find((item) => item.id === selectedAudienceId);
              if (!audience) return;
              const payload = {
                alternativas: form.alternativas.split(",").map((item) => item.trim()).filter(Boolean),
                audienceId: audience.id,
                audienceLabel: audience.label,
                data: form.data,
                groupType: audience.groupType,
                quantidadeQuestoes: questionCount,
                titulo: form.titulo,
                yearSegment: audience.yearSegment,
              };

              void (async () => {
                const result = editingId ? await updateExam(editingId, payload) : await createExam(payload);
                setMessage(result.message);
                if (result.ok) {
                  setEditingId(null);
                  resetExamForm();
                }
              })();
            }}
          >
            {editingId ? "Salvar prova" : "Nova prova"}
          </Button>
          {editingId ? (
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                resetExamForm();
              }}
            >
              Cancelar edição
            </Button>
          ) : null}
        </div>
        {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
        {syncStatus === "error" && syncError ? <p className="mt-2 text-sm text-[var(--error)]">{syncError}</p> : null}
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {data.exams.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--foreground)]">{item.titulo}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {formatDate(item.data)} • {item.audienceLabel}
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
                      audienceId: item.audienceId,
                      data: item.data,
                      quantidadeQuestoes: String(item.quantidadeQuestoes),
                      titulo: item.titulo,
                    });
                    syncRuleForm(item.id);
                    setMessage(`Editando ${item.titulo}.`);
                  }}
                >
                  <Edit3 className="size-4" />
                  Editar
                </Button>
                <Button variant="ghost" onClick={() => {
                  if (window.confirm(`Excluir a prova ${item.titulo}? Esta ação não pode ser desfeita.`)) {
                    void (async () => setMessage((await deleteExam(item.id)).message))();
                  }
                }}>
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {activeExam ? (
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
              <Input value={ruleForm.notaMaxima} onChange={(event) => setRuleForm((prev) => ({ ...prev, notaMaxima: event.target.value }))} placeholder="Nota máxima" type="number" min="1" step="0.1" />
              <Input value={ruleForm.pesoPadrao} onChange={(event) => setRuleForm((prev) => ({ ...prev, pesoPadrao: event.target.value }))} placeholder="Peso padrão" type="number" min="0.1" step="0.1" />
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
                placeholder={"Pesos por questão\n5=1.5\n12=2"}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                loading={syncStatus === "saving"}
                onClick={() => {
                  void (async () => {
                    const result = await saveCorrectionRule({
                      arredondamentoCasas: Number(ruleForm.arredondamentoCasas),
                      modoQuestaoAnulada: ruleForm.modoQuestaoAnulada as "full-credit" | "ignore",
                      notaMaxima: Number(ruleForm.notaMaxima),
                      pesoPadrao: Number(ruleForm.pesoPadrao),
                      pesosPorQuestaoRaw: ruleForm.pesosPorQuestaoRaw,
                      provaId: activeExam.id,
                      questoesAnuladasRaw: ruleForm.questoesAnuladasRaw,
                      totalQuestions: activeExam.quantidadeQuestoes,
                    });
                    setMessage(result.message);
                  })();
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
                    {activeExam.audienceLabel} • {activeExam.codigo}
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
  const { data, saveAnswerKey, syncError, syncStatus } = useAppData();
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

      <div className="mt-6 space-y-3 xl:hidden">
        {answers.map((selected, index) => (
          <Card key={`mobile-${index + 1}`} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--foreground)]">Questão {index + 1}</p>
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
                <p className="text-lg font-semibold text-[var(--foreground)]">Questão {index + 1}</p>
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
          loading={syncStatus === "saving"}
          onClick={() => {
            void (async () => {
              const result = await saveAnswerKey(exam.id, answers);
              setMessage(result.message);
            })();
          }}
        >
          <Save className="size-4" />
          Salvar gabarito
        </Button>
        <Badge tone="accent">{exam.quantidadeQuestoes} questões</Badge>
      </div>
      {message ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{message}</p> : null}
      {syncStatus === "error" && syncError ? <p className="mt-2 text-sm text-[var(--error)]">{syncError}</p> : null}
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
            {data.classes.slice().sort(compareClassrooms).map((item) => (
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
            <p className="text-sm text-[var(--muted-foreground)]">Ranking disponível</p>
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
  const { session } = useAppData();
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const canManagePasswordPolicy = canManageUsers(session?.role ?? "");
  const hasInstitutionalControl = canManageUsers(session?.role ?? "");

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
          setAdminMessage("Não foi possível carregar os usuários.");
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
      setAdminMessage("Não foi possível carregar os usuários.");
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
      {session ? <AdministrationCenter /> : null}
      {session && canManagePasswordPolicy ? <section id="equipe" className="scroll-mt-6"><UserManagementPanel currentUserId={session.id} currentRole={session.role} /></section> : null}
      {canManagePasswordPolicy ? (
        <Card id="seguranca" className="scroll-mt-6 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="accent">Controle administrativo</Badge>
                <Badge tone="neutral">{adminUsers.length} usuários encontrados</Badge>
                <Badge tone="warning">Perfis de gestão: admin e vice_diretor</Badge>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">Reset de primeiro acesso</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                Aqui você controla a obrigatoriedade de troca de senha. Ao marcar, cada usuário deverá definir uma nova senha pessoal antes de acessar o painel.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => void refreshAdminUsers()} disabled={adminLoading}>
                <ShieldCheck className="size-4" />
                Atualizar lista
              </Button>
              {hasInstitutionalControl ? <><Button onClick={() => void updatePasswordResetMode({ mode: "all", shouldForce: true })} disabled={adminLoading}><KeyRound className="size-4" />Forçar troca para todos</Button><Button variant="ghost" onClick={() => void updatePasswordResetMode({ mode: "all", shouldForce: false })} disabled={adminLoading}>Liberar todos</Button></> : null}
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {adminLoading && !adminUsers.length ? (
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">
                Carregando usuários...
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
                {canManageTargetUser(session?.role ?? "", user.perfil) ? <div className="flex flex-wrap gap-3">
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
                </div> : <p className="text-sm text-[var(--muted-foreground)]">Conta protegida</p>}
              </div>
            ))}
          </div>
          {adminMessage ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">{adminMessage}</p> : null}
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">O ProvaScan continua gratuito</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">Caso queira contribuir com a manutenção e desenvolvimento da ferramenta, você pode apoiar o projeto via PIX. É totalmente opcional.</p>
          </div>
          <Button variant="secondary" onClick={() => window.dispatchEvent(new Event("provascan:open-support"))}><Heart className="size-4" aria-hidden="true" /> Apoiar o ProvaScan</Button>
        </div>
      </Card>
    </div>
  );
}



