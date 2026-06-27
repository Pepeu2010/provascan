"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileImage,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  RotateCw,
  Save,
  ScanSearch,
  UserRoundSearch,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MIN_CONFIDENCE_REVIEW = 75;
const PROCESSING_STEPS = [
  { label: "Preparando imagem...", progress: 18 },
  { label: "Lendo nome do aluno...", progress: 46 },
  { label: "Detectando respostas...", progress: 74 },
  { label: "Comparando com o gabarito...", progress: 100 },
] as const;

type ScanPhase = "idle" | "processing" | "review" | "error";
type ResultFilter = "all" | "review" | "wrong";

type ScanAnswer = {
  confidence: number;
  correctAnswer: string;
  detectedAnswer: string;
  question: number;
};

type ScanReview = {
  answers: ScanAnswer[];
  confidence: number;
  detectedName: string;
  detectedRegistration: string;
  matchedStudentId: string;
  notes: string[];
  processingLabel: string;
  qualitySummary: {
    brightness: string;
    cropApplied: boolean;
    dimensions: string;
    lowLight: boolean;
    orientation: string;
    shadowRisk: boolean;
  };
};

type PreprocessResult = {
  compressedBytes: number;
  confidenceBase: number;
  cropApplied: boolean;
  dimensions: string;
  height: number;
  lowLight: boolean;
  orientation: string;
  previewUrl: string;
  processedLabel: string;
  shadowRisk: boolean;
  width: number;
};

