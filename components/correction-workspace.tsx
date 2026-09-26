"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  X,
  FileImage,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  RefreshCw,
  Save,
  ScanSearch,
  UserRoundSearch,
  WandSparkles,
} from "lucide-react";
import { ExternalCorrectionWorkspace } from "@/components/external-correction-workspace";
import { useAppData } from "@/components/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeAnswerSheetCanvas,
  decodeOpaqueAnswerSheetToken,
  detectIdentityWithOcr,
} from "@/services/scan-pipeline";
import { rectifyMobilePhoto } from "@/services/mobile-photo-rectification";
import { ANSWER_SHEET_TEMPLATE, getBubbleBounds } from "@/services/answer-sheet-template";
import { FANUCCHI_ANSWER_SHEET_VERSION, getFanucchiBubbleBounds } from "@/services/fanucchi-answer-sheet";
import { assessScanQuality } from "@/services/scan-quality";
import { getStudentsForExam } from "@/lib/exam-audience";
import { compareClassrooms } from "@/lib/education-labels";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 12 * 1024 * 1024;
const MIN_CONFIDENCE_REVIEW = 75;
const PROCESSING_STEPS = [
  { label: "Preparando a foto...", progress: 16 },
  { label: "Conferindo o cartão...", progress: 34 },
  { label: "Lendo as respostas...", progress: 54 },
  { label: "Organizando as respostas...", progress: 78 },
  { label: "Quase pronto...", progress: 100 },
] as const;

type ScanPhase = "idle" | "processing" | "review" | "error";
type ReviewFilter = "all" | "divergences" | "review" | "blank";
type ScanAnswer = {
  confidence: number;
  correctAnswer: string;
  evidenceRect?: { height: number; width: number; x: number; y: number };
  /** Defined only for manual entry; false means the teacher has not decided. */
  explicitlyReviewed?: boolean;
  markedAnswers: string[];
  question: number;
  status?: "BLANK" | "LOW_CONFIDENCE" | "MARKED" | "MULTIPLE";
};

type ScanReview = {
  answers: ScanAnswer[];
  confidence: number;
  detectedName: string;
  identificationMethod: "qr" | "ocr" | "manual";
  matchedStudentId: string;
  notes: string[];
  pageType: string;
  processingLabel: string;
  qrStatus: "ignored" | "success" | "invalid" | "not-found" | "unreadable";
  processedPreviewUrl: string;
  evidencePreviewUrl: string;
  evidenceWidth: number;
  evidenceHeight: number;
  qualitySummary: {
    brightness: string;
    cropApplied: boolean;
    dimensions: string;
    lowLight: boolean;
    orientation: string;
    perspectiveCorrected: boolean;
    blurRisk: boolean;
    shadowRisk: boolean;
  };
  templateId: string;
};

type PreprocessResult = {
  compressedBytes: number;
  confidenceBase: number;
  cropApplied: boolean;
  dimensions: string;
  height: number;
  lowLight: boolean;
  blurRisk: boolean;
  orientation: string;
  perspectiveCorrected: boolean;
  processedCanvas: HTMLCanvasElement;
  previewUrl: string;
  evidencePreviewUrl: string;
  processedLabel: string;
  shadowRisk: boolean;
  width: number;
};

export function CorrectionWorkspace({ compact = false }: { compact?: boolean }) {
  const [correctionMode, setCorrectionMode] = useState<"chooser" | "provascan" | "external">("chooser");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("modo") !== "externa") return;
    const timeout = window.setTimeout(() => setCorrectionMode("external"), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  if (correctionMode === "external") {
    return <ExternalCorrectionWorkspace onBack={() => setCorrectionMode("chooser")} />;
  }

  if (correctionMode === "provascan") {
    return <ProvaScanCorrectionWorkspace compact={compact} onBack={() => setCorrectionMode("chooser")} />;
  }

  return (
    <div className="grid max-w-4xl gap-5">
      <Card className="border-[var(--border-strong)] p-5 sm:p-6">
        <Badge tone="accent">Correção</Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Qual prova você quer corrigir?</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Escolha o caminho que corresponde ao documento que você já tem em mãos.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button type="button" className="group min-h-48 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transform-none" onClick={() => setCorrectionMode("provascan")}><span className="grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><ScanSearch className="size-5" /></span><strong className="mt-8 block text-xl text-[var(--foreground)]">Prova do ProvaScan</strong><span className="mt-2 block text-sm leading-6 text-[var(--muted-foreground)]">Use o gabarito, o QR e a geometria já cadastrados no sistema.</span></button>
          <button type="button" className="group min-h-48 rounded-[24px] border border-[var(--accent)] bg-[var(--accent-soft)] p-5 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] motion-reduce:transform-none" onClick={() => setCorrectionMode("external")}><span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)] text-white"><FileImage className="size-5" /></span><strong className="mt-8 block text-xl text-[var(--foreground)]">Prova externa</strong><span className="mt-2 block text-sm leading-6 text-[var(--muted-foreground)]">Detecte e confirme uma prova feita no Word, escola, apostila ou outro sistema.</span></button>
        </div>
      </Card>
    </div>
  );
}

