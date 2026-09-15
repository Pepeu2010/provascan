import assert from "node:assert/strict";
import { parseStudentCsv } from "../lib/student-import";

const classes = [{ id: "T-2A", nome: "2º A", ano: "2026" }, { id: "T-1B", nome: "1º B", ano: "2026" }];
const parsed = parseStudentCsv("\uFEFFAluno;Turma;Situação\nMaria Silva;2º A;Ativo\nJoão Souza;1º B;inativo\nMaria Silva;2º A;Ativo", classes, []);
assert.equal(parsed.rows.length, 2);
assert.equal(parsed.rows[0].turma, "T-2A");
assert.equal(parsed.rows[1].status, "Inativo");
assert.equal(parsed.duplicates.length, 1);

const comma = parseStudentCsv("nome,class\nAna Lima,2º A\nSem Turma,9º Z", classes, [{ id: "old", nome: "Ana Lima", turma: "T-2A", status: "Ativo" }]);
assert.equal(comma.rows.length, 0);
assert.equal(comma.duplicates.length, 1);
assert.match(comma.errors[0], /9º Z/);

console.log("Student import verification passed.");
