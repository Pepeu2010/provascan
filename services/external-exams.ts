import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { ExternalCorrectionInput, ExternalTemplateInput } from "@/lib/universal-exam-validation";
import type { ExternalCorrectionRecord, ExternalExamTemplate } from "@/types/universal-exams";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function ensure(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "Erro ao acessar modelos de correção.");
}

export async function listExternalExamTemplates(ownerId: string): Promise<ExternalExamTemplate[]> {
  const { data, error } = await db()
    .from("external_exam_templates")
    .select("id,name,structure,answer_key,created_at,updated_at")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  ensure(error);
  return (data ?? []).map((row) => ({
    answerKey: Array.isArray(row.answer_key) ? row.answer_key.map(String) : [],
    createdAt: String(row.created_at),
    id: String(row.id),
    name: String(row.name),
    structure: row.structure as ExternalExamTemplate["structure"],
    updatedAt: String(row.updated_at),
  }));
}

export async function createExternalExamTemplate(ownerId: string, input: ExternalTemplateInput) {
  const id = crypto.randomUUID();
  const { error } = await db().from("external_exam_templates").insert({
    answer_key: input.answerKey,
    id,
    name: input.name,
    owner_id: ownerId,
    structure: input.structure,
  });
  ensure(error);
  return id;
}

export async function getExternalExamTemplate(ownerId: string, templateId: string): Promise<ExternalExamTemplate | null> {
  const { data, error } = await db()
    .from("external_exam_templates")
    .select("id,name,structure,answer_key,created_at,updated_at")
    .eq("owner_id", ownerId)
    .eq("id", templateId)
    .maybeSingle();
  ensure(error);
  if (!data) return null;
  return {
    answerKey: Array.isArray(data.answer_key) ? data.answer_key.map(String) : [],
    createdAt: String(data.created_at),
    id: String(data.id),
    name: String(data.name),
    structure: data.structure as ExternalExamTemplate["structure"],
    updatedAt: String(data.updated_at),
  };
}

export async function listExternalCorrections(ownerId: string): Promise<ExternalCorrectionRecord[]> {
  const { data, error } = await db()
    .from("external_corrections")
    .select("id,template_id,student_name,source_label,structure_snapshot,answer_key_snapshot,answers,summary,corrected_at")
    .eq("owner_id", ownerId)
    .order("corrected_at", { ascending: false })
    .limit(200);
  ensure(error);
  return (data ?? []).map((row) => ({
    answerKey: Array.isArray(row.answer_key_snapshot) ? row.answer_key_snapshot.map(String) : [],
    answers: Array.isArray(row.answers) ? row.answers as ExternalCorrectionRecord["answers"] : [],
    correctedAt: String(row.corrected_at),
    id: String(row.id),
    sourceLabel: String(row.source_label),
    studentName: String(row.student_name),
    structure: row.structure_snapshot as ExternalCorrectionRecord["structure"],
    summary: row.summary as ExternalCorrectionRecord["summary"],
    templateId: row.template_id ? String(row.template_id) : null,
  }));
}

export async function saveExternalCorrections(
  ownerId: string,
  entries: Array<{
    input: ExternalCorrectionInput;
    summary: { blank: number; correct: number; incorrect: number; multipleMarks: number; review: number; score: number };
  }>,
) {
  const rows = entries.map(({ input, summary }) => ({
    answers: input.answers,
    id: crypto.randomUUID(),
    owner_id: ownerId,
    answer_key_snapshot: input.answerKey,
    source_label: input.sourceLabel,
    student_name: input.studentName,
    structure_snapshot: input.structure,
    summary,
    template_id: input.templateId,
  }));
  const { error } = await db().from("external_corrections").insert(rows);
  ensure(error);
  return rows.map((row) => row.id);
}