function ProvaScanCorrectionWorkspace({ compact = false, onBack }: { compact?: boolean; onBack: () => void }) {
  const { data, saveCorrection, syncStatus } = useAppData();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const batchInputRef = useRef<HTMLInputElement | null>(null);
  const cancelProcessingRef = useRef(false);

  const [examId, setExamId] = useState(data.exams[0]?.id ?? "");
  const [classId, setClassId] = useState("");
  const [preferredStudentId, setPreferredStudentId] = useState(data.students[0]?.id ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparando fluxo...");
  const [errorMessage, setErrorMessage] = useState("");
  const [screenMessage, setScreenMessage] = useState("");
  const [review, setReview] = useState<ScanReview | null>(null);
  const [notes, setNotes] = useState("Revisão manual obrigatória antes da confirmação final.");
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [recorrectionReason, setRecorrectionReason] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchSaved, setBatchSaved] = useState(0);
  const [batchSkipped, setBatchSkipped] = useState(0);
  const [savedCurrent, setSavedCurrent] = useState(false);
  const [reviewAudit, setReviewAudit] = useState<Array<{ question: number; before: string[]; after: string[] }>>([]);

  const exam = data.exams.find((item) => item.id === examId) ?? data.exams[0];
  const answerKey = useMemo(
    () => data.answerKeys.filter((item) => item.provaId === exam?.id).sort((a, b) => a.questao - b.questao),
    [data.answerKeys, exam?.id],
  );
  const studentsForExam = useMemo(() => {
    if (!exam) {
      return data.students;
    }
    const scoped = getStudentsForExam(exam, data.students, data.classes);
    return scoped.length ? scoped : data.students;
  }, [data.classes, data.students, exam]);

  const classesForExam = useMemo(
    () => data.classes.filter((classRoom) => studentsForExam.some((student) => student.turma === classRoom.id)).slice().sort(compareClassrooms),
    [data.classes, studentsForExam],
  );
  const activeClassId = classesForExam.some((classRoom) => classRoom.id === classId)
    ? classId
    : classesForExam[0]?.id ?? "";
  const studentsForSelectedClass = useMemo(() => {
    const filtered = studentsForExam.filter((student) => student.turma === activeClassId);
    return filtered.length ? filtered : studentsForExam;
  }, [activeClassId, studentsForExam]);

  const activePreferredStudentId =
    studentsForSelectedClass.find((item) => item.id === preferredStudentId)?.id ?? studentsForSelectedClass[0]?.id ?? "";

  const summary = useMemo(() => {
    if (!review) {
      return { acertos: 0, erros: 0, percentual: 0, revisao: 0, claras: 0, emBranco: 0, multiplas: 0 };
    }

    const acertos = review.answers.filter((item) => getAnswerState(item) === "acerto").length;
    const erros = review.answers.filter((item) => getAnswerState(item) === "erro").length;
    const revisao = review.answers.filter(needsAnswerReview).length;
    const claras = review.answers.filter((item) => !needsAnswerReview(item) && item.markedAnswers.length === 1).length;
    const emBranco = review.answers.filter((item) => item.markedAnswers.length === 0).length;
    const multiplas = review.answers.filter((item) => item.markedAnswers.length > 1).length;
    const percentual = review.answers.length ? Math.round((acertos / review.answers.length) * 100) : 0;
    return { acertos, erros, percentual, revisao, claras, emBranco, multiplas };
  }, [review]);
  const visibleAnswers = useMemo(() => {
    if (!review || reviewFilter === "all") return review?.answers ?? [];
    return review.answers.filter((item) => {
      if (reviewFilter === "divergences") return getAnswerState(item) === "erro";
      if (reviewFilter === "blank") return item.markedAnswers.length === 0;
      return needsAnswerReview(item);
    });
  }, [review, reviewFilter]);
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
    studentsForSelectedClass.find((item) => item.id === preferredStudentId) ??
    studentsForSelectedClass[0];
  const identityMismatch = Boolean(
    review?.identificationMethod !== "manual" &&
      review?.detectedName &&
      selectedReviewStudent?.nome &&
      normalizePersonName(review.detectedName) !== normalizePersonName(selectedReviewStudent.nome),
  );
  const identityNeedsConfirmation = Boolean(review && (identityMismatch || review.identificationMethod === "manual"));
  const earlierCorrections = data.corrections.filter((item) =>
    item.correction.provaId === exam.id && item.correction.alunoId === review?.matchedStudentId,
  );

  const processSelectedImage = async (fileToProcess = selectedFile) => {
    if (!fileToProcess) {
      setErrorMessage("Selecione uma imagem ou PDF antes de iniciar a leitura.");
      setPhase("error");
      return;
    }

    if (!answerKey.length) {
      setErrorMessage("Esta prova ainda não possui gabarito salvo.");
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
      await waitWithCancel(120, cancelProcessingRef);
      const preprocessing = await preprocessImage(fileToProcess, {
        preserveCardGeometry: isProvaScanCardTemplate(exam.templateVersion),
      });
      if (cancelProcessingRef.current) {
        throw new Error("Processamento cancelado.");
      }


      setProgressLabel(PROCESSING_STEPS[1].label);
      setProgress(PROCESSING_STEPS[1].progress);
      await waitWithCancel(90, cancelProcessingRef);

      if (cancelProcessingRef.current) {
        throw new Error("Processamento cancelado.");
      }

      setProgressLabel(PROCESSING_STEPS[2].label);
      setProgress(PROCESSING_STEPS[2].progress);
      await waitWithCancel(90, cancelProcessingRef);

      const isFanucchi = exam.templateVersion === FANUCCHI_ANSWER_SHEET_VERSION;
      const token = isFanucchi ? await decodeOpaqueAnswerSheetToken(preprocessing.processedCanvas) : null;
      let identity: { confidence: number; detectedName: string; invalidMessage: string; method: "ocr" | "manual" | "qr"; matchedStudentId: string };
      if (isFanucchi && token) {
        const response = await fetch("/api/answer-sheet-labels/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        const payload = await response.json() as { assignment?: { examId: string; studentId: string; templateVersion: string }; error?: string };
        const student = response.ok && payload.assignment?.examId === exam.id && payload.assignment.templateVersion === FANUCCHI_ANSWER_SHEET_VERSION
          ? studentsForExam.find((item) => item.id === payload.assignment?.studentId)
          : undefined;
        identity = student
          ? { confidence: 100, detectedName: student.nome, invalidMessage: "", matchedStudentId: student.id, method: "qr" }
          : { confidence: 0, detectedName: "", invalidMessage: "O adesivo não corresponde à prova ou à turma selecionada. Confirme a prova e escolha o aluno manualmente.", matchedStudentId: "", method: "manual" };
      } else if (isFanucchi) {
        identity = { confidence: 0, detectedName: "", invalidMessage: "O adesivo não foi lido. As respostas podem ser conferidas, mas escolha e confirme o aluno antes de salvar.", matchedStudentId: "", method: "manual" };
      } else {
        const ocrIdentity = await detectIdentityWithOcr({ canvas: preprocessing.processedCanvas, preferredStudentId: activePreferredStudentId, students: studentsForExam });
        identity = { confidence: ocrIdentity?.status === "matched" ? ocrIdentity.confidence : 0, detectedName: ocrIdentity?.status === "matched" ? ocrIdentity.detectedName : "", invalidMessage: ocrIdentity?.status === "matched" ? "" : "Não foi possível identificar o aluno pela foto. Escolha e confirme o nome antes de salvar.", method: ocrIdentity?.status === "matched" ? "ocr" : "manual", matchedStudentId: ocrIdentity?.status === "matched" ? ocrIdentity.studentId : "" };
      }

      setProgressLabel(PROCESSING_STEPS[3].label);
      setProgress(PROCESSING_STEPS[3].progress);
      await waitWithCancel(90, cancelProcessingRef);

      const omrAnalysis = await analyzeAnswerSheetCanvas({
        alternatives: exam.alternativas,
        answerKeyLength: answerKey.length,
        canvas: preprocessing.processedCanvas,
        expectedTemplateId: exam.templateVersion,
      });

      if (omrAnalysis.totalQuestions !== answerKey.length) {
        throw new Error(
          `O cartão identificado possui ${omrAnalysis.totalQuestions} questões, mas o gabarito selecionado possui ${answerKey.length}. Selecione ou cadastre o gabarito com a mesma quantidade antes de corrigir.`,
        );
      }

      const detectedByQuestion = new Map(omrAnalysis.answers.map((item) => [item.question, item]));
      if (detectedByQuestion.size !== answerKey.length || omrAnalysis.answers.length !== answerKey.length ||
        answerKey.some((key) => !detectedByQuestion.has(key.questao))) {
        throw new Error("A leitura não encontrou todas as linhas do cartão. Confira a folha inteira e envie outra foto.");
      }
      // A page-wide contrast measure can confuse printed black text with a
      // shadow. Keep the warning, but do not send every clear bubble to review.
      const photoNeedsReview = preprocessing.lowLight;
      const detectedAnswers: ScanAnswer[] = answerKey.map((key) => {
        const item = detectedByQuestion.get(key.questao)!;
        const uncertain = photoNeedsReview || item.status !== "MARKED" || item.confidence < MIN_CONFIDENCE_REVIEW || item.markedAnswers.length !== 1;
        return {
          confidence: item.confidence,
          correctAnswer: key.respostaCorreta,
          evidenceRect: item.evidenceRect,
          explicitlyReviewed: uncertain ? false : undefined,
          markedAnswers: item.markedAnswers,
          question: key.questao,
          status: item.status,
        };
      });

      setProgressLabel(PROCESSING_STEPS[3].label);
      setProgress(PROCESSING_STEPS[4].progress);
      setProgressLabel(PROCESSING_STEPS[4].label);
      await waitWithCancel(120, cancelProcessingRef);

      const needsManualReview =
        preprocessing.shadowRisk ||
        identity.confidence < MIN_CONFIDENCE_REVIEW ||
        detectedAnswers.some(needsAnswerReview);

      setReview({
        answers: detectedAnswers,
        confidence: Math.max(42, Math.min(99, Math.round((identity.confidence + preprocessing.confidenceBase) / 2))),
        detectedName: identity.detectedName,
        identificationMethod: identity.method,
        matchedStudentId: identity.matchedStudentId,
        notes: [
          `Template identificado: ${omrAnalysis.templateId} (${omrAnalysis.modelDisplayName}).`,
          `Tipo da página: ${omrAnalysis.pageType}.`,
          `Questões detectadas no layout: ${omrAnalysis.totalQuestions}.`,
          omrAnalysis.usedExpectedTemplate
            ? "O scanner priorizou o template esperado da prova antes da leitura do cabeçalho."
            : `Classificação do modelo pelo cabeçalho com confiança ${omrAnalysis.modelConfidence}%.`,
          omrAnalysis.headerText ? `Cabeçalho OCR: ${omrAnalysis.headerText.slice(0, 140)}` : "Cabeçalho OCR indisponível nesta imagem.",
          identity.invalidMessage || (identity.method === "qr" ? "Adesivo QR validado no servidor; leitura das bolhas independente do adesivo." : "Identificação por OCR e confirmação manual."),
          preprocessing.processedLabel,
          preprocessing.perspectiveCorrected
            ? "Perspectiva de foto de celular corrigida antes da leitura."
            : "Não foi possível confirmar as bordas da folha; a imagem foi lida sem correção de perspectiva.",
          preprocessing.cropApplied ? "Recorte automático da área útil aplicado." : "O recorte automático manteve a imagem inteira.",
          preprocessing.lowLight ? "Imagem com pouca luz: revise nome e respostas manualmente." : "Iluminação dentro do esperado.",
          preprocessing.shadowRisk ? "Sombra detectada: marcações foram sinalizadas para revisão." : "Sem sombra relevante no cartão.",
          needsManualReview ? "Fluxo marcado para revisão manual obrigatória." : "Leitura automática consistente, mas ainda exige conferência final.",
          omrAnalysis.totalQuestions !== answerKey.length
            ? `Atenção: a prova atual tem ${answerKey.length} respostas cadastradas, mas o template identificado possui ${omrAnalysis.totalQuestions} questões.`
            : "",
        ].filter(Boolean),
        pageType: omrAnalysis.pageType,
        processingLabel:
          needsManualReview ? "Revisão manual obrigatória" : "Leitura pronta para conferência",
        processedPreviewUrl: preprocessing.previewUrl,
        evidencePreviewUrl: preprocessing.evidencePreviewUrl,
        evidenceWidth: preprocessing.width,
        evidenceHeight: preprocessing.height,
        qrStatus: "ignored",
        qualitySummary: {
          brightness: preprocessing.lowLight ? "Baixa" : "Boa",
          blurRisk: preprocessing.blurRisk,
          cropApplied: preprocessing.cropApplied,
          dimensions: preprocessing.dimensions,
          lowLight: preprocessing.lowLight,
          orientation: preprocessing.orientation,
          perspectiveCorrected: preprocessing.perspectiveCorrected,
          shadowRisk: preprocessing.shadowRisk,
        },
        templateId: omrAnalysis.templateId,
      });
      setNotes("Revisão manual obrigatória antes da confirmação final.");
      setPhase("review");
      setPreviewZoom(1);
      setPreviewRotation(0);
      setReviewFilter(detectedAnswers.some(needsAnswerReview) ? "review" : "all");
      setReviewAudit([]);
      setIdentityConfirmed(false);
      setEditingQuestion(null);
      setScreenMessage("");
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
      answers: answerKey.map((item) => ({
        confidence: 30,
        correctAnswer: item.respostaCorreta,
        explicitlyReviewed: false,
        markedAnswers: [],
        question: item.questao,
      })),
      confidence: 30,
      detectedName: "",
      identificationMethod: "manual",
      matchedStudentId: "",
      notes: [
        "Fluxo aberto em modo manual.",
        "A imagem foi mantida para conferência visual.",
        "Preencha ou ajuste todas as respostas antes de confirmar.",
      ],
      pageType: "MANUAL",
      processingLabel: "Preenchimento manual",
      processedPreviewUrl: rawPreviewUrl,
      evidencePreviewUrl: rawPreviewUrl,
      evidenceWidth: 0,
      evidenceHeight: 0,
      qrStatus: "not-found",
      qualitySummary: {
        brightness: "Não avaliada",
        blurRisk: false,
        cropApplied: false,
        dimensions: selectedFile ? `${selectedFile.name}` : "Sem imagem",
        lowLight: false,
        orientation: "Manual",
        perspectiveCorrected: false,
        shadowRisk: false,
      },
      templateId: "MANUAL",
    });
    setPhase("review");
    setEditingQuestion(null);
    setPreviewZoom(1);
    setPreviewRotation(0);
    setReviewFilter("all");
    setReviewAudit([]);
    setIdentityConfirmed(false);
    setRecorrectionReason("");
    setScreenMessage("Modo manual habilitado. A imagem continua disponível para consulta.");
  };

  const handleFileSelected = async (file: File | null, preserveQueue = false, confirmedReplace = false) => {
    if (phase === "processing") {
      setScreenMessage("Aguarde a leitura atual terminar antes de escolher outro cartão.");
      return;
    }
    if (file && review && !savedCurrent && !confirmedReplace && !window.confirm("Trocar a foto descarta as respostas conferidas nesta leitura. Deseja continuar?")) return;
    if (!preserveQueue) {
      setPendingFiles([]);
      setBatchTotal(0);
      setBatchSaved(0);
      setBatchSkipped(0);
    }
    setScreenMessage("");
    setReview(null);
    setReviewAudit([]);
    setEditingQuestion(null);
    setErrorMessage("");
    setProgress(0);
    setProgressLabel("Preparando fluxo...");
    setPhase("idle");
    setSavedCurrent(false);

    if (!file) {
      return;
    }

    const validation = await validateImageFile(file);
    if (!validation.ok) {
      setSelectedFile(null);
      if (rawPreviewUrl) URL.revokeObjectURL(rawPreviewUrl);
      setRawPreviewUrl("");
      setErrorMessage(validation.message);
      setPhase("error");
      return;
    }

    if (rawPreviewUrl) {
      URL.revokeObjectURL(rawPreviewUrl);
    }

    setSelectedFile(file);
    setRawPreviewUrl(URL.createObjectURL(file));
    setScreenMessage("Leitura iniciada automaticamente. Você só revisa o que o sistema sinalizar.");
    void processSelectedImage(file);
  };

  const handleBatchSelected = (files: File[]) => {
    if (phase === "processing") return;
    if (!files.length) return;
    if (review && !savedCurrent && !window.confirm("Iniciar outro lote descarta a conferência atual. Deseja continuar?")) return;
    setBatchTotal(files.length);
    setBatchSaved(0);
    setBatchSkipped(0);
    setPendingFiles(files.slice(1));
    void handleFileSelected(files[0], true, true);
  };

  const advanceBatch = () => {
    if (phase === "processing") return;
    if (!pendingFiles.length) return;
    if (!savedCurrent && !window.confirm("Este cartão ainda não foi salvo. Colocá-lo como pendente de nova foto e continuar?")) return;
    if (!savedCurrent) setBatchSkipped((current) => current + 1);
    const [next, ...rest] = pendingFiles;
    setPendingFiles(rest);
    void handleFileSelected(next, true, true);
  };

  const updateMarkedAnswer = (question: number, markedAnswers: string[]) => {
    const previousAnswer = review?.answers.find((item) => item.question === question);
    if (previousAnswer && (previousAnswer.explicitlyReviewed !== true || previousAnswer.markedAnswers.join("|") !== markedAnswers.join("|"))) {
      setReviewAudit((current) => [...current, { question, before: previousAnswer.markedAnswers, after: markedAnswers }]);
    }
    setReview((previous) =>
      previous
        ? {
            ...previous,
            answers: previous.answers.map((item) =>
              item.question === question ? { ...item, explicitlyReviewed: true, markedAnswers } : item,
            ),
          }
        : previous,
    );
    setEditingQuestion(null);
  };

  const closeCurrentCard = () => {
    if (phase === "processing") {
      cancelProcessingRef.current = true;
    }

    if (review && typeof window !== "undefined" && !window.confirm("Fechar esta correção e escolher outra foto? As alterações desta leitura serão descartadas.")) {
      return;
    }

    if (rawPreviewUrl) {
      URL.revokeObjectURL(rawPreviewUrl);
    }
    setSelectedFile(null);
    setRawPreviewUrl("");
    setReview(null);
    setReviewAudit([]);
    setEditingQuestion(null);
    setPreviewZoom(1);
    setPreviewRotation(0);
    setReviewFilter("all");
    setIdentityConfirmed(false);
    setRecorrectionReason("");
    setProgress(0);
    setProgressLabel("Preparando fluxo...");
    setScreenMessage("Leitura fechada. Você pode enviar ou tirar outra foto.");
    setErrorMessage("");
    setPhase("idle");
  };

  const confirmCorrection = async () => {
    if (savedCurrent) {
      setScreenMessage("Este cartão já foi salvo. Escolha o próximo cartão ou uma nova foto.");
      return;
    }
    if (!review) {
      setErrorMessage("Nenhuma leitura para salvar. Inicie um OCR ou abra o modo manual.");
      setPhase("error");
      return;
    }

    if (!review.matchedStudentId) {
      setErrorMessage("Selecione manualmente o aluno antes de confirmar a correção.");
      return;
    }

    if (identityNeedsConfirmation && !identityConfirmed) {
      setErrorMessage("Confirme que o aluno selecionado é realmente o dono deste cartão antes de salvar.");
      return;
    }

    const undecided = review.answers.filter(needsAnswerReview);
    if (undecided.length) {
      setReviewFilter("review");
      setErrorMessage(`Confira ${undecided.length} ${undecided.length === 1 ? "questão sinalizada" : "questões sinalizadas"} antes de salvar. Abra a questão e confirme a marcação ou o espaço em branco.`);
      return;
    }
    if (earlierCorrections.length && recorrectionReason.trim().length < 10) {
      setErrorMessage("Já existe uma correção para este aluno nesta prova. Para recalcular sem apagar o histórico, explique o motivo em pelo menos 10 caracteres.");
      return;
    }

    const result = await saveCorrection({
      answers: review.answers.map((item) => ({ marcacoes: item.markedAnswers, questao: item.question })),
      confidence: review.confidence,
      examId: exam.id,
      imageLabel: selectedFile?.name ?? "captura-manual.jpg",
      method: review.identificationMethod,
      reviewAudit,
      recorrectionReason: earlierCorrections.length ? recorrectionReason.trim() : undefined,
      notes: [
        notes,
        `Confianca geral do OCR: ${review.confidence}%`,
        `Nome detectado: ${review.detectedName}`,
        ...review.notes,
      ],
      studentId: review.matchedStudentId,
    });

    if (result.ok) {
      setSavedCurrent(true);
      if (batchTotal) setBatchSaved((current) => current + 1);
      setScreenMessage(result.message);
      setErrorMessage("");
      return;
    }

    setErrorMessage(result.message);
  };

  return (
    <div
      className={cn(
        "correction-workspace grid gap-5",
        review ? "2xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.65fr)]" : "max-w-4xl",
      )}
    >
      <div className="2xl:col-span-2">
        <button type="button" className="text-sm font-semibold text-[var(--accent)] hover:underline" onClick={onBack}>← Voltar aos tipos de correção</button>
      </div>
      <Card className="correction-workspace__control border-[var(--border-strong)] p-5 sm:p-6">
        <div className={cn("grid gap-5", compact ? "" : "")}>
          <div className="correction-workspace__intro">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <ScanSearch className="size-4 text-[var(--accent)]" />
              Escolha a prova e a turma
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Depois, envie uma foto do cartão-resposta para começar a correção.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel label="Prova para corrigir">
              <Select
                value={examId}
                onChange={(event) => {
                  const nextExamId = event.target.value;
                  const nextExam = data.exams.find((item) => item.id === nextExamId);
                  const nextStudents = nextExam
                    ? getStudentsForExam(nextExam, data.students, data.classes)
                    : data.students;
                  setExamId(nextExamId);
                  setClassId((nextStudents[0] ?? data.students[0])?.turma ?? "");
                  setPreferredStudentId((nextStudents[0] ?? data.students[0])?.id ?? "");
                  setReview(null);
                  setScreenMessage("");
                }}
              >
                {data.exams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo}
                  </option>
                ))}
              </Select>
            </FieldLabel>

            <FieldLabel label="Filtrar por turma">
              <Select
                value={activeClassId}
                onChange={(event) => {
                  const nextClassId = event.target.value;
                  const nextStudent = studentsForExam.find((student) => student.turma === nextClassId);
                  setClassId(nextClassId);
                  setPreferredStudentId(nextStudent?.id ?? "");
                }}
              >
                {classesForExam.map((classRoom) => (
                  <option key={classRoom.id} value={classRoom.id}>
                    {classRoom.nome}
                  </option>
                ))}
              </Select>
            </FieldLabel>

          </div>

          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
              Aluno de apoio, se o cartão não for identificado
            </summary>
            <div className="mt-3">
              <Select
                value={activePreferredStudentId}
                aria-label="Aluno de apoio"
                onChange={(event) => setPreferredStudentId(event.target.value)}
              >
                {studentsForSelectedClass.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </div>
          </details>

          <div className={cn("rounded-[24px] border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] p-4 sm:p-5", phase === "review" && "hidden")}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Envie o cartão-resposta</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{answerKey.length} questões serão lidas automaticamente</p>
              </div>
              <Badge tone="accent">Automático</Badge>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="min-h-12 flex-1" disabled={phase === "processing"} onClick={() => cameraInputRef.current?.click()}>
                <Camera className="size-4" />
                Tirar foto
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="min-h-12 flex-1"
                disabled={phase === "processing"}
                onClick={() => uploadInputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                Enviar arquivo
              </Button>
            </div>
            <button type="button" disabled={phase === "processing"} className="mt-3 min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50" onClick={() => batchInputRef.current?.click()}>
              Enviar várias fotos para uma fila
            </button>
            <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
              Fotografe a folha inteira, com os quatro cantos visíveis e sem sombra forte. A perspectiva, rotação e contraste são ajustados automaticamente.
            </p>
            {selectedFile ? <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--card-solid)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]" aria-live="polite">Foto recebida. Vamos conferir as respostas.</p> : null}
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void handleFileSelected(event.target.files?.[0] ?? null, batchTotal > 0);
              event.target.value = "";
            }}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(event) => {
              void handleFileSelected(event.target.files?.[0] ?? null, batchTotal > 0);
              event.target.value = "";
            }}
          />
          <input
            ref={batchInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              handleBatchSelected(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />

          {batchTotal > 0 ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4" aria-label="Fila de cartões" aria-live="polite">
              <p className="text-sm font-semibold text-[var(--foreground)]">Fila de cartões</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{batchSaved} salvos · {batchSkipped} precisam de nova foto · {pendingFiles.length} aguardando</p>
              <p className="mt-2 truncate text-xs text-[var(--muted-foreground)]">Atual: {selectedFile?.name ?? "nenhum arquivo"}</p>
              {pendingFiles.length ? <Button className="mt-3 min-h-11 w-full" variant="secondary" disabled={phase === "processing"} onClick={advanceBatch}>{savedCurrent ? "Abrir próximo cartão" : "Deixar pendente e abrir próximo"}</Button> : <p className="mt-2 text-xs text-[var(--muted-foreground)]">{savedCurrent ? "Fila concluída." : "Confira ou refaça a foto atual para concluir."}</p>}
            </section>
          ) : null}

          {selectedFile ? (
            <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" open={phase === "processing"}>
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Ver foto enviada</summary>
              <div className="mt-4">
                <ImagePreviewCard
                  rawPreviewUrl={rawPreviewUrl}
                  zoom={previewZoom}
                  onZoomChange={setPreviewZoom}
                  rotation={previewRotation}
                  onRotationChange={setPreviewRotation}
                />
              </div>
            </details>
          ) : null}

          <div className={cn("grid gap-3", phase === "review" && "hidden")} aria-label="Ações de leitura">
            <Button
              size="lg"
              className="min-h-12 w-full"
              onClick={() => {
                void processSelectedImage();
              }}
              disabled={!selectedFile || phase === "processing"}
            >
              {phase === "processing" ? <LoaderCircle className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              {phase === "processing" ? "Lendo cartão..." : selectedFile ? "Ler novamente" : "Aguardando imagem"}
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
          <StatusCard tone="error" title="Não foi possível ler o cartão">
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

      {review ? (
        <Card className="correction-workspace__review p-5 sm:p-6">
          <div className="grid gap-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-[var(--foreground)]">Confira o cartão do aluno</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
                  {review.pageType === "MANUAL"
                    ? "Escolha o aluno e preencha cada resposta antes de salvar. Você também pode marcar uma questão em branco."
                    : "Veja as respostas marcadas. Se estiverem certas, basta salvar. Para mudar uma delas, toque em “Corrigir resposta”."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar esta correção e escolher outra foto"
                title="Fechar e trocar foto"
                className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center self-end rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-solid)] xl:self-start"
                onClick={closeCurrentCard}
                data-testid="close-current-card"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <section
              aria-label="Resumo da correção"
              aria-live="polite"
              className="overflow-hidden rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent-soft)_48%,var(--surface))]"
            >
              <div className="grid gap-5 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">{summary.revisao ? "Leitura aguardando conferência" : "Resultado da correção"}</h4>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {summary.revisao ? "A nota ficará disponível depois da conferência." : `${summary.acertos} ${summary.acertos === 1 ? "resposta correta" : "respostas corretas"} de ${review.answers.length}`}
                    </p>
                  </div>
                  <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] text-[var(--foreground)]">
                    {summary.revisao ? "—" : `${summary.percentual}%`}
                  </p>
                </div>

                <div>
                  {!summary.revisao ? <div
                    aria-label={`Aproveitamento: ${summary.percentual}%`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={summary.percentual}
                    aria-valuetext={`${summary.percentual}% de aproveitamento, ${summary.acertos} de ${review.answers.length} respostas corretas`}
                    className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,var(--border))]"
                    role="progressbar"
                  >
                    <span
                      className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-200 motion-reduce:transition-none"
                      style={{ width: `${summary.percentual}%` }}
                    />
                  </div> : null}
                  <p className="mt-2 text-xs font-medium text-[var(--muted-foreground)]">
                    {review.pageType === "MANUAL" && summary.revisao > 0
                      ? `Preencha ${summary.revisao} ${summary.revisao === 1 ? "questão pendente" : "questões pendentes"} antes de salvar.`
                      : summary.revisao > 0
                      ? `Confirme ${summary.revisao} ${summary.revisao === 1 ? "resposta" : "respostas"} sinalizadas antes de ver a nota e salvar.`
                      : summary.erros > 0
                        ? `Confira ${summary.erros} ${summary.erros === 1 ? "divergência" : "divergências"} com o cartão.`
                        : "Todas as respostas foram lidas com boa confiança."}
                  </p>
                </div>
              </div>

              <dl className="grid border-t border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] sm:grid-cols-3">
                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-xs font-medium text-[var(--muted-foreground)]">Acertos</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{summary.revisao ? "—" : summary.acertos}</dd>
                </div>
                <div className="border-t border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] px-5 py-4 sm:border-t-0 sm:border-l sm:px-6">
                  <dt className="text-xs font-medium text-[var(--muted-foreground)]">Divergências</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{summary.revisao ? "—" : summary.erros}</dd>
                </div>
                <div className="border-t border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] px-5 py-4 sm:border-t-0 sm:border-l sm:px-6">
                  <dt className="text-xs font-medium text-[var(--muted-foreground)]">Para revisar</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">{summary.revisao}</dd>
                </div>
              </dl>
              <p className="border-t border-[var(--border)] px-5 py-3 text-sm text-[var(--muted-foreground)] sm:px-6" aria-live="polite">
                {summary.claras} claras · {summary.emBranco} em branco · {summary.multiplas} com mais de uma marca · {summary.revisao} para conferir
              </p>
            </section>

            {review.pageType !== "MANUAL" ? (
              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5" aria-label="Qualidade da foto">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-[var(--foreground)]">Qualidade da foto</h4>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">A imagem original continua disponível acima para comparar com a leitura.</p>
                  </div>
                  <Button variant="secondary" size="default" onClick={() => cameraInputRef.current?.click()}><Camera className="size-4" />Tirar outra foto</Button>
                </div>
                <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <li className="rounded-xl border border-[var(--border)] px-3 py-2 text-[var(--foreground)]">{review.qualitySummary.lowLight ? "Pouca luz: confira todas as respostas" : "Luz suficiente para análise"}</li>
                  <li className="rounded-xl border border-[var(--border)] px-3 py-2 text-[var(--foreground)]">{review.qualitySummary.shadowRisk ? "Sombra ou contraste irregular: confira as respostas" : "Sem sombra forte detectada"}</li>
                  <li className="rounded-xl border border-[var(--border)] px-3 py-2 text-[var(--foreground)]">{review.qualitySummary.perspectiveCorrected ? "Folha alinhada automaticamente" : "Bordas não confirmadas: confira o enquadramento"}</li>
                  <li className="rounded-xl border border-[var(--border)] px-3 py-2 text-[var(--foreground)]">Imagem analisada: {review.qualitySummary.dimensions}</li>
                </ul>
              </section>
            ) : null}

            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <FieldLabel label="Aluno que fez esta prova">
                <Select
                  value={review.matchedStudentId}
                  onChange={(event) =>
                    {
                      setIdentityConfirmed(false);
                      setRecorrectionReason("");
                      setReview((previous) =>
                        previous ? { ...previous, matchedStudentId: event.target.value } : previous,
                      );
                    }
                  }
                >
                  <option value="">Selecione o aluno</option>
                  {studentsForSelectedClass.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </Select>
              </FieldLabel>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">Se este não for o aluno, escolha o nome correto antes de salvar.</p>
              {earlierCorrections.length ? (
                <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4" role="status">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Este aluno já tem {earlierCorrections.length} {earlierCorrections.length === 1 ? "correção" : "correções"} nesta prova</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">Salvar novamente cria uma recorreção e preserva o resultado anterior. Explique por que está corrigindo outra vez.</p>
                  <FieldLabel label="Motivo da recorreção">
                    <Textarea value={recorrectionReason} onChange={(event) => setRecorrectionReason(event.target.value)} className="mt-2 min-h-24" placeholder="Ex.: nova foto após marcação ambígua" />
                  </FieldLabel>
                </div>
              ) : null}
              {identityNeedsConfirmation ? (
                <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--error-border)] bg-[var(--error-soft)] p-3" role="alert">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Confira o aluno antes de salvar</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                    {identityMismatch ? <>O cartão parece ser de <strong>{review.detectedName}</strong>, mas o aluno selecionado é <strong>{selectedReviewStudent.nome}</strong>.</> : "O sistema não confirmou o nome pela imagem. Confira a prova e selecione o aluno correto."}
                  </p>
                  <label className="mt-3 flex items-start gap-3 text-sm font-semibold text-[var(--foreground)]">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-[var(--accent)]"
                      checked={identityConfirmed}
                      onChange={(event) => setIdentityConfirmed(event.target.checked)}
                    />
                    Confirmo que selecionei o aluno correto para este cartão.
                  </label>
                </div>
              ) : null}
            </div>

            <div>
              <h4 className="text-xl font-semibold text-[var(--foreground)]">Respostas marcadas pelo aluno</h4>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {review.pageType === "MANUAL"
                  ? `${review.answers.length} questões para preencher. Escolha uma alternativa ou marque Em branco em cada uma.`
                  : `${review.answers.length} questões detectadas. Cada cartão mostra uma questão e a resposta marcada.`}
              </p>
            </div>

            <AnswerSheetReviewOverlay
              alternatives={exam.alternativas}
              answers={review.answers}
              src={review.evidencePreviewUrl}
              templateId={review.templateId}
            />

            <div className="flex flex-wrap items-center gap-2" aria-label="Filtros de questões">
              <span className="mr-1 text-sm font-semibold text-[var(--muted-foreground)]">Mostrar:</span>
              {([
                ["all", "Todas"],
                ["divergences", "Divergências"],
                ["review", "Para revisar"],
                ["blank", "Em branco"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                    reviewFilter === value
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]",
                  )}
                  aria-pressed={reviewFilter === value}
                  onClick={() => setReviewFilter(value)}
                >
                  {label}
                </button>
              ))}
              <span className="text-sm text-[var(--muted-foreground)]">{visibleAnswers.length} exibidas</span>
            </div>

            <AnswerReviewGrid
              alternatives={exam.alternativas}
              answers={visibleAnswers}
              evidencePreviewUrl={review.evidencePreviewUrl}
              evidenceWidth={review.evidenceWidth}
              evidenceHeight={review.evidenceHeight}
              editingQuestion={editingQuestion}
              onEdit={setEditingQuestion}
              onMarkBlank={(question) => updateMarkedAnswer(question, [])}
              onMarkMultiple={(question, alternatives) => updateMarkedAnswer(question, alternatives)}
              onSelect={(question, alternative) => updateMarkedAnswer(question, [alternative])}
            />

            <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Adicionar uma observação (opcional)</summary>
              <FieldLabel label="Observação" >
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="mt-3 min-h-28"
                  placeholder="Escreva algo que deseja lembrar sobre esta correção."
                />
              </FieldLabel>
            </details>

            <div className="relative mt-2 rounded-[24px] border border-[var(--border-strong)] bg-[var(--card-solid)] p-3 shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
              <Button size="lg" className="min-h-14 w-full" data-testid="save-correction" loading={syncStatus === "saving"} onClick={confirmCorrection}>
                <Save className="size-4" />
                Salvar resultado
              </Button>
              <button
                type="button"
                className="mt-3 w-full rounded-[var(--radius-sm)] px-4 py-3 text-sm font-semibold text-[var(--muted-foreground)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--foreground)] focus-visible:text-[var(--foreground)]"
                onClick={() => {
                  if (selectedFile) {
                    void processSelectedImage();
                    return;
                  }
                  setErrorMessage("Envie ou fotografe uma imagem antes de tentar novamente.");
                }}
              >
                A leitura não ficou boa? Ler a foto novamente
              </button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export function EmptyReviewState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,var(--card-solid),var(--surface))] px-6 py-10 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <FileImage className="size-7" />
      </div>
      <h3 className="mt-5 text-2xl font-semibold text-[var(--foreground)]">Pronto para corrigir</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
        Envie um cartão à esquerda. O sistema lê as respostas e abre somente o que precisa da sua conferência.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
        {[
          "1. Enviar",
          "2. Revisar exceções",
          "3. Salvar",
        ].map((item) => (
          <div key={item} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[var(--foreground)]">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerReviewGrid({
  alternatives,
  answers,
  evidencePreviewUrl,
  evidenceWidth,
  evidenceHeight,
  editingQuestion,
  onEdit,
  onMarkBlank,
  onMarkMultiple,
  onSelect,
}: {
  alternatives: string[];
  answers: ScanAnswer[];
  evidencePreviewUrl: string;
  evidenceWidth: number;
  evidenceHeight: number;
  editingQuestion: number | null;
  onEdit: (question: number | null) => void;
  onMarkBlank: (question: number) => void;
  onMarkMultiple: (question: number, alternatives: string[]) => void;
  onSelect: (question: number, alternative: string) => void;
}) {
  const [multipleQuestion, setMultipleQuestion] = useState<number | null>(null);
  const [multipleChoices, setMultipleChoices] = useState<string[]>([]);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {answers.map((answer) => {
        const status = getAnswerState(answer);
        const isCorrect = status === "acerto";
        const isEditing = editingQuestion === answer.question;

        return (
          <section
            key={answer.question}
            className={cn(
              "rounded-[var(--radius-md)] border bg-[var(--card-solid)] p-4",
              isCorrect ? "border-[var(--success-border)]" : "border-[var(--border)]",
            )}
            aria-label={`Questão ${answer.question}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-lg font-semibold text-[var(--foreground)]">Questão {answer.question}</h5>
              <div className="flex flex-wrap justify-end gap-2">
                <Badge tone={isCorrect ? "success" : status === "erro" ? "error" : "warning"}>{getAnswerLabel(answer)}</Badge>
                {answer.explicitlyReviewed !== undefined ? <Badge tone="neutral">{answer.explicitlyReviewed ? "Conferida manualmente" : "Preenchimento manual"}</Badge> : (
                  <Badge tone={answer.confidence >= 85 ? "success" : answer.confidence >= MIN_CONFIDENCE_REVIEW ? "warning" : "error"}>
                    {answer.confidence >= 85 ? "Leitura forte" : answer.confidence >= MIN_CONFIDENCE_REVIEW ? "Revisar" : "Baixa confiança"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] p-3">
                <p className="text-sm text-[var(--muted-foreground)]">Aluno marcou</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{getDetectedAnswerLabel(answer)}</p>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] p-3">
                <p className="text-sm text-[var(--muted-foreground)]">Gabarito</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{answer.correctAnswer}</p>
              </div>
            </div>

            {isEditing ? (
              <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
                <QuestionEvidenceCrop answer={answer} src={evidencePreviewUrl} imageWidth={evidenceWidth} imageHeight={evidenceHeight} />
                <p className="text-sm font-semibold text-[var(--foreground)]">Qual resposta está marcada no cartão?</p>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {alternatives.map((alternative) => (
                    <button
                      key={`${answer.question}-${alternative}`}
                      type="button"
                      className={cn(
                        "min-h-12 rounded-[var(--radius-sm)] border bg-[var(--card-solid)] text-base font-bold text-[var(--foreground)] transition-colors",
                        (multipleQuestion === answer.question ? multipleChoices.includes(alternative) : answer.markedAnswers.includes(alternative))
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                          : "border-[var(--border-strong)] hover:border-[var(--accent)]",
                      )}
                      aria-pressed={multipleQuestion === answer.question ? multipleChoices.includes(alternative) : answer.markedAnswers.includes(alternative)}
                      onClick={() => {
                        if (multipleQuestion === answer.question) {
                          setMultipleChoices((current) => current.includes(alternative) ? current.filter((item) => item !== alternative) : [...current, alternative]);
                        } else { onSelect(answer.question, alternative); setMultipleQuestion(null); }
                      }}
                    >
                      {alternative}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button size="default" variant="secondary" className="min-h-12" onClick={() => { onMarkBlank(answer.question); setMultipleQuestion(null); }}>Em branco</Button>
                  <Button size="default" variant="secondary" className="min-h-12" onClick={() => { setMultipleQuestion(answer.question); setMultipleChoices(answer.markedAnswers); }}>Mais de uma</Button>
                </div>
                {multipleQuestion === answer.question ? (
                  <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card-solid)] p-3">
                    <p className="text-sm text-[var(--foreground)]">Selecione as alternativas realmente marcadas na foto.</p>
                    <Button className="mt-3 min-h-11 w-full" disabled={multipleChoices.length < 2} onClick={() => { onMarkMultiple(answer.question, alternatives.filter((item) => multipleChoices.includes(item))); setMultipleQuestion(null); }}>Confirmar {multipleChoices.length} marcações</Button>
                  </div>
                ) : null}
                <button type="button" className="mt-3 text-sm font-semibold text-[var(--accent)] underline underline-offset-4" onClick={() => { onEdit(null); setMultipleQuestion(null); }}>Cancelar</button>
              </div>
            ) : (
              <Button size="default" variant="secondary" className="mt-4 min-h-12 w-full" onClick={() => onEdit(answer.question)}>
                Corrigir resposta
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}

function QuestionEvidenceCrop({ answer, src, imageWidth, imageHeight }: {
  answer: ScanAnswer;
  src: string;
  imageWidth: number;
  imageHeight: number;
}) {
  const rect = answer.evidenceRect;
  if (!src || !rect || rect.width <= 0 || rect.height <= 0 || imageWidth <= 0 || imageHeight <= 0) return null;
  return (
    <figure className="mb-4">
      <figcaption className="mb-2 text-xs font-semibold text-[var(--foreground)]">Questão {answer.question} na foto, antes do filtro preto e branco</figcaption>
      <div className="relative overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-white" style={{ aspectRatio: `${rect.width * imageWidth} / ${rect.height * imageHeight}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Recorte da questão ${answer.question} para conferência visual`} className="absolute max-w-none" style={{ width: `${100 / rect.width}%`, height: `${100 / rect.height}%`, left: `${-rect.x / rect.width * 100}%`, top: `${-rect.y / rect.height * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">{answer.status === "MULTIPLE" ? "Há mais de uma marcação possível." : answer.status === "BLANK" ? "Nenhuma alternativa foi identificada com segurança." : answer.status === "LOW_CONFIDENCE" ? "As alternativas estão difíceis de distinguir." : "Confira a marcação antes de confirmar."}</p>
    </figure>
  );
}

function AnswerSheetReviewOverlay({ alternatives, answers, src, templateId }: { alternatives: string[]; answers: ScanAnswer[]; src: string; templateId: string }) {
  const isFanucchi = templateId === FANUCCHI_ANSWER_SHEET_VERSION;
  if (!templateId.toUpperCase().startsWith("PS-CARD") && !isFanucchi) return null;
  const uncertain = answers.filter(needsAnswerReview);
  if (!uncertain.length) return null;
  return <details className="rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-soft)] p-4">
    <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">Ver pontos que exigem conferência sobre a folha</summary>
    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">A marcação aparece somente nas questões incertas. Ela não altera o cartão nem substitui sua conferência.</p>
    <div className="relative mt-4 aspect-[794/1123] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-white">
      <NextImage src={src} alt="Folha processada com questões que exigem conferência" fill unoptimized sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
      {uncertain.flatMap((answer) => {
        const bounds = isFanucchi ? getFanucchiBubbleBounds({ canvasHeight: 297, canvasWidth: 210, questionCount: answers.length, questionIndex: answer.question - 1 }) : getBubbleBounds({ alternatives, canvasHeight: ANSWER_SHEET_TEMPLATE.page.height, canvasWidth: ANSWER_SHEET_TEMPLATE.page.width, questionCount: answers.length, questionIndex: answer.question - 1 });
        const marked = bounds.filter((bound) => answer.markedAnswers.includes(bound.alternative));
        const targets = marked.length ? marked : [bounds[0]].filter(Boolean);
        const width = isFanucchi ? 210 : ANSWER_SHEET_TEMPLATE.page.width;
        const height = isFanucchi ? 297 : ANSWER_SHEET_TEMPLATE.page.height;
        return targets.map((bound, index) => <span key={`${answer.question}-${bound.alternative}-${index}`} title={`Questão ${answer.question}: conferir`} className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-[var(--warning)] text-[10px] font-black text-black shadow" style={{ left: `${(bound.cx / width) * 100}%`, top: `${(bound.cy / height) * 100}%` }}>{answer.question}</span>);
      })}
    </div>
  </details>;
}

function ImagePreviewCard({
  onRotationChange,
  onZoomChange,
  rawPreviewUrl,
  rotation,
  zoom,
}: {
  onRotationChange: (value: number) => void;
  onZoomChange: (value: number) => void;
  rawPreviewUrl: string;
  rotation: number;
  zoom: number;
}) {
  return (
    <div className="grid gap-3">
      <PreviewPane
        label="Foto enviada"
        helper="Confira se este é o cartão que deseja corrigir."
        src={rawPreviewUrl}
        emptyText="A foto aparece aqui depois de enviada."
        rotation={rotation}
        zoom={zoom}
      />
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Aumentar foto</p>
            <p className="text-xs leading-5 text-[var(--muted-foreground)]">Use apenas se quiser conferir uma marcação no cartão.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              onClick={() => onRotationChange((rotation + 90) % 360)}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Girar
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              onClick={() => { onRotationChange(0); onZoomChange(1); }}
            >
              Restaurar
            </button>
            <span className="text-sm font-semibold text-[var(--foreground)]">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
        <input
          aria-label="Controle de zoom da imagem"
          className="mt-3 w-full accent-[var(--accent)]"
          max="2.5"
          min="1"
          step="0.1"
          type="range"
          value={zoom}
          onChange={(event) => onZoomChange(Number(event.target.value))}
        />
      </div>
    </div>
  );
}

function PreviewPane({
  emptyText,
  helper,
  label,
  src,
  rotation,
  zoom,
}: {
  emptyText: string;
  helper: string;
  label: string;
  src: string;
  rotation: number;
  zoom: number;
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
          <img
            src={src}
            alt={label}
            className="max-h-[420px] w-full origin-center object-contain transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
          />
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
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Isso pode levar alguns segundos.</p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar processamento
        </Button>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--card-solid)]" role="progressbar" aria-label="Progresso da leitura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))] transition-all"
          style={{ width: `${progress}%` }}
        />
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
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
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

async function validateImageFile(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, message: "Formato inválido. Envie JPG, PNG, WebP ou PDF." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, message: "Arquivo muito grande. O limite atual e 12 MB." };
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isPng =
    signature[0] === 0x89 &&
    signature[1] === 0x50 &&
    signature[2] === 0x4e &&
    signature[3] === 0x47 &&
    signature[4] === 0x0d &&
    signature[5] === 0x0a &&
    signature[6] === 0x1a &&
    signature[7] === 0x0a;
  const isWebp =
    signature[0] === 0x52 &&
    signature[1] === 0x49 &&
    signature[2] === 0x46 &&
    signature[3] === 0x46 &&
    signature[8] === 0x57 &&
    signature[9] === 0x45 &&
    signature[10] === 0x42 &&
    signature[11] === 0x50;
  const isPdf =
    signature[0] === 0x25 &&
    signature[1] === 0x50 &&
    signature[2] === 0x44 &&
    signature[3] === 0x46;

  if (!isJpeg && !isPng && !isWebp && !isPdf) {
    return {
      ok: false,
      message: "Arquivo rejeitado. A assinatura binária não corresponde a um JPG, PNG, WebP ou PDF válido.",
    };
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

async function preprocessImage(
  file: File,
  { preserveCardGeometry = false }: { preserveCardGeometry?: boolean } = {},
): Promise<PreprocessResult> {
  const image = await loadRenderableSource(file);
  const maxSide = Math.max(image.width, image.height);
  // A 45-question card needs enough pixels per bubble. 1600px was adequate
  // for a flat scan but loses too much detail in an oblique phone photo.
  const scale = maxSide > 2200 ? 2200 / maxSide : 1;
  const sourceWidth = Math.max(1, Math.round(image.width * scale));
  const sourceHeight = Math.max(1, Math.round(image.height * scale));
  const shouldRotate = sourceWidth > sourceHeight;
  const width = shouldRotate ? sourceHeight : sourceWidth;
  const height = shouldRotate ? sourceWidth : sourceHeight;

  const baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseContext = baseCanvas.getContext("2d", { willReadFrequently: true });

  if (!baseContext) {
    throw new Error("Não foi possível preparar o canvas do scanner.");
  }

  if (shouldRotate) {
    baseContext.translate(width / 2, height / 2);
    baseContext.rotate(Math.PI / 2);
    baseContext.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
    baseContext.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    baseContext.drawImage(image, 0, 0, width, height);
  }
  const rectification = rectifyMobilePhoto(
    baseCanvas,
    ANSWER_SHEET_TEMPLATE.page.width / ANSWER_SHEET_TEMPLATE.page.height,
    { refineBottomEdge: preserveCardGeometry },
  );
  const normalizedCanvas = rectification.canvas;
  const normalizedContext = normalizedCanvas.getContext("2d", { willReadFrequently: true });
  if (!normalizedContext) {
    throw new Error("Não foi possível normalizar a foto do cartão.");
  }
  const sourceImage = normalizedContext.getImageData(0, 0, normalizedCanvas.width, normalizedCanvas.height);
  const luminanceStats = getLuminanceStats(sourceImage.data);
  const adjusted = applyAdjustments(sourceImage, luminanceStats.average, luminanceStats.deviation, preserveCardGeometry);
  // PS-CARD uses fixed relative bubble coordinates. Cropping the page without
  // reprojecting those coordinates shifts every reading, so its full geometry
  // must remain intact. Generic answer sheets may still use automatic crop.
  const cropBounds = preserveCardGeometry
    ? null
    : detectCropBounds(adjusted.data, normalizedCanvas.width, normalizedCanvas.height);

  let targetCanvas = normalizedCanvas;
  let cropApplied = false;

  if (cropBounds) {
    cropApplied = true;
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropBounds.width;
    cropCanvas.height = cropBounds.height;
    const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });

    if (!cropContext) {
      throw new Error("Não foi possível aplicar o recorte automático.");
    }

    cropContext.putImageData(adjusted, -cropBounds.left, -cropBounds.top);
    targetCanvas = cropCanvas;
  } else {
    normalizedContext.putImageData(adjusted, 0, 0);
  }

  const targetContext = targetCanvas.getContext("2d", { willReadFrequently: true });
  if (!targetContext) {
    throw new Error("Não foi possível finalizar a imagem processada.");
  }

  const finalImage = targetContext.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const scanQuality = assessScanQuality(finalImage);
  if (scanQuality.requiresRecapture) {
    throw new Error(
      scanQuality.blurRisk
        ? "A foto está desfocada demais para ler as bolhas com segurança. Tire outra foto com a folha inteira e a câmera parada."
        : "A imagem está pequena demais para ler as bolhas com segurança. Aproxime a câmera sem cortar os quatro cantos da folha.",
    );
  }
  const evidencePreviewUrl = targetCanvas.toDataURL("image/jpeg", 0.9);
  const binaryImage = binarizeImage(finalImage, preserveCardGeometry);
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

  const lowLight = scanQuality.lowLight;
  const shadowRisk = scanQuality.shadowRisk;
  const confidencePenalty = (lowLight ? 18 : 0) + (shadowRisk ? 10 : 0) + (cropApplied ? 0 : 4);
  const confidenceBase = Math.max(48, 95 - confidencePenalty);
  const processedLabel = preserveCardGeometry
    ? rectification.applied
      ? "A folha fotografada foi retificada para o formato do cartão. Brilho, contraste e binarização adaptativa foram aplicados."
      : "A geometria completa do cartão foi preservada para manter as marcações alinhadas. Brilho, contraste e binarização adaptativa foram aplicados."
    : "Escala de cinza, contraste, binarização, redução de ruído e rotação automática, quando necessária, foram aplicados.";

  return {
    compressedBytes: blob.size,
    confidenceBase,
    cropApplied,
    dimensions: `${targetCanvas.width}x${targetCanvas.height}`,
    height: targetCanvas.height,
    blurRisk: scanQuality.blurRisk,
    lowLight,
    orientation: shouldRotate ? "Vertical corrigida" : targetCanvas.width >= targetCanvas.height ? "Horizontal" : "Vertical",
    perspectiveCorrected: rectification.applied,
    processedCanvas: targetCanvas,
    previewUrl: targetCanvas.toDataURL("image/jpeg", 0.88),
    evidencePreviewUrl,
    processedLabel,
    shadowRisk,
    width: targetCanvas.width,
  };
}

function isProvaScanCardTemplate(templateVersion?: string) {
  const normalized = (templateVersion ?? "").trim().toUpperCase();
  return normalized.startsWith("PS-CARD") || normalized === FANUCCHI_ANSWER_SHEET_VERSION;
}

async function loadRenderableSource(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return renderPdfPage(file);
  }

  return loadImage(file);
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Não foi possível abrir a imagem selecionada."));
      element.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function renderPdfPage(file: File) {
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdfDocument = await getDocument({ data: buffer }).promise;
  const page = await pdfDocument.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const maxPixels = 4_000_000;
  const scale = Math.min(2, Math.sqrt(maxPixels / Math.max(1, baseViewport.width * baseViewport.height)));
  if (scale < 0.2) {
    throw new Error("O PDF possui dimensões incompatíveis com o processamento seguro no navegador.");
  }
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Não foi possível renderizar a primeira página do PDF.");
  }

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  const image = new Image();
  image.src = canvas.toDataURL("image/png");
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível abrir a página renderizada do PDF."));
  });

  return image;
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

function applyAdjustments(imageData: ImageData, average: number, deviation: number, preserveBlueInk = false) {
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
    // Keep the blue chroma of filled bubbles for PS-CARD. The OCR pipeline
    // uses it to separate pen marks from the printed frame and headings.
    const blueChroma = preserveBlueInk
      ? Math.max(0, imageData.data[index + 2] - Math.max(imageData.data[index], imageData.data[index + 1]))
      : 0;
    output.data[index + 2] = clamp(adjusted + blueChroma * 1.4, 0, 255);
    output.data[index + 3] = 255;
  }

  return output;
}

