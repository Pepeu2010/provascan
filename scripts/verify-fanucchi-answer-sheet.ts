import assert from "node:assert/strict";
import { calculateFanucchiAnswerSheetLayout, FANUCCHI_ALTERNATIVES, FANUCCHI_ANSWER_SHEET_VERSION } from "../services/fanucchi-answer-sheet";
import { createFanucchiAnswerSheetCard } from "../lib/fanucchi-answer-sheet-document";

for (const count of [10, 20, 25, 30, 35, 40, 45, 60, 90]) {
  const layout = calculateFanucchiAnswerSheetLayout(count);
  assert.equal(layout.version, FANUCCHI_ANSWER_SHEET_VERSION);
  assert.deepEqual(layout.questions.map((question) => question.number), Array.from({ length: count }, (_, index) => index + 1));
  assert.ok(layout.questions.every((question) => question.bubbles.map((bubble) => bubble.alternative).join("") === FANUCCHI_ALTERNATIVES.join("")));
  for (const question of layout.questions) {
    for (let index = 1; index < question.bubbles.length; index += 1) {
      assert.ok(question.bubbles[index].cx > question.bubbles[index - 1].cx, `Questão ${question.number} tem bolhas sobrepostas.`);
    }
  }
}

const humanas = createFanucchiAnswerSheetCard({ area: "HUMANAS", questionCount: 45 });
const exatas = createFanucchiAnswerSheetCard({ area: "EXATAS", questionCount: 45 });
assert.match(humanas, /HUMANAS/);
assert.match(exatas, /EXATAS/);
assert.match(humanas, /Cole aqui seu adesivo/);
assert.equal((humanas.match(/fanucchi-card__fiducial/g) ?? []).length, 4);
console.log("Fanucchi answer-sheet geometry verified.");
