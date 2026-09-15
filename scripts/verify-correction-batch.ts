import assert from "node:assert/strict";
import { completeBatchItem, createBatchQueue, failBatchItem, retryFailedBatchItems, startBatchItem } from "../lib/correction-batch";

let queue = createBatchQueue(["a.jpg", "b.pdf", "c.png"]);
assert.deepEqual(queue.map((item) => item.status), ["pending", "pending", "pending"]);
queue = startBatchItem(queue, queue[0].id);
queue = completeBatchItem(queue, queue[0].id, 2);
queue = startBatchItem(queue, queue[1].id);
queue = failBatchItem(queue, queue[1].id, "PDF protegido");
assert.equal(queue[0].sheetCount, 2);
assert.equal(queue[1].error, "PDF protegido");

const retried = retryFailedBatchItems(queue);
assert.deepEqual(retried.map((item) => item.status), ["done", "pending", "pending"]);
assert.equal(retried[1].attempt, 2);
assert.equal(retried[1].error, "");

console.log("Correction batch verification passed.");
