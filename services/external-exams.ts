import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { ExternalCorrectionInput, ExternalTemplateInput } from "@/lib/universal-exam-validation";
import type { ExternalCorrectionRecord, ExternalExamTemplate } from "@/types/universal-exams";
import { DEFAULT_UNIVERSAL_GRADING_RULES } from "@/services/universal-grading-rules";

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
    .select("id,name,structure,answer_key,grading_rules,is_favorite,archived_at,last_used_at,created_at,updated_at")
    .eq("owner_id", ownerId)
    .is("archived_at", null)
    .order("is_favorite", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  ensure(error);
  return (data ?? []).map((row) => ({
    answerKey: Array.isArray(row.answer_key) ? row.answer_key.map(String) : [],
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    createdAt: String(row.created_at),
    gradingRules: row.grading_rules ?? DEFAULT_UNIVERSAL_GRADING_RULES,
    id: String(row.id),
    isFavorite: Boolean(row.is_favorite),
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
    name: String(row.name),
    structure: row.structure as ExternalExamTemplate["structure"],
    updatedAt: String(row.updated_at),
  }));
}

export async function createExternalExamTemplate(ownerId: string, input: ExternalTemplateInput) {
  const id = crypto.randomUUID();
  const { error } = await db().from("external_exam_templates").insert({
    answer_key: input.answerKey,
    grading_rules: input.gradingRules,
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
    .select("id,name,structure,answer_key,grading_rules,is_favorite,archived_at,last_used_at,created_at,updated_at")
    .eq("owner_id", ownerId)
    .eq("id", templateId)
    .maybeSingle();
  ensure(error);
  if (!data) return null;
  return {
    answerKey: Array.isArray(data.answer_key) ? data.answer_key.map(String) : [],
    archivedAt: data.archived_at ? String(data.archived_at) : null,
    createdAt: String(data.created_at),
    gradingRules: data.grading_rules ?? DEFAULT_UNIVERSAL_GRADING_RULES,
    id: String(data.id),
    isFavorite: Boolean(data.is_favorite),
    lastUsedAt: data.last_used_at ? String(data.last_used_at) : null,
    name: String(data.name),
    structure: data.structure as ExternalExamTemplate["structure"],
    updatedAt: String(data.updated_at),
  };
}

export async function updateExternalExamTemplate(ownerId: string, templateId: string, changes: { archived_at?: string; is_favorite?: boolean; last_used_at?: string; name?: string }) {
  const { data, error } = await db().from("external_exam_templates")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .eq("id", templateId)
    .select("id")
    .maybeSingle();
  ensure(error);
  return Boolean(data);
}

export async function listExternalCorrections(ownerId: string): Promise<ExternalCorrectionRecord[]> {
  const { data, error } = await db()
    .from("external_corrections")
    .select("id,template_id,student_name,source_label,structure_snapshot,answer_key_snapshot,grading_rules_snapshot,review_audit,answers,summary,corrected_at")
    .eq("owner_id", ownerId)
    .order("corrected_at", { ascending: false })
    .limit(200);
  ensure(error);
  return (data ?? []).map((row) => ({
    answerKey: Array.isArray(row.answer_key_snapshot) ? row.answer_key_snapshot.map(String) : [],
    answers: Array.isArray(row.answers) ? row.answers as ExternalCorrectionRecord["answers"] : [],
    correctedAt: String(row.corrected_at),
    gradingRules: row.grading_rules_snapshot ?? DEFAULT_UNIVERSAL_GRADING_RULES,
    id: String(row.id),
    reviewAudit: Array.isArray(row.review_audit) ? row.review_audit as ExternalCorrectionRecord["reviewAudit"] : [],
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
    grading_rules_snapshot: input.gradingRules,
    review_audit: input.reviewAudit,
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
