"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, FileImage, FileText, LoaderCircle, Save, ScanSearch, Upload, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { decodeDocumentPages, processDocumentPages } from "@/services/document-ingestion";
import {
  buildExamStructure,
  gradeObjectiveAnswers,
  inferSubjectsFromText,
  normalizeAnswerKey,
  validateExamStructure,
  type UniversalDetectedAnswer,
  type UniversalExamStructure,
} from "@/services/universal-exam-core";
import { analyzeUniversalPage, type UniversalBubbleRow } from "@/services/universal-layout-analysis";
import { extractTextFromImage } from "@/services/ocr";
import type { ExternalExamTemplate } from "@/types/universal-exams";

type Stage = "source" | "structure" | "key" | "students" | "review" | "results";
type BatchResult = {
  answers: UniversalDetectedAnswer[];
  elapsedMs: number;
  grade: ReturnType<typeof gradeObjectiveAnswers>;
  previewUrls: Record<number, string>;
  sourceLabel: string;
  studentName: string;
};

const STEPS: Array<{ id: Stage; label: string }> = [
  { id: "source", label: "Documento" },
  { id: "structure", label: "Estrutura" },
  { id: "key", label: "Gabarito" },
  { id: "students", label: "Folhas" },
  { id: "review", label: "Revisão" },
  { id: "results", label: "Resultados" },
];

const STATUS_LABEL = {
  blank: "Em branco",
  erasure_suspected: "Possível rasura",
  marked: "Respondida",
  multiple_marks: "Múltiplas marcações",
  uncertain: "Marcação incerta",
} as const;