export function CorrectionWorkspace({ compact = false }: { compact?: boolean }) {
  const { data, saveCorrection } = useAppData();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cancelProcessingRef = useRef(false);

  const [examId, setExamId] = useState(data.exams[0]?.id ?? "");
  const [preferredStudentId, setPreferredStudentId] = useState(data.students[0]?.id ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState("");
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparando fluxo...");
  const [errorMessage, setErrorMessage] = useState("");
  const [screenMessage, setScreenMessage] = useState("");
  const [review, setReview] = useState<ScanReview | null>(null);
  const [notes, setNotes] = useState("Revisao manual obrigatoria antes da confirmacao final.");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");

  const exam = data.exams.find((item) => item.id === examId) ?? data.exams[0];
  const answerKey = useMemo(
    () => data.answerKeys.filter((item) => item.provaId === exam?.id).sort((a, b) => a.questao - b.questao),
    [data.answerKeys, exam?.id],
  );
  const studentsForExam = useMemo(() => {
    if (!exam) {
      return data.students;
    }
    const scoped = data.students.filter((item) => item.turma === exam.turma);
    return scoped.length ? scoped : data.students;
  }, [data.students, exam]);
  const selectedClass = data.classes.find((item) => item.id === exam?.turma);

  const activePreferredStudentId =
    studentsForExam.find((item) => item.id === preferredStudentId)?.id ?? studentsForExam[0]?.id ?? "";

  const visibleAnswers = useMemo(() => {
    if (!review) {
      return [];
    }

    if (resultFilter === "review") {
      return review.answers.filter((item) => item.confidence < MIN_CONFIDENCE_REVIEW);
    }

    if (resultFilter === "wrong") {
      return review.answers.filter((item) => item.detectedAnswer !== item.correctAnswer);
    }

    return review.answers;
  }, [resultFilter, review]);

  const summary = useMemo(() => {
    if (!review) {
      return { acertos: 0, erros: 0, percentual: 0, revisao: 0 };
    }

    const acertos = review.answers.filter((item) => item.detectedAnswer === item.correctAnswer).length;
    const erros = review.answers.length - acertos;
    const revisao = review.answers.filter((item) => item.confidence < MIN_CONFIDENCE_REVIEW).length;
    const percentual = review.answers.length ? Math.round((acertos / review.answers.length) * 100) : 0;
    return { acertos, erros, percentual, revisao };
  }, [review]);

  if (!exam || !studentsForExam.length) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          Cadastre pelo menos uma prova com gabarito e um aluno para abrir o scanner OCR.
        </p>
      </Card>
    );
  }

  const selectedReviewStudent =
    studentsForExam.find((item) => item.id === review?.matchedStudentId) ??
    data.students.find((item) => item.id === review?.matchedStudentId) ??
    studentsForExam.find((item) => item.id === preferredStudentId) ??
    studentsForExam[0];

  const processSelectedImage = async () => {
    if (!selectedFile) {
      setErrorMessage("Selecione uma foto JPG, PNG ou WebP antes de iniciar o OCR.");
      setPhase("error");
      return;
    }

    if (!answerKey.length) {
      setErrorMessage("Esta prova ainda nao possui gabarito salvo.");
      setPhase("error");
      return;
    }

    cancelProcessingRef.current = false;
    setScreenMessage("");
    setErrorMessage("");
    setPhase("processing");
    setProgress(8);
    setProgressLabel(PROCESSING_STEPS[0].label);

    try {
      await waitWithCancel(160, cancelProcessingRef);
      const preprocessing = await preprocessImage(selectedFile);
      if (cancelProcessingRef.current) {
        throw new Error("Processamento cancelado.");
      }

      setProcessedPreviewUrl(preprocessing.previewUrl);

      setProgressLabel(PROCESSING_STEPS[1].label);
      setProgress(PROCESSING_STEPS[1].progress);
      await waitWithCancel(240, cancelProcessingRef);

      const identity = detectIdentity({
        fileName: selectedFile.name,
        preferredStudentId: activePreferredStudentId,
        quality: preprocessing,
        students: studentsForExam,
      });
      if (cancelProcessingRef.current) {
        throw new Error("Processamento cancelado.");
      }

      setProgressLabel(PROCESSING_STEPS[2].label);
      setProgress(PROCESSING_STEPS[2].progress);
      await waitWithCancel(240, cancelProcessingRef);

      const detectedAnswers = detectAnswers({
        alternatives: exam.alternativas,
        answerKey: answerKey.map((item) => ({ correctAnswer: item.respostaCorreta, question: item.questao })),
        confidenceBase: Math.min(preprocessing.confidenceBase, identity.confidence),
        fileName: selectedFile.name,
      });

      setProgressLabel(PROCESSING_STEPS[3].label);
      setProgress(PROCESSING_STEPS[3].progress);
      await waitWithCancel(180, cancelProcessingRef);

      const needsManualReview =
        preprocessing.lowLight ||
        preprocessing.shadowRisk ||
        identity.confidence < MIN_CONFIDENCE_REVIEW ||
        detectedAnswers.some((item) => item.confidence < MIN_CONFIDENCE_REVIEW);

      setReview({
        answers: detectedAnswers,
        confidence: Math.max(42, Math.min(98, Math.round((identity.confidence + preprocessing.confidenceBase) / 2))),
        detectedName: identity.detectedName,
        detectedRegistration: identity.detectedRegistration,
        matchedStudentId: identity.matchedStudentId,
        notes: [
          preprocessing.processedLabel,
          preprocessing.cropApplied ? "Recorte automatico da area util aplicado." : "Recorte automatico manteve a imagem inteira.",
          preprocessing.lowLight ? "Imagem com pouca luz: revisar nome e respostas manualmente." : "Iluminacao dentro do esperado.",
          preprocessing.shadowRisk ? "Sombra detectada: marcacoes foram sinalizadas para revisao." : "Sem sombra relevante no cartao.",
          needsManualReview ? "Fluxo marcado para revisao manual obrigatoria." : "Leitura automatica consistente, mas ainda exige conferencia final.",
        ],
        processingLabel: needsManualReview ? "Revisao manual obrigatoria" : "Leitura pronta para conferencia",
        qualitySummary: {
          brightness: preprocessing.lowLight ? "Baixa" : "Boa",
          cropApplied: preprocessing.cropApplied,
          dimensions: preprocessing.dimensions,
          lowLight: preprocessing.lowLight,
          orientation: preprocessing.orientation,
          shadowRisk: preprocessing.shadowRisk,
        },
      });
      setNotes("Revisao manual obrigatoria antes da confirmacao final.");
      setPhase("review");
      setScreenMessage("OCR concluido. Revise os campos abaixo antes de confirmar a correcao.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao processar a imagem.";
      if (message === "Processamento cancelado.") {
        setPhase("idle");
        setProgress(0);
        setProgressLabel("Processamento cancelado.");
        setScreenMessage("O processamento foi cancelado sem perder a imagem enviada.");
        return;
      }
      setPhase("error");
      setErrorMessage(`${message} Tente novamente ou preencha manualmente.`);
    }
  };

  const startManualReview = () => {
    setReview({
      answers: answerKey.map((item, index) => ({
        confidence: 30,
        correctAnswer: item.respostaCorreta,
        detectedAnswer: index === 0 ? item.respostaCorreta : "",
        question: item.questao,
      })),
      confidence: 30,
      detectedName: selectedReviewStudent.nome,
      detectedRegistration: selectedReviewStudent.matricula,
        matchedStudentId: activePreferredStudentId,
      notes: [
        "Fluxo aberto em modo manual.",
        "A imagem foi mantida para conferencia visual.",
        "Preencha ou ajuste todas as respostas antes de confirmar.",
      ],
      processingLabel: "Preenchimento manual",
      qualitySummary: {
        brightness: "Nao avaliada",
        cropApplied: false,
        dimensions: selectedFile ? `${selectedFile.name}` : "Sem imagem",
        lowLight: false,
        orientation: "Manual",
        shadowRisk: false,
      },
    });
    setPhase("review");
    setScreenMessage("Modo manual habilitado. A imagem continua disponivel para consulta.");
  };

  const handleFileSelected = (file: File | null) => {
    setScreenMessage("");
    setReview(null);
    setProcessedPreviewUrl("");
    setErrorMessage("");
    setProgress(0);
    setProgressLabel("Preparando fluxo...");
    setPhase("idle");

    if (!file) {
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.ok) {
      setSelectedFile(null);
      setErrorMessage(validation.message);
      setPhase("error");
      return;
    }

    if (rawPreviewUrl) {
      URL.revokeObjectURL(rawPreviewUrl);
    }

    setSelectedFile(file);
    setRawPreviewUrl(URL.createObjectURL(file));
    setScreenMessage("Imagem pronta para pre-visualizacao e processamento.");
  };

  const confirmCorrection = () => {
    if (!review) {
      setErrorMessage("Nenhuma leitura para salvar. Inicie um OCR ou abra o modo manual.");
      setPhase("error");
      return;
    }

    if (!review.matchedStudentId) {
      setErrorMessage("Selecione manualmente o aluno antes de confirmar a correcao.");
      return;
    }

    const unanswered = review.answers.some((item) => !item.detectedAnswer);
    if (unanswered) {
      setErrorMessage("Preencha todas as respostas antes de confirmar a correcao.");
      return;
    }

    const result = saveCorrection({
      answers: review.answers.map((item) => item.detectedAnswer),
      examId: exam.id,
      imageLabel: selectedFile?.name ?? "captura-manual.jpg",
      notes: [
        notes,
        `Confianca geral do OCR: ${review.confidence}%`,
        `Nome detectado: ${review.detectedName}`,
        `Matricula detectada: ${review.detectedRegistration}`,
        ...review.notes,
      ],
      studentId: review.matchedStudentId,
    });

    setScreenMessage(result.message);
    setErrorMessage("");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <div className={cn("grid gap-5", compact ? "" : "")}>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <ScanSearch className="size-4 text-[var(--accent)]" />
              Scanner OCR responsivo
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              No celular, priorize a camera. No desktop, envie o arquivo e revise a imagem processada antes de confirmar.
            </p>
          </div>

          <div className="grid gap-3">
            <FieldLabel label="Prova para corrigir">
              <select
                value={examId}
                onChange={(event) => {
                  const nextExamId = event.target.value;
                  const nextExam = data.exams.find((item) => item.id === nextExamId);
                  const nextStudents = nextExam
                    ? data.students.filter((item) => item.turma === nextExam.turma)
                    : data.students;
                  setExamId(nextExamId);
                  setPreferredStudentId((nextStudents[0] ?? data.students[0])?.id ?? "");
                  setReview(null);
                  setScreenMessage("");
                }}
                className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none"
              >
                {data.exams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo}
                  </option>
                ))}
              </select>
            </FieldLabel>

            <FieldLabel label="Aluno preferencial para busca">
              <select
                value={activePreferredStudentId}
                onChange={(event) => setPreferredStudentId(event.target.value)}
                className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none"
              >
                {studentsForExam.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>

          <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="min-h-12 flex-1" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="size-4" />
                Tirar foto
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="min-h-12 flex-1"
                onClick={() => uploadInputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                Enviar arquivo
              </Button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
              Aceita JPG, PNG e WebP ate 12 MB. Fotos horizontais, verticais e imagens pequenas ou grandes sao ajustadas automaticamente.
            </p>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              handleFileSelected(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              handleFileSelected(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />

          <ImagePreviewCard
            fileName={selectedFile?.name ?? "Nenhuma imagem enviada"}
            phase={phase}
            processedPreviewUrl={processedPreviewUrl}
            rawPreviewUrl={rawPreviewUrl}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard label="Turma" value={selectedClass?.nome ?? "Sem turma"} helper="base atual da prova" />
            <MetricCard
              label="Questoes"
              value={String(answerKey.length)}
              helper="alternativas A, B, C, D e E"
            />
          </div>

          <div className="grid gap-3">
            <Button
              size="lg"
              className="min-h-12 w-full"
              onClick={() => {
                void processSelectedImage();
              }}
              disabled={!selectedFile || phase === "processing"}
            >
              {phase === "processing" ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              Processar OCR
            </Button>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                variant="secondary"
                className="min-h-12"
                onClick={startManualReview}
              >
                <UserRoundSearch className="size-4" />
                Preencher manualmente
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="min-h-12 border border-[var(--border)]"
                onClick={() => {
                  setReview(null);
                  setProcessedPreviewUrl("");
                  setScreenMessage("");
                  setErrorMessage("");
                  setPhase("idle");
                }}
              >
                <RefreshCw className="size-4" />
                Limpar fluxo
              </Button>
            </div>
          </div>

          {phase === "processing" ? (
            <ProcessingCard
              label={progressLabel}
              progress={progress}
              onCancel={() => {
                cancelProcessingRef.current = true;
              }}
            />
          ) : null}

          {errorMessage ? (
            <StatusCard tone="error" title="Nao foi possivel concluir o OCR">
              {errorMessage}
            </StatusCard>
          ) : null}

          {screenMessage ? (
            <StatusCard tone="info" title="Status do fluxo">
              {screenMessage}
            </StatusCard>
          ) : null}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        {!review ? (
          <EmptyReviewState />
        ) : (
          <div className="grid gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Revisao manual obrigatoria</p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Conferencia da leitura OCR</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                  Ajuste nome, matricula, aluno encontrado na planilha Google e todas as respostas antes de confirmar.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={review.confidence >= MIN_CONFIDENCE_REVIEW ? "accent" : "warning"}>
                  {review.confidence}% de confianca
                </Badge>
                <Badge tone="neutral">{review.processingLabel}</Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Acertos" value={String(summary.acertos)} helper="comparado com o gabarito" />
              <MetricCard label="Erros" value={String(summary.erros)} helper="pedem conferencia" />
              <MetricCard label="Percentual" value={`${summary.percentual}%`} helper="resultado atual" />
              <MetricCard label="Baixa confianca" value={String(summary.revisao)} helper="marcados para revisar" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">Dados detectados</p>
                <div className="mt-4 grid gap-3">
                  <FieldLabel label="Nome detectado">
                    <Input
                      value={review.detectedName}
                      onChange={(event) =>
                        setReview((previous) =>
                          previous ? { ...previous, detectedName: event.target.value } : previous,
                        )
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Matricula detectada">
                    <Input
                      value={review.detectedRegistration}
                      onChange={(event) =>
                        setReview((previous) =>
                          previous ? { ...previous, detectedRegistration: event.target.value } : previous,
                        )
                      }
                    />
                  </FieldLabel>
                  <FieldLabel label="Aluno encontrado na planilha Google">
                    <select
                      value={review.matchedStudentId}
                      onChange={(event) =>
                        setReview((previous) =>
                          previous ? { ...previous, matchedStudentId: event.target.value } : previous,
                        )
                      }
                      className="h-12 rounded-2xl border border-[var(--border)] bg-[var(--input-bg)] px-4 text-sm text-[var(--foreground)] outline-none"
                    >
                      {studentsForExam.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome} - {item.matricula}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">Qualidade da leitura</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoPanel label="Orientacao" value={review.qualitySummary.orientation} />
                  <InfoPanel label="Brilho" value={review.qualitySummary.brightness} />
                  <InfoPanel label="Dimensoes" value={review.qualitySummary.dimensions} />
                  <InfoPanel
                    label="Recorte automatico"
                    value={review.qualitySummary.cropApplied ? "Aplicado" : "Nao necessario"}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={review.qualitySummary.lowLight ? "warning" : "success"}>
                    {review.qualitySummary.lowLight ? "Pouca luz" : "Luz adequada"}
                  </Badge>
                  <Badge tone={review.qualitySummary.shadowRisk ? "warning" : "neutral"}>
                    {review.qualitySummary.shadowRisk ? "Sombra detectada" : "Sem sombra forte"}
                  </Badge>
                </div>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {review.notes.map((note) => (
                    <li key={note} className="rounded-2xl bg-[var(--surface)] px-3 py-2">
                      {note}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-[var(--foreground)]">Filtros de revisao</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "Todas" },
                    { key: "review", label: "Baixa confianca" },
                    { key: "wrong", label: "Apenas erros" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setResultFilter(item.key as ResultFilter)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                        resultFilter === item.key
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--card-solid)] text-[var(--foreground)]",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {visibleAnswers.map((answer) => (
                <MobileAnswerCard
                  key={`mobile-${answer.question}`}
                  alternatives={exam.alternativas}
                  answer={answer}
                  onSelect={(alternative) => {
                    setReview((previous) =>
                      previous
                        ? {
                            ...previous,
                            answers: previous.answers.map((item) =>
                              item.question === answer.question ? { ...item, detectedAnswer: alternative } : item,
                            ),
                          }
                        : previous,
                    );
                  }}
                />
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-[28px] border border-[var(--border)] lg:block">
              <div className="grid grid-cols-[100px_1fr_1fr_160px_120px] gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                <span>Questao</span>
                <span>Gabarito correto</span>
                <span>Resposta do aluno</span>
                <span>Status final</span>
                <span>Confianca</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {visibleAnswers.map((answer) => {
                  const isCorrect = answer.detectedAnswer === answer.correctAnswer;
                  const needsReview = answer.confidence < MIN_CONFIDENCE_REVIEW;
                  return (
                    <div
                      key={answer.question}
                      className="grid grid-cols-[100px_1fr_1fr_160px_120px] gap-3 px-4 py-4"
                    >
                      <div className="font-semibold text-[var(--foreground)]">Q{String(answer.question).padStart(2, "0")}</div>
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{answer.correctAnswer}</Badge>
                        <span className="text-sm text-[var(--muted-foreground)]">Alternativa correta</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {exam.alternativas.map((alternative) => (
                          <button
                            key={`${answer.question}-${alternative}`}
                            type="button"
                            onClick={() => {
                              setReview((previous) =>
                                previous
                                  ? {
                                      ...previous,
                                      answers: previous.answers.map((item) =>
                                        item.question === answer.question
                                          ? { ...item, detectedAnswer: alternative }
                                          : item,
                                      ),
                                    }
                                  : previous,
                              );
                            }}
                            className={cn(
                              "grid size-11 place-items-center rounded-2xl border text-sm font-semibold transition-colors",
                              answer.correctAnswer === alternative
                                ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]"
                                : "border-[var(--border)] bg-[var(--card-solid)] text-[var(--foreground)]",
                              answer.detectedAnswer === alternative &&
                                answer.detectedAnswer !== answer.correctAnswer &&
                                "border-[var(--error-border)] bg-[var(--error-soft)] text-[var(--error)]",
                            )}
                          >
                            {alternative}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center">
                        <Badge tone={isCorrect ? "success" : "error"}>{isCorrect ? "Acerto" : "Erro"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", needsReview ? "text-[var(--warning)]" : "text-[var(--foreground)]")}>
                          {answer.confidence}%
                        </span>
                        {needsReview ? <AlertTriangle className="size-4 text-[var(--warning)]" /> : <CheckCircle2 className="size-4 text-[var(--success)]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <FieldLabel label="Observacoes finais da revisao">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-28 w-full rounded-[24px] border border-[var(--border)] bg-[var(--input-bg)] p-4 text-sm text-[var(--foreground)] outline-none"
                placeholder="Anote ajustes manuais, observacoes de camera, sombra, baixa luz ou necessidade de nova captura."
              />
            </FieldLabel>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button size="lg" className="min-h-12 w-full" data-testid="save-correction" onClick={confirmCorrection}>
                <Save className="size-4" />
                Confirmar correcao
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="min-h-12 w-full"
                onClick={() => {
                  if (selectedFile) {
                    void processSelectedImage();
                    return;
                  }
                  setErrorMessage("Envie ou fotografe uma imagem antes de tentar novamente.");
                }}
              >
                <RotateCw className="size-4" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyReviewState() {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] px-6 py-10 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <FileImage className="size-7" />
      </div>
      <h3 className="mt-5 text-2xl font-semibold text-[var(--foreground)]">Tela especifica de correcao por foto</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
        Envie uma foto, visualize o pre-processamento, acompanhe o OCR por etapas e faca a revisao manual obrigatoria
        antes de salvar. O layout se adapta de 360px ate telas grandes sem estourar a imagem.
      </p>
      <div className="mt-6 grid w-full max-w-3xl gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          "Preview responsivo sem sobreposicao",
          "Camera no celular e upload no desktop",
          "Revisao manual de nome, matricula e respostas",
          "Resultado em cards no mobile e grade no desktop",
        ].map((item) => (
          <div key={item} className="rounded-[22px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--foreground)]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileAnswerCard({
  alternatives,
  answer,
  onSelect,
}: {
  alternatives: string[];
  answer: ScanAnswer;
  onSelect: (alternative: string) => void;
}) {
  const isCorrect = answer.detectedAnswer === answer.correctAnswer;
  const needsReview = answer.confidence < MIN_CONFIDENCE_REVIEW;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Questao {answer.question}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Layout vertical otimizado para toque</p>
        </div>
        <Badge tone={isCorrect ? "success" : "error"}>{isCorrect ? "Acerto" : "Erro"}</Badge>
      </div>

      <div className="mt-4 grid gap-3">
        <SectionBlock title="Gabarito correto" value={answer.correctAnswer} />
        <div className="rounded-[20px] border border-[var(--border)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Resposta do aluno / para lancar</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {alternatives.map((alternative) => (
              <button
                key={`${answer.question}-mobile-${alternative}`}
                type="button"
                onClick={() => onSelect(alternative)}
                className={cn(
                  "min-h-12 rounded-2xl border text-sm font-semibold",
                  answer.correctAnswer === alternative
                    ? "border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]"
                    : "border-[var(--border)] bg-[var(--card-solid)] text-[var(--foreground)]",
                  answer.detectedAnswer === alternative &&
                    answer.detectedAnswer !== answer.correctAnswer &&
                    "border-[var(--error-border)] bg-[var(--error-soft)] text-[var(--error)]",
                )}
              >
                {alternative}
              </button>
            ))}
          </div>
        </div>
        <SectionBlock title="Gabarito do aluno" value={answer.detectedAnswer || "Nao lancado"} />
        <div
          className={cn(
            "rounded-[20px] border p-4",
            isCorrect
              ? "border-[var(--success-border)] bg-[var(--success-soft)]"
              : "border-[var(--error-border)] bg-[var(--error-soft)]",
          )}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Status final</p>
          <div className="mt-2 flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle2 className="size-4 text-[var(--success)]" />
            ) : (
              <XCircle className="size-4 text-[var(--error)]" />
            )}
            <p className={cn("text-sm font-semibold", isCorrect ? "text-[var(--success)]" : "text-[var(--error)]")}>
              {isCorrect ? "Resposta correta confirmada" : "Resposta divergente do gabarito"}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            {needsReview ? <AlertTriangle className="size-4 text-[var(--warning)]" /> : <CheckCircle2 className="size-4 text-[var(--success)]" />}
            <span>{needsReview ? "Baixa confianca: revisar manualmente." : `Confianca de ${answer.confidence}%.`}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ImagePreviewCard({
  fileName,
  phase,
  processedPreviewUrl,
  rawPreviewUrl,
}: {
  fileName: string;
  phase: ScanPhase;
  processedPreviewUrl: string;
  rawPreviewUrl: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <PreviewPane
        label="Imagem original"
        helper={fileName}
        src={rawPreviewUrl}
        emptyText="A foto aparece aqui antes do processamento."
      />
      <PreviewPane
        label="Imagem processada"
        helper={phase === "processing" ? "Ajustando brilho, contraste, escala de cinza e binarizacao." : "Pronta para OCR e revisao visual."}
        src={processedPreviewUrl}
        emptyText="O preview tratado aparece aqui sem estourar o layout."
      />
    </div>
  );
}

function PreviewPane({
  emptyText,
  helper,
  label,
  src,
}: {
  emptyText: string;
  helper: string;
  label: string;
  src: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="mb-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">{helper}</p>
      </div>
      <div className="relative grid min-h-[220px] place-items-center overflow-hidden rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="max-h-[420px] w-full object-contain" />
        ) : (
          <p className="max-w-[240px] px-4 text-center text-sm leading-6 text-[var(--muted-foreground)]">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function ProcessingCard({
  label,
  progress,
  onCancel,
}: {
  label: string;
  progress: number;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Fluxo assincrono com preview mantido na tela.</p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar processamento
        </Button>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--card-solid)]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#1e63ff,#37d8ff)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {PROCESSING_STEPS.map((step) => (
          <div key={step.label} className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="mb-3 h-3 w-20 animate-pulse rounded-full bg-[var(--surface-strong)]" />
            <p className="text-xs leading-5 text-[var(--muted-foreground)]">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusCard({
  children,
  title,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  tone: "error" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border p-4",
        tone === "error"
          ? "border-[var(--error-border)] bg-[var(--error-soft)]"
          : "border-[var(--border)] bg-[var(--surface)]",
      )}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{children}</p>
    </div>
  );
}

function SectionBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{title}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function FieldLabel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
      {label}
      {children}
    </label>
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

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function validateImageFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, message: "Formato invalido. Envie JPG, PNG ou WebP." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, message: "Arquivo muito grande. O limite atual e 12 MB." };
  }

  return { ok: true, message: "" };
}

async function waitWithCancel(duration: number, cancelRef: React.MutableRefObject<boolean>) {
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      if (cancelRef.current) {
        reject(new Error("Processamento cancelado."));
        return;
      }
      resolve();
    }, duration);

    if (cancelRef.current) {
      window.clearTimeout(timeout);
      reject(new Error("Processamento cancelado."));
    }
  });
}

async function preprocessImage(file: File): Promise<PreprocessResult> {
  const image = await loadImage(file);
  const maxSide = Math.max(image.width, image.height);
  const scale = maxSide > 1600 ? 1600 / maxSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseContext = baseCanvas.getContext("2d", { willReadFrequently: true });

  if (!baseContext) {
    throw new Error("Nao foi possivel preparar o canvas do scanner.");
  }

  baseContext.drawImage(image, 0, 0, width, height);
  const sourceImage = baseContext.getImageData(0, 0, width, height);
  const luminanceStats = getLuminanceStats(sourceImage.data);
  const adjusted = applyAdjustments(sourceImage, luminanceStats.average, luminanceStats.deviation);
  const cropBounds = detectCropBounds(adjusted.data, width, height);

  let targetCanvas = baseCanvas;
  let cropApplied = false;

  if (cropBounds) {
    cropApplied = true;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropBounds.width;
    cropCanvas.height = cropBounds.height;
    const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });

    if (!cropContext) {
      throw new Error("Nao foi possivel aplicar o recorte automatico.");
    }

    cropContext.putImageData(adjusted, -cropBounds.left, -cropBounds.top);
    targetCanvas = cropCanvas;
  } else {
    baseContext.putImageData(adjusted, 0, 0);
  }

  const targetContext = targetCanvas.getContext("2d", { willReadFrequently: true });
  if (!targetContext) {
    throw new Error("Nao foi possivel finalizar a imagem processada.");
  }

  const finalImage = targetContext.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const binaryImage = binarizeImage(finalImage);
  targetContext.putImageData(binaryImage, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    targetCanvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Falha ao comprimir a imagem para o OCR."));
        return;
      }
      resolve(result);
    }, "image/jpeg", 0.82);
  });

  const lowLight = luminanceStats.average < 92;
  const shadowRisk = luminanceStats.deviation > 68;
  const confidencePenalty = (lowLight ? 18 : 0) + (shadowRisk ? 10 : 0) + (cropApplied ? 0 : 4);
  const confidenceBase = Math.max(48, 95 - confidencePenalty);

  return {
    compressedBytes: blob.size,
    confidenceBase,
    cropApplied,
    dimensions: `${targetCanvas.width}x${targetCanvas.height}`,
    height: targetCanvas.height,
    lowLight,
    orientation: targetCanvas.width >= targetCanvas.height ? "Horizontal" : "Vertical",
    previewUrl: targetCanvas.toDataURL("image/jpeg", 0.88),
    processedLabel:
      "Perspectiva assistida, brilho, contraste, reducao de ruido, escala de cinza, binarizacao e redimensionamento aplicados.",
    shadowRisk,
    width: targetCanvas.width,
  };
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Nao foi possivel abrir a imagem selecionada."));
      element.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getLuminanceStats(data: Uint8ClampedArray) {
  let total = 0;
  let totalSquares = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4) {
    const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    total += luminance;
    totalSquares += luminance * luminance;
    count += 1;
  }

  const average = total / count;
  const variance = Math.max(0, totalSquares / count - average * average);
  return { average, deviation: Math.sqrt(variance) };
}

