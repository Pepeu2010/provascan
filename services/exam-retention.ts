import "server-only";

import { createClient } from "@supabase/supabase-js";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Archive only. Academic history, corrections, QR labels and files remain. */
export async function archiveExpiredExams(now = new Date()) {
  const configured = Number(process.env.EXAM_RETENTION_DAYS ?? 730);
  const retentionDays = Number.isFinite(configured) ? Math.max(30, Math.min(3650, Math.floor(configured))) : 730;
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString().slice(0, 10);
  const client = db();
  const { data, error } = await client.from("exams").update({ status: "arquivada", updated_at: now.toISOString() }).in("status", ["publicada", "aplicada"]).lt("exam_date", cutoff).select("id");
  if (error) throw new Error(error.message || "Não foi possível arquivar provas antigas.");
  return { archivedExamIds: (data ?? []).map((row) => String(row.id)), cutoff, retentionDays };
}