export function ExternalCorrectionWorkspace({ onBack }: { onBack: () => void }) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const pdfRef = useRef<HTMLInputElement | null>(null);
  const keyFileRef = useRef<HTMLInputElement | null>(null);
  const studentFilesRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [stage, setStage] = useState<Stage>("source");
  const [templates, setTemplates] = useState<ExternalExamTemplate[]>([]);
  const [structure, setStructure] = useState<UniversalExamStructure | null>(null);
  const [totalQuestions, setTotalQuestions] = useState("");
  const [alternativeCount, setAlternativeCount] = useState("5");
  const [columnCount, setColumnCount] = useState("1");
  const [subjectsText, setSubjectsText] = useState("");
  const [answerKey, setAnswerKey] = useState<string[]>([]);
  const [answerKeyText, setAnswerKeyText] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [batch, setBatch] = useState<BatchResult[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Aguardando documento...");

  useEffect(() => {
    let active = true;
    void fetch("/api/external-exams", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { templates?: ExternalExamTemplate[] };
        if (active && response.ok) setTemplates(body.templates ?? []);
      })
      .catch(() => undefined);
    return () => { active = false; abortRef.current?.abort(); };
  }, []);

  const issueCount = useMemo(
    () => batch.reduce((sum, item) => sum + item.grade.reviewQuestions.length, 0),
    [batch],
  );

  const chooseTemplate = (saved: ExternalExamTemplate) => {
    setStructure({ ...saved.structure, source: "saved_template" });
    setAnswerKey(saved.answerKey);
    setAnswerKeyText(saved.answerKey.map((answer, index) => `${index + 1} ${answer}`).join("\n"));
    setTemplateId(saved.id);
    setTemplateName(saved.name);
    syncStructureFields(saved.structure);
    setStage("students");
    setMessage(`Modelo “${saved.name}” carregado. Agora adicione as folhas dos alunos.`);
    setError("");
  };

  const inspectStructureDocument = async (file: File | null) => {
    if (!file) return;
    beginProcessing("Preparando documento...", 8);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const pages = await decodeDocumentPages(file, {
        pageLimit: 1,
        signal: controller.signal,
        onPage: (page, total) => {
          setProgress(12 + Math.round((page / total) * 28));
          setProgressLabel(`Preparando página ${page} de ${total}...`);
        },
      });
      setProgressLabel("Identificando linhas, colunas e alternativas...");
      setProgress(52);
      const analyzedPage = analyzeUniversalPage(pages[0]);
      const layout = analyzedPage.layout;
      setPreviewUrl(analyzedPage.canvas.toDataURL("image/jpeg", 0.82));
      let subjects = [] as ReturnType<typeof inferSubjectsFromText>;
      try {
        setProgressLabel("Procurando matérias e intervalos...");
        setProgress(72);
        const ocr = await extractTextFromImage(analyzedPage.canvas.toDataURL("image/jpeg", 0.86));
        subjects = inferSubjectsFromText(ocr.rawText, layout.rows.length);
      } catch {
        subjects = [];
      }
      const detected = buildExamStructure({
        alternativeCount: layout.alternativeCount,
        columnCount: layout.columnCount,
        confidence: layout.confidence,
        source: "detected",
        subjectNames: subjects.length ? subjects.map((item) => item.name) : ["Geral"],
        questionsPerSubject: subjects.length
          ? subjects.map((item) => item.questionEnd - item.questionStart + 1)
          : [layout.rows.length],
      });
      setStructure(detected);
      syncStructureFields(detected);
      setProgress(100);
      setStage("structure");
      setMessage(
        pages.length > 1
          ? `Estrutura detectada na primeira de ${pages.length} páginas. Confirme se as demais usam o mesmo formato.`
          : "Estrutura detectada. Confira os números antes de continuar.",
      );
    } catch (caught) {
      setStage("structure");
      setStructure(null);
      setError(readError(caught, "Não conseguimos identificar a estrutura. Informe os dados manualmente ou envie outra imagem."));
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  };

  const confirmStructure = () => {
    try {
      const total = Number(totalQuestions);
      const parsedSubjects = parseSubjects(subjectsText, total);
      const next = buildExamStructure({
        alternativeCount: Number(alternativeCount),
        columnCount: Number(columnCount),
        confidence: structure?.confidence ?? 1,
        source: structure?.source ?? "manual",
        subjectNames: parsedSubjects.map((item) => item.name),
        questionsPerSubject: parsedSubjects.map((item) => item.count),
      });
      const problems = validateExamStructure(next);
      if (problems.length) throw new Error(problems[0]);
      setStructure(next);
      setAnswerKey(Array(next.totalQuestions).fill(""));
      setAnswerKeyText("");
      setStage("key");
      setError("");
      setMessage("Estrutura confirmada. Agora informe ou importe as respostas corretas.");
    } catch (caught) {
      setError(readError(caught, "Revise a estrutura informada."));
    }
  };

  const confirmManualKey = () => {
    if (!structure) return;
    try {
      const normalized = normalizeAnswerKey(answerKeyText, structure.alternatives, structure.totalQuestions);
      setAnswerKey(normalized);
      setStage("students");
      setError("");
      setMessage("Gabarito confirmado. Ele será reutilizado em todas as folhas deste lote.");
    } catch (caught) {
      setError(readError(caught, "Revise o gabarito."));
    }
  };

  const importAnswerKey = async (file: File | null) => {
    if (!file || !structure) return;
    beginProcessing("Preparando o gabarito...", 10);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const rows: UniversalBubbleRow[] = [];
      await processDocumentPages(file, { signal: controller.signal, onPage: (page, total) => {
        setProgress(10 + Math.round((page / total) * 35));
        setProgressLabel(`Preparando página ${page} de ${total}...`);
      }, onDecodedPage: (page) => {
        rows.push(...analyzeUniversalPage(page).layout.rows);
      } });
      if (rows.length < structure.totalQuestions) throw new Error(`Encontramos ${rows.length} de ${structure.totalQuestions} questões. Revise a estrutura ou envie uma imagem mais nítida.`);
      const imported = rows.slice(0, structure.totalQuestions).map((row) =>
        row.marks.status === "marked" && row.marks.markedIndexes.length === 1
          ? structure.alternatives[row.marks.markedIndexes[0]] ?? ""
          : "",
      );
      setAnswerKey(imported);
      setAnswerKeyText(imported.map((answer, index) => `${index + 1} ${answer}`).join("\n"));
      const missing = imported.filter((answer) => !answer).length;
      if (missing) {
        setError(`O sistema leu o gabarito, mas ${missing} ${missing === 1 ? "questão precisa" : "questões precisam"} de ajuste manual antes da confirmação.`);
      } else {
        setMessage("Usar esta folha como gabarito: leitura concluída. Confira e confirme abaixo.");
        setError("");
      }
    } catch (caught) {
      setError(readError(caught, "Não foi possível ler o gabarito enviado."));
    } finally {
      setProcessing(false);
      setProgress(100);
      abortRef.current = null;
    }
  };

  const saveTemplate = async () => {
    if (!structure || answerKey.some((answer) => !answer) || !templateName.trim()) {
      setError("Confirme um gabarito completo e informe o nome do modelo.");
      return;
    }
    setProcessing(true);
    try {
      const response = await fetch("/api/external-exams", {
        body: JSON.stringify({ answerKey, name: templateName.trim(), structure }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await response.json() as { error?: string; id?: string; message?: string };
      if (!response.ok || !body.id) throw new Error(body.error || "Não foi possível salvar o modelo.");
      setTemplateId(body.id);
      setMessage(body.message || "Modelo de correção salvo.");
      setError("");
    } catch (caught) {
      setError(readError(caught, "Não foi possível salvar o modelo."));
    } finally {
      setProcessing(false);
    }
  };

  const processStudentFiles = async (files: File[]) => {
    if (!structure || answerKey.length !== structure.totalQuestions || !files.length) return;
    beginProcessing("Preparando folhas dos alunos...", 5);
    const controller = new AbortController();
    abortRef.current = controller;
    const results: BatchResult[] = [];
    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex];
        const startedAt = window.performance.now();
        const pageRows: Array<Array<UniversalBubbleRow & { previewUrl: string }>> = [];
        await processDocumentPages(file, { signal: controller.signal, onPage: (page, total) => {
          setProgressLabel(`Arquivo ${fileIndex + 1} de ${files.length}: página ${page} de ${total}...`);
          setProgress(Math.round(((fileIndex + page / total) / files.length) * 70));
        }, onDecodedPage: (page) => {
          const analyzed = analyzeUniversalPage(page);
          pageRows.push(analyzed.layout.rows.map((row) => ({
            ...row,
            previewUrl: row.marks.status !== "marked" && row.marks.status !== "blank"
              ? cropRowPreview(analyzed.canvas, row)
              : "",
          })));
        } });
        const groups = groupPagesAsSheets(pageRows, structure.totalQuestions);
        groups.forEach((rows, groupIndex) => {
          const answers = rows.slice(0, structure.totalQuestions).map((row, index) => ({
            confidence: row.marks.confidence,
            detectedAnswers: row.marks.markedIndexes.map((mark) => structure.alternatives[mark]).filter(Boolean),
            question: index + 1,
            status: row.marks.status,
          }));
          const sourceLabel = safeSourceLabel(`${file.name}${groups.length > 1 ? ` · página ${groupIndex + 1}` : ""}`);
          results.push({
            answers,
            elapsedMs: Math.round((window.performance.now() - startedAt) / Math.max(groups.length, 1)),
            grade: gradeObjectiveAnswers({ answerKey, answers, maxScore: 10 }),
            previewUrls: Object.fromEntries(rows
              .map((row, index) => ({ question: index + 1, row }))
              .filter(({ row }) => row.marks.status !== "marked" && row.marks.status !== "blank")
              .map(({ question, row }) => [question, row.previewUrl])),
            sourceLabel,
            studentName: `Aluno ${results.length + 1}`,
          });
        });
      }
      setBatch(results);
      setStage("review");
      setProgress(100);
      setMessage(results.some((item) => item.grade.reviewQuestions.length)
        ? "Leitura concluída. Revise somente as questões indicadas abaixo."
        : "Leitura concluída sem marcações ambíguas. Confira os nomes e salve.");
      setError("");
    } catch (caught) {
      setError(readError(caught, "Não foi possível processar todas as folhas."));
    } finally {
      setProcessing(false);
      abortRef.current = null;
    }
  };

  const resolveQuestion = (batchIndex: number, question: number, answer: string) => {
    setBatch((current) => current.map((item, index) => {
      if (index !== batchIndex) return item;
      const answers = item.answers.map((row) => row.question === question
        ? { ...row, confidence: 1, detectedAnswers: answer ? [answer] : [], status: answer ? "marked" as const : "blank" as const }
        : row);
      return { ...item, answers, grade: gradeObjectiveAnswers({ answerKey, answers, maxScore: 10 }) };
    }));
  };

  const finishBatch = async () => {
    if (issueCount) {
      setError(`Ainda existem ${issueCount} ${issueCount === 1 ? "questão" : "questões"} para revisar.`);
      return;
    }
    if (batch.some((item) => !item.studentName.trim())) {
      setError("Informe o nome de cada aluno antes de salvar.");
      return;
    }
    beginProcessing("Salvando resultados...", 10);
    try {
      const response = await fetch("/api/external-corrections", {
        body: JSON.stringify({
          corrections: batch.map((item) => ({
            answerKey,
            answers: item.answers,
            sourceLabel: item.sourceLabel,
            studentName: item.studentName.trim(),
            structure,
            templateId,
          })),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível salvar o lote.");
      setProgress(100);
      setStage("results");
      setMessage(`${batch.length} ${batch.length === 1 ? "correção salva" : "correções salvas"} no histórico externo.`);
      setError("");
    } catch (caught) {
      setError(readError(caught, "Não foi possível salvar o lote."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="grid gap-5">
      <Card className="border-[var(--border-strong)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button type="button" className="text-sm font-semibold text-[var(--accent)] hover:underline" onClick={onBack}>← Voltar aos tipos de correção</button>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Correção de prova externa</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Use uma prova que já existe. O ProvaScan detecta o formato, você confirma e depois corrige quantos alunos precisar.</p>
          </div>
          <Badge tone="accent">Corretor universal</Badge>
        </div>
        <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Etapas da correção externa">
          {STEPS.map((item, index) => {
            const activeIndex = STEPS.findIndex((step) => step.id === stage);
            return <li key={item.id} className={`rounded-xl border px-3 py-3 text-sm font-semibold ${index === activeIndex ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]" : index < activeIndex ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}><span className="mr-2 tabular-nums">{index + 1}</span>{item.label}</li>;
          })}
        </ol>
      </Card>

      {stage === "source" ? <Card className="p-5 sm:p-6">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">Como deseja adicionar a prova?</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Envie uma folha em branco ou um cartão do mesmo formato que será usado pelos alunos.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SourceButton icon={<Camera className="size-5" />} label="Tirar foto" helper="Abra a câmera do celular" onClick={() => cameraRef.current?.click()} />
          <SourceButton icon={<FileImage className="size-5" />} label="Enviar imagem" helper="JPG, PNG ou WebP" onClick={() => imageRef.current?.click()} />
          <SourceButton icon={<FileText className="size-5" />} label="Enviar PDF" helper="Uma ou várias páginas" onClick={() => pdfRef.current?.click()} />
        </div>
        {templates.length ? <div className="mt-7 border-t border-[var(--border)] pt-5"><h4 className="font-semibold text-[var(--foreground)]">Ou reutilize um modelo de correção</h4><div className="mt-3 grid gap-2 sm:grid-cols-2">{templates.map((saved) => <button type="button" key={saved.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" onClick={() => chooseTemplate(saved)}><strong className="block text-sm text-[var(--foreground)]">{saved.name}</strong><span className="mt-1 block text-xs text-[var(--muted-foreground)]">{saved.structure.totalQuestions} questões · {saved.structure.subjects.length} matérias</span></button>)}</div></div> : null}
      </Card> : null}

      {stage === "structure" ? <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><h3 className="text-xl font-semibold text-[var(--foreground)]">Estrutura detectada</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">Nada será presumido sem sua confirmação. Edite qualquer campo que não corresponda à folha.</p></div>{structure ? <Badge tone={structure.confidence >= 0.8 ? "success" : "warning"}>{Math.round(structure.confidence * 100)}% de confiança estrutural</Badge> : <Badge tone="warning">Preenchimento manual</Badge>}</div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.8fr)]">
          <div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-3"><Field label="Questões"><Input inputMode="numeric" value={totalQuestions} onChange={(event) => setTotalQuestions(event.target.value)} /></Field><Field label="Alternativas"><Input inputMode="numeric" value={alternativeCount} onChange={(event) => setAlternativeCount(event.target.value)} /></Field><Field label="Colunas"><Input inputMode="numeric" value={columnCount} onChange={(event) => setColumnCount(event.target.value)} /></Field></div><Field label="Matérias e quantidades"><Textarea rows={7} placeholder={"Português:10\nMatemática:15\nHistória:5"} value={subjectsText} onChange={(event) => setSubjectsText(event.target.value)} /></Field><p className="text-xs leading-5 text-[var(--muted-foreground)]">Use uma linha por matéria. As quantidades podem ser diferentes e devem somar o total de questões.</p></div>
          <div className="relative min-h-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">{previewUrl ? <Image unoptimized fill sizes="(max-width: 1024px) 100vw, 40vw" src={previewUrl} alt="Página usada para detectar a estrutura" className="object-contain" /> : <div className="grid min-h-64 place-items-center p-6 text-center text-sm text-[var(--muted-foreground)]">A prévia não ficou disponível. Você ainda pode informar a estrutura manualmente.</div>}</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3"><Button size="lg" onClick={confirmStructure}><Check className="size-4" />Confirmar estrutura</Button><Button size="lg" variant="secondary" onClick={() => setStage("source")}>Enviar outro documento</Button></div>
      </Card> : null}

      {stage === "key" && structure ? <Card className="p-5 sm:p-6">
        <h3 className="text-xl font-semibold text-[var(--foreground)]">Defina o gabarito externo</h3><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Digite uma resposta por linha ou fotografe/importe uma folha preenchida corretamente.</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.7fr)]"><Field label="Gabarito manual"><Textarea rows={14} placeholder={"1 A\n2 B\n3 D\n4 C"} value={answerKeyText} onChange={(event) => setAnswerKeyText(event.target.value.toUpperCase())} /></Field><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><h4 className="font-semibold text-[var(--foreground)]">Importar gabarito</h4><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">A mesma pipeline lê foto, imagem e PDF. Marcações ambíguas ficam vazias para você corrigir.</p><Button className="mt-4 w-full" variant="secondary" onClick={() => keyFileRef.current?.click()}><Upload className="size-4" />Usar esta folha como gabarito</Button><p className="mt-3 text-xs text-[var(--muted-foreground)]">Aceita JPG, PNG, WebP e PDF.</p></div></div>
        <div className="mt-5 flex flex-wrap gap-3"><Button size="lg" onClick={confirmManualKey}><Check className="size-4" />Confirmar gabarito</Button><Button size="lg" variant="ghost" onClick={() => setStage("structure")}>Voltar à estrutura</Button></div>
      </Card> : null}

      {stage === "students" && structure ? <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-xl font-semibold text-[var(--foreground)]">Adicionar folhas dos alunos</h3><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Selecione várias imagens ou um PDF multipágina. Cada página completa vira uma correção independente; páginas parciais são reunidas até completar a prova.</p></div><Badge tone="accent">{structure.totalQuestions} questões</Badge></div>
        <button type="button" className="mt-5 flex min-h-44 w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] p-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" onClick={() => studentFilesRef.current?.click()}><ScanSearch className="size-8 text-[var(--accent)]" /><strong className="mt-3 text-base text-[var(--foreground)]">Selecionar folhas para corrigir</strong><span className="mt-1 text-sm text-[var(--muted-foreground)]">Imagens ou PDF, inclusive multipágina</span></button>
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-semibold text-[var(--foreground)]">Salvar como modelo de correção</h4><p className="mt-1 text-sm text-[var(--muted-foreground)]">Reutilize esta estrutura e este gabarito em outra turma.</p></div>{templateId ? <Badge tone="success">Modelo salvo</Badge> : null}</div><div className="mt-3 flex flex-col gap-3 sm:flex-row"><Input aria-label="Nome do modelo" placeholder="Ex.: Simulado Geral — 1º EM" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /><Button variant="secondary" disabled={processing || Boolean(templateId)} onClick={() => void saveTemplate()}><Save className="size-4" />Salvar modelo</Button></div></div>
      </Card> : null}

      {stage === "review" ? <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-xl font-semibold text-[var(--foreground)]">Revisar dúvidas</h3><p className="mt-2 text-sm text-[var(--muted-foreground)]">Somente branco duvidoso, múltiplas marcações, baixa confiança ou possível rasura aparecem aqui.</p></div><Badge tone={issueCount ? "warning" : "success"}>{issueCount} para revisar</Badge></div>
        <div className="mt-5 grid gap-4">{batch.map((item, batchIndex) => <section key={`${item.sourceLabel}-${batchIndex}`} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Input aria-label={`Nome do aluno ${batchIndex + 1}`} value={item.studentName} onChange={(event) => setBatch((current) => current.map((value, index) => index === batchIndex ? { ...value, studentName: event.target.value } : value))} /><div className="flex gap-2"><Badge tone="success">{item.grade.summary.correct} acertos</Badge><Badge tone="neutral">Nota {item.grade.summary.score.toFixed(1)}</Badge></div></div><p className="mt-2 text-xs text-[var(--muted-foreground)]">{item.sourceLabel}</p><div className="mt-4 grid gap-3">{item.answers.filter((answer) => item.grade.reviewQuestions.includes(answer.question)).map((answer) => <div key={answer.question} className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[var(--foreground)]">Questão {answer.question}</strong><span className="text-xs font-semibold text-[var(--muted-foreground)]">{STATUS_LABEL[answer.status]} · {Math.round(answer.confidence * 100)}%</span></div>{item.previewUrls[answer.question] ? <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-white p-2"><p className="mb-2 text-xs font-semibold text-slate-700">Recorte original</p><Image unoptimized width={720} height={180} src={item.previewUrls[answer.question]} alt={`Recorte original da questão ${answer.question}`} className="h-auto max-h-32 w-full object-contain" /></div> : null}{answer.status === "multiple_marks" ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">Detectadas: {answer.detectedAnswers.join(" e ")}. Não escolhemos uma delas automaticamente.</p> : null}<div className="mt-3 flex flex-wrap gap-2">{structure?.alternatives.map((alternative) => <Button key={alternative} variant="secondary" onClick={() => resolveQuestion(batchIndex, answer.question, alternative)}>{alternative}</Button>)}<Button variant="ghost" onClick={() => resolveQuestion(batchIndex, answer.question, "")}>Em branco</Button></div></div>)}{!item.grade.reviewQuestions.length ? <p className="rounded-xl bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--foreground)]">Nenhuma questão ambígua nesta folha.</p> : null}</div></section>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><Button size="lg" disabled={processing || issueCount > 0} onClick={() => void finishBatch()}>{processing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}Confirmar revisão e salvar</Button><Button size="lg" variant="secondary" onClick={() => setStage("students")}>Adicionar outras folhas</Button></div>
      </Card> : null}

      {stage === "results" ? <Card className="p-5 sm:p-6"><div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-soft)] p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[var(--success)] text-white"><Check className="size-5" /></span><div><h3 className="text-xl font-semibold text-[var(--foreground)]">Lote concluído</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">As correções externas foram registradas sem armazenar as imagens originais.</p></div></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{batch.map((item) => <div key={item.sourceLabel} className="rounded-2xl border border-[var(--border)] p-4"><strong className="text-sm text-[var(--foreground)]">{item.studentName}</strong><p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--foreground)]">{item.grade.summary.score.toFixed(1)}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.grade.summary.correct} acertos · {item.grade.summary.blank} em branco · {item.elapsedMs} ms</p></div>)}</div><Button className="mt-5" size="lg" onClick={() => resetFlow()}><WandSparkles className="size-4" />Corrigir outro lote</Button></Card> : null}

      {processing ? <Card className="p-4" aria-live="polite" aria-busy="true"><div className="flex items-center gap-3"><LoaderCircle className="size-5 animate-spin text-[var(--accent)] motion-reduce:animate-none" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><strong className="text-sm text-[var(--foreground)]">{progressLabel}</strong><span className="text-sm tabular-nums text-[var(--muted-foreground)]">{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface)]"><span className="block h-full rounded-full bg-[var(--accent)] transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div></div><Button variant="ghost" onClick={() => abortRef.current?.abort()}>Cancelar</Button></div></Card> : null}
      {error ? <p role="alert" className="rounded-xl border border-[var(--error-border)] bg-[var(--error-soft)] px-4 py-3 text-sm text-[var(--foreground)]">{error}</p> : null}
      {message ? <p role="status" aria-live="polite" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">{message}</p> : null}

      <input ref={cameraRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => { void inspectStructureDocument(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <input ref={imageRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void inspectStructureDocument(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <input ref={pdfRef} className="hidden" type="file" accept="application/pdf" onChange={(event) => { void inspectStructureDocument(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <input ref={keyFileRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { void importAnswerKey(event.target.files?.[0] ?? null); event.target.value = ""; }} />
      <input ref={studentFilesRef} className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { void processStudentFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    </div>
  );

  function beginProcessing(label: string, value: number) {
    setProcessing(true); setProgress(value); setProgressLabel(label); setError(""); setMessage("");
  }

  function syncStructureFields(value: UniversalExamStructure) {
    setTotalQuestions(String(value.totalQuestions));
    setAlternativeCount(String(value.alternatives.length));
    setColumnCount(String(value.columnCount));
    setSubjectsText(value.subjects.map((subject) => `${subject.name}:${subject.questionEnd - subject.questionStart + 1}`).join("\n"));
  }

  function resetFlow() {
    setStage("source"); setStructure(null); setAnswerKey([]); setAnswerKeyText(""); setBatch([]); setTemplateId(null); setTemplateName(""); setPreviewUrl(""); setMessage(""); setError("");
  }
}

function SourceButton({ helper, icon, label, onClick }: { helper: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" className="flex min-h-32 flex-col items-start justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transform-none" onClick={onClick}><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">{icon}</span><span><strong className="block text-base text-[var(--foreground)]">{label}</strong><span className="mt-1 block text-sm text-[var(--muted-foreground)]">{helper}</span></span></button>;
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="grid gap-2 text-sm font-semibold text-[var(--foreground)]"><span>{label}</span>{children}</label>;
}

function parseSubjects(raw: string, total: number) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [{ count: total, name: "Geral" }];
  const parsed = lines.map((line, index) => {
    const match = line.match(/^(.+?):\s*(\d+)$/);
    if (!match) throw new Error(`Linha ${index + 1}: use o formato Matéria:quantidade.`);
    return { count: Number(match[2]), name: match[1].trim() };
  });
  if (parsed.some((item) => item.count < 1)) throw new Error("Cada matéria precisa ter ao menos uma questão.");
  if (parsed.reduce((sum, item) => sum + item.count, 0) !== total) throw new Error("As quantidades das matérias precisam somar o total de questões.");
  return parsed;
}

function groupPagesAsSheets<T extends UniversalBubbleRow>(pages: T[][], expected: number) {
  const groups: T[][] = [];
  let partial: T[] = [];
  for (const rows of pages) {
    if (rows.length >= expected) {
      if (partial.length) throw new Error(`Uma folha ficou incompleta: encontramos ${partial.length} de ${expected} questões.`);
      groups.push(rows.slice(0, expected));
      continue;
    }
    partial.push(...rows);
    if (partial.length >= expected) {
      groups.push(partial.slice(0, expected));
      partial = partial.slice(expected);
    }
  }
  if (partial.length) throw new Error(`A última folha ficou incompleta: encontramos ${partial.length} de ${expected} questões.`);
  return groups;
}

function cropRowPreview(canvas: HTMLCanvasElement, row: UniversalBubbleRow) {
  const minX = Math.max(0, Math.floor(Math.min(...row.bubbles.map((bubble) => bubble.x - bubble.width / 2)) - 80));
  const maxX = Math.min(canvas.width, Math.ceil(Math.max(...row.bubbles.map((bubble) => bubble.x + bubble.width / 2)) + 30));
  const minY = Math.max(0, Math.floor(Math.min(...row.bubbles.map((bubble) => bubble.y - bubble.height / 2)) - 20));
  const maxY = Math.min(canvas.height, Math.ceil(Math.max(...row.bubbles.map((bubble) => bubble.y + bubble.height / 2)) + 20));
  const preview = document.createElement("canvas");
  preview.width = Math.max(1, maxX - minX);
  preview.height = Math.max(1, maxY - minY);
  preview.getContext("2d")?.drawImage(canvas, minX, minY, preview.width, preview.height, 0, 0, preview.width, preview.height);
  return preview.toDataURL("image/jpeg", 0.82);
}

function safeSourceLabel(value: string) {
  return value.replace(/[\\/\u0000-\u001f]/g, "-").replace(/\.\.+/g, ".").slice(0, 260);
}

function readError(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") return "Processamento cancelado. Nenhum resultado foi salvo.";
  return error instanceof Error ? error.message : fallback;
}