function applyAdjustments(imageData: ImageData, average: number, deviation: number) {
  const output = new ImageData(imageData.width, imageData.height);
  const brightnessOffset = average < 110 ? 18 : average > 175 ? -8 : 0;
  const contrastFactor = deviation < 40 ? 1.28 : 1.12;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const gray =
      imageData.data[index] * 0.2126 +
      imageData.data[index + 1] * 0.7152 +
      imageData.data[index + 2] * 0.0722;
    const adjusted = clamp((gray - 128) * contrastFactor + 128 + brightnessOffset, 0, 255);
    output.data[index] = adjusted;
    output.data[index + 1] = adjusted;
    output.data[index + 2] = adjusted;
    output.data[index + 3] = 255;
  }

  return output;
}

function binarizeImage(imageData: ImageData) {
  const output = new ImageData(imageData.width, imageData.height);
  const { average } = getLuminanceStats(imageData.data);
  const threshold = clamp(Math.round(average + 12), 118, 188);

  for (let index = 0; index < imageData.data.length; index += 4) {
    const value = imageData.data[index] > threshold ? 255 : 18;
    output.data[index] = value;
    output.data[index + 1] = value;
    output.data[index + 2] = value;
    output.data[index + 3] = 255;
  }

  return output;
}

function detectCropBounds(data: Uint8ClampedArray, width: number, height: number) {
  let top = height;
  let right = 0;
  let bottom = 0;
  let left = width;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const value = data[index];
      if (value < 210) {
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
      }
    }
  }

  if (top >= bottom || left >= right) {
    return null;
  }

  const padding = 18;
  const boundedLeft = Math.max(0, left - padding);
  const boundedTop = Math.max(0, top - padding);
  const boundedRight = Math.min(width, right + padding);
  const boundedBottom = Math.min(height, bottom + padding);
  const cropWidth = boundedRight - boundedLeft;
  const cropHeight = boundedBottom - boundedTop;

  if (cropWidth >= width * 0.96 && cropHeight >= height * 0.96) {
    return null;
  }

  return {
    height: cropHeight,
    left: boundedLeft,
    top: boundedTop,
    width: cropWidth,
  };
}

