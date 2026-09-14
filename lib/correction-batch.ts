export type CorrectionBatchStatus = "done" | "failed" | "pending" | "processing";

export type CorrectionBatchItem = {
  attempt: number;
  error: string;
  id: string;
  label: string;
  sheetCount: number;
  status: CorrectionBatchStatus;
};

export function createBatchQueue(labels: string[]): CorrectionBatchItem[] {
  return labels.map((label, index) => ({ attempt: 1, error: "", id: `${index + 1}:${label}`, label, sheetCount: 0, status: "pending" }));
}

export function startBatchItem(queue: CorrectionBatchItem[], id: string) {
  return update(queue, id, (item) => ({ ...item, error: "", status: "processing" }));
}

export function completeBatchItem(queue: CorrectionBatchItem[], id: string, sheetCount: number) {
  return update(queue, id, (item) => ({ ...item, error: "", sheetCount, status: "done" }));
}

export function failBatchItem(queue: CorrectionBatchItem[], id: string, error: string) {
  return update(queue, id, (item) => ({ ...item, error, status: "failed" }));
}

export function retryFailedBatchItems(queue: CorrectionBatchItem[]) {
  return queue.map((item) => item.status === "failed" ? { ...item, attempt: item.attempt + 1, error: "", status: "pending" as const } : item);
}

function update(queue: CorrectionBatchItem[], id: string, change: (item: CorrectionBatchItem) => CorrectionBatchItem) {
  return queue.map((item) => item.id === id ? change(item) : item);
}
