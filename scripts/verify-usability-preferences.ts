import assert from "node:assert/strict";
import { DEFAULT_USABILITY_PREFERENCES, parseUsabilityPreferences, serializeUsabilityPreferences } from "../lib/usability-preferences";

assert.deepEqual(parseUsabilityPreferences(null), DEFAULT_USABILITY_PREFERENCES);
const serialized = serializeUsabilityPreferences({ easyMode: true, tutorialSeen: true });
assert.deepEqual(parseUsabilityPreferences(serialized), { easyMode: true, tutorialSeen: true });
assert.deepEqual(parseUsabilityPreferences('{"easyMode":"yes"}'), DEFAULT_USABILITY_PREFERENCES);

console.log("Usability preferences verification passed.");