function binarizeImage(imageData: ImageData, preserveBlueInk = false) {
  const output = new ImageData(imageData.width, imageData.height);
  // Cell-local thresholds keep a shaded part of a photographed page white
  // while preserving pencil/pen fills as dark marks. A single global cutoff
  // turns shadows into false answers.
  const cellSize = Math.max(28, Math.round(Math.min(imageData.width, imageData.height) / 34));
  for (let cellTop = 0; cellTop < imageData.height; cellTop += cellSize) {
    for (let cellLeft = 0; cellLeft < imageData.width; cellLeft += cellSize) {
      const cellRight = Math.min(imageData.width, cellLeft + cellSize);
      const cellBottom = Math.min(imageData.height, cellTop + cellSize);
      let total = 0;
      let count = 0;
      for (let y = cellTop; y < cellBottom; y += 2) {
        for (let x = cellLeft; x < cellRight; x += 2) {
          total += imageData.data[(y * imageData.width + x) * 4];
          count += 1;
        }
      }
      const threshold = clamp(Math.round(total / Math.max(count, 1) - 18), 92, 214);
      for (let y = cellTop; y < cellBottom; y += 1) {
        for (let x = cellLeft; x < cellRight; x += 1) {
          const index = (y * imageData.width + x) * 4;
          const value = imageData.data[index] > threshold ? 255 : 18;
          output.data[index] = value;
          output.data[index + 1] = value;
          const blueChroma = preserveBlueInk
            ? Math.max(0, imageData.data[index + 2] - Math.max(imageData.data[index], imageData.data[index + 1]))
            : 0;
          output.data[index + 2] = value === 255 ? 255 : clamp(value + blueChroma * 1.4, 0, 255);
          output.data[index + 3] = 255;
        }
      }
    }
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

function getDetectedAnswerLabel(answer: ScanAnswer) {
  if (answer.explicitlyReviewed === false) return "Não preenchida";
  if (!answer.markedAnswers.length) {
    return "Em branco";
  }

  if (answer.markedAnswers.length > 1) {
    return answer.markedAnswers.join(" / ");
  }

  return answer.markedAnswers[0];
}

function needsAnswerReview(answer: ScanAnswer) {
  if (answer.explicitlyReviewed === true) return false;
  if (answer.explicitlyReviewed === false) return true;
  return answer.status === "LOW_CONFIDENCE" || answer.status === "MULTIPLE" ||
    answer.confidence < MIN_CONFIDENCE_REVIEW || answer.markedAnswers.length !== 1;
}

function getAnswerState(answer: ScanAnswer) {
  if (!answer.markedAnswers.length) {
    return "em-branco";
  }

  if (answer.markedAnswers.length > 1) {
    return "multipla-marcacao";
  }

  return answer.markedAnswers[0] === answer.correctAnswer ? "acerto" : "erro";
}

function normalizePersonName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getAnswerLabel(answer: ScanAnswer) {
  if (answer.explicitlyReviewed === false) return "Pendente";
  const status = getAnswerState(answer);
  if (status === "acerto") return "Acerto";
  if (status === "erro") return "Erro";
  if (status === "em-branco") return "Em branco";
  return "Multipla";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
