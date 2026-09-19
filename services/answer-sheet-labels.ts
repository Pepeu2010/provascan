import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getExamPrintRoster } from "@/services/exam-print-roster";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function opaqueToken() { return `PSA1.${randomBytes(32).toString("base64url")}`; }

export type AnswerSheetLabel = { studentId: string; studentName: string; className: string; token: string };

/** Issues a fresh label for each server-authorized student. Browser-provided
 * IDs are only a selection; the roster is resolved again on the server. */
export async function issueAnswerSheetLabels(input: { actorId: string; examId: string; institutionalView: boolean; studentIds: string[] }) {
  const roster = await getExamPrintRoster({ actorId: input.actorId, examId: input.examId, institutionalView: input.institutionalView });
  if (!roster) return null;
  if (roster.exam.printOptions?.answerSheetModel !== "fanucchi") throw new Error("Esta prova não utiliza o cartão-resposta Fanucchi.");
  const selected = roster.students.filter((student) => input.studentIds.includes(student.id));
  if (!selected.length) throw new Error("Selecione ao menos um aluno autorizado.");
  const client = db();
  const classRows = await client.from("students").select("id,class_id").in("id", selected.map((student) => student.id));
  if (classRows.error) throw new Error(classRows.error.message || "Não foi possível validar os alunos.");
  const classes = new Map((classRows.data ?? []).map((row) => [String(row.id), String(row.class_id ?? "")]));
  if (selected.some((student) => !classes.get(student.id))) throw new Error("Um dos alunos não possui turma ativa.");
  const now = new Date().toISOString();
  const labels: AnswerSheetLabel[] = [];
  for (const student of selected) {
    const token = opaqueToken();
    const { error: revokeError } = await client.from("answer_sheet_assignments").update({ revoked_at: now, revoke_reason: "Reimpressão do adesivo" }).eq("exam_id", input.examId).eq("student_id", student.id).is("revoked_at", null);
    if (revokeError) throw new Error(revokeError.message || "Não foi possível substituir o adesivo anterior.");
    const { error: insertError } = await client.from("answer_sheet_assignments").insert({ class_id: classes.get(student.id), exam_id: input.examId, issued_by: input.actorId, student_id: student.id, template_version: "FANUCCHI-OMR-V1", token_hash: hash(token) });
    if (insertError) throw new Error(insertError.message || "Não foi possível emitir o adesivo.");
    labels.push({ className: student.className, studentId: student.id, studentName: student.name, token });
  }
  return labels;
}

export async function resolveAnswerSheetToken(input: { actorId: string; institutionalView: boolean; token: string }) {
  if (!/^PSA1\.[A-Za-z0-9_-]{43}$/.test(input.token)) return null;
  const client = db();
  const { data, error } = await client.from("answer_sheet_assignments").select("exam_id,student_id,class_id,template_version").eq("token_hash", hash(input.token)).is("revoked_at", null).maybeSingle();
  if (error) throw new Error(error.message || "Não foi possível validar o adesivo.");
  if (!data) return null;
  const roster = await getExamPrintRoster({ actorId: input.actorId, examId: String(data.exam_id), institutionalView: input.institutionalView });
  if (!roster || !roster.students.some((student) => student.id === String(data.student_id))) return null;
  return { classId: String(data.class_id), examId: String(data.exam_id), studentId: String(data.student_id), templateVersion: String(data.template_version) };
}
