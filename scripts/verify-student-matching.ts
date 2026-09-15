import assert from "node:assert/strict";
import { findStudentCandidates, findStudentCandidatesInText } from "../lib/student-matching";

const students = [
  { id: "3", nome: "Maria Eduarda Santos", status: "Ativo" as const, turma: "2A" },
  { id: "1", nome: "Mariana Souza", status: "Ativo" as const, turma: "2A" },
  { id: "2", nome: "João Pedro", status: "Ativo" as const, turma: "1B" },
];
assert.equal(findStudentCandidates("maria eduarda", students)[0].student.id, "3");
assert.equal(findStudentCandidatesInText("PROVA\nNome: Maria Eduarda Santos\nTurma 2A", students)[0].student.id, "3");
assert.deepEqual(findStudentCandidates("", students), []);
assert.ok(findStudentCandidates("Maria", students).length >= 2);

console.log("Student matching verification passed.");
