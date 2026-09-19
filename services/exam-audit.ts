import "server-only";

import { createClient } from "@supabase/supabase-js";

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Banco de dados não configurado.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type ExamAuditEntry = { at: string; actorName: string; event: string; metadata: Record<string, unknown> };

export async function listExamAudit(examId: string): Promise<ExamAuditEntry[]> {
  const client = db();
  const { data, error } = await client.from("audit_log_internal").select("occurred_at,actor_id,event,metadata").eq("target_id", examId).order("occurred_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message || "Não foi possível carregar a auditoria.");
  const actorIds = [...new Set((data ?? []).map((entry) => String(entry.actor_id)))];
  const users = actorIds.length ? await client.from("app_users").select("legacy_id,full_name").in("legacy_id", actorIds) : { data: [], error: null };
  if (users.error) throw new Error(users.error.message || "Não foi possível carregar os responsáveis.");
  const names = new Map((users.data ?? []).map((user) => [String(user.legacy_id), String(user.full_name)]));
  return (data ?? []).map((entry) => ({ at: String(entry.occurred_at), actorName: names.get(String(entry.actor_id)) ?? "Sistema", event: String(entry.event), metadata: entry.metadata && typeof entry.metadata === "object" ? entry.metadata as Record<string, unknown> : {} }));
}
