import assert from "node:assert/strict";
import { enqueueSyncJob, markSyncJobFailed, removeSyncJob } from "../lib/offline-sync-queue";

let queue = enqueueSyncJob([], { body: "{\"corrections\":[]}", id: "batch-1", method: "POST", url: "/api/external-corrections" }, "2026-09-14T20:00:00.000Z");
queue = enqueueSyncJob(queue, { body: "duplicate", id: "batch-1", method: "POST", url: "/api/external-corrections" }, "2026-09-14T20:01:00.000Z");
assert.equal(queue.length, 1, "the same logical job must not be queued twice");
queue = markSyncJobFailed(queue, "batch-1", "offline");
assert.equal(queue[0].attempts, 1);
assert.equal(queue[0].lastError, "offline");
assert.deepEqual(removeSyncJob(queue, "batch-1"), []);

console.log("Offline sync queue verification passed.");