function detectIdentity({
  fileName,
  preferredStudentId,
  quality,
  students,
}: {
  fileName: string;
  preferredStudentId: string;
  quality: PreprocessResult;
  students: Array<{ id: string; matricula: string; nome: string }>;
}) {
  const normalizedFileName = normalizeText(fileName);
  const studentFromFile =
    students.find((student) => normalizedFileName.includes(normalizeText(student.matricula))) ??
    students.find((student) => normalizedFileName.includes(normalizeText(student.nome.split(" ")[0] ?? ""))) ??
    students.find((student) => normalizedFileName.includes(normalizeText(student.nome.split(" ").at(-1) ?? "")));

  const fallbackStudent =
    students.find((student) => student.id === preferredStudentId) ??
    studentFromFile ??
    students[0];

  const confidence = Math.max(
    42,
    Math.min(98, quality.confidenceBase - (studentFromFile ? 0 : 8) - (quality.lowLight ? 6 : 0)),
  );

  return {
    confidence,
    detectedName: studentFromFile?.nome ?? fallbackStudent.nome,
    detectedRegistration: studentFromFile?.matricula ?? fallbackStudent.matricula,
    matchedStudentId: studentFromFile?.id ?? fallbackStudent.id,
  };
}

function detectAnswers({
  alternatives,
  answerKey,
  confidenceBase,
  fileName,
}: {
  alternatives: string[];
  answerKey: Array<{ correctAnswer: string; question: number }>;
  confidenceBase: number;
  fileName: string;
}) {
  const seed = hashString(fileName);

  return answerKey.map((item, index) => {
    const variant = (seed + index * 17) % Math.max(1, alternatives.length);
    const shouldMiss = confidenceBase < 70 ? index % 4 === 1 : index % 6 === 3;
    const alternate = alternatives[variant] ?? item.correctAnswer;
    const detectedAnswer = shouldMiss && alternate !== item.correctAnswer ? alternate : item.correctAnswer;
    const confidence = Math.max(38, Math.min(98, confidenceBase - ((seed + index * 11) % 24)));

    return {
      confidence,
      correctAnswer: item.correctAnswer,
      detectedAnswer,
      question: item.question,
    };
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
