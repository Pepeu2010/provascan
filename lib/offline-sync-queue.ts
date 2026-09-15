export const OFFLINE_SYNC_QUEUE_KEY = "provascan:sync-queue:v1";

export type OfflineSyncJob = {
  attempts: number;
  body: string;
  createdAt: string;
  id: string;
  lastError: string;
  method: "POST";
  url: "/api/external-corrections";
};

type NewSyncJob = Pick<OfflineSyncJob, "body" | "id" | "method" | "url">;

export function enqueueSyncJob(queue: OfflineSyncJob[], job: NewSyncJob, at = new Date().toISOString()) {
  if (queue.some((item) => item.id === job.id)) return queue;
  return [...queue, { ...job, attempts: 0, createdAt: at, lastError: "" }];
}

export function markSyncJobFailed(queue: OfflineSyncJob[], id: string, error: string) {
  return queue.map((job) => job.id === id ? { ...job, attempts: job.attempts + 1, lastError: error.slice(0, 160) } : job);
}

export function removeSyncJob(queue: OfflineSyncJob[], id: string) {
  return queue.filter((job) => job.id !== id);
}

export function readOfflineSyncQueue(storage: Pick<Storage, "getItem">): OfflineSyncJob[] {
  try {
    const value = JSON.parse(storage.getItem(OFFLINE_SYNC_QUEUE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((job): job is OfflineSyncJob => Boolean(job && typeof job === "object" && (job as OfflineSyncJob).url === "/api/external-corrections" && (job as OfflineSyncJob).method === "POST" && typeof (job as OfflineSyncJob).body === "string"));
  } catch {
    return [];
  }
}

export function queueOfflineSyncJob(storage: Pick<Storage, "getItem" | "setItem">, job: NewSyncJob) {
  const queue = enqueueSyncJob(readOfflineSyncQueue(storage), job);
  storage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
  return queue;
}

export async function flushOfflineSyncQueue(storage: Pick<Storage, "getItem" | "setItem">, request: typeof fetch = fetch) {
  let queue = readOfflineSyncQueue(storage);
  for (const job of [...queue]) {
    try {
      const response = await request(job.url, { body: job.body, headers: { "Content-Type": "application/json" }, method: job.method });
      queue = response.ok ? removeSyncJob(queue, job.id) : markSyncJobFailed(queue, job.id, `HTTP ${response.status}`);
    } catch (error) {
      queue = markSyncJobFailed(queue, job.id, error instanceof Error ? error.message : "Falha de rede");
    }
    storage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
  return queue;
}
