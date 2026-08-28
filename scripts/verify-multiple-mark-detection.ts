import assert from "node:assert/strict";
import { classifyBubbleRow } from "../services/scan-pipeline";

type FixtureRow = {
  expected: string[];
  question: number;
  scores: Record<string, number>;
};

const fixture: FixtureRow[] = [
  { question: 1, expected: ["B", "D"], scores: { A: 0.159, B: 0.934, C: 0.137, D: 0.928, E: 0.166 } },
  { question: 2, expected: ["A"], scores: { A: 0.936, B: 0.109, C: 0.121, D: 0.132, E: 0.144 } },
  { question: 3, expected: ["C", "E"], scores: { A: 0.110, B: 0.110, C: 0.950, D: 0.134, E: 0.915 } },
  { question: 4, expected: ["B"], scores: { A: 0.113, B: 0.949, C: 0.120, D: 0.142, E: 0.135 } },
  { question: 5, expected: ["B", "C", "D"], scores: { A: 0.113, B: 0.959, C: 0.944, D: 0.927, E: 0.146 } },
  { question: 6, expected: ["E"], scores: { A: 0.121, B: 0.111, C: 0.124, D: 0.127, E: 0.929 } },
  { question: 7, expected: ["A", "B"], scores: { A: 0.959, B: 0.956, C: 0.120, D: 0.128, E: 0.127 } },
  { question: 8, expected: ["D"], scores: { A: 0.120, B: 0.121, C: 0.135, D: 0.939, E: 0.146 } },
  { question: 9, expected: ["C", "D"], scores: { A: 0.111, B: 0.108, C: 0.950, D: 0.948, E: 0.188 } },
  { question: 10, expected: ["A"], scores: { A: 0.974, B: 0.112, C: 0.108, D: 0.105, E: 0.145 } },
  { question: 11, expected: ["A", "C"], scores: { A: 0.91, B: 0.13, C: 0.38, D: 0.15, E: 0.12 } },
];

for (const row of fixture) {
  const result = classifyBubbleRow(Object.entries(row.scores).map(([alternative, score]) => ({ alternative, score })));
  assert.deepEqual([...result.markedAnswers].sort(), [...row.expected].sort(), `Questão ${row.question}: marcações divergentes`);
  assert.equal(result.status, row.expected.length > 1 ? "MULTIPLE" : "MARKED", `Questão ${row.question}: estado divergente`);
}

console.log(`Detecção de múltiplas marcações validada em ${fixture.length} perfis, incluindo as 10 questões da foto real.`);
