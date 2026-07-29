"use client";

import { useMemo, useState } from "react";
import type { ClassRoom, Student } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClassFilterSelect } from "@/components/class-filter-select";

export function StudentTable({
  classes,
  students,
  onDelete,
  onEdit,
}: {
  classes: ClassRoom[];
  students: Student[];
  onDelete?: (studentId: string) => void;
  onEdit?: (studentId: string) => void;
}) {
  const hasActions = Boolean(onDelete || onEdit);
  const [classFilter, setClassFilter] = useState("all");
  const visibleStudents = useMemo(
    () => (classFilter === "all" ? students : students.filter((student) => student.turma === classFilter)),
    [classFilter, students],
  );
  const selectedClass = classes.find((item) => item.id === classFilter);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Alunos cadastrados</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Cadastros organizados por turma e prontos para correção com persistência segura.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
            <span>Filtrar por sala</span>
            <ClassFilterSelect classes={classes} value={classFilter} onChange={setClassFilter} />
          </div>
          <Badge tone="accent">{visibleStudents.length} alunos{selectedClass ? ` · ${selectedClass.nome}` : ""}</Badge>
        </div>
      </div>
      <p id="students-table-hint" className="px-6 pt-4 text-xs text-[var(--muted-foreground)] sm:hidden">Deslize horizontalmente para ver todas as colunas.</p>
      <div className="overflow-x-auto" aria-describedby="students-table-hint">
        <table className="min-w-full text-left">
          <caption className="sr-only">Lista de alunos, turma, status e ações disponíveis.</caption>
          <thead className="bg-[var(--table-head)] text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-6 py-4">Aluno</th>
              <th className="px-6 py-4">Turma</th>
              <th className="px-6 py-4">Status</th>
              {hasActions ? <th className="px-6 py-4 text-right">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => {
              const turma = classes.find((item) => item.id === student.turma);
              return (
                <tr key={student.id} className="border-t border-[var(--border)] text-sm">
                  <td className="px-6 py-4 font-medium text-[var(--foreground)]">{student.nome}</td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">{turma?.nome}</td>
                  <td className="px-6 py-4">
                    <Badge
                      tone={
                        student.status === "Ativo"
                          ? "accent"
                          : student.status === "Inativo"
                            ? "warning"
                            : "error"
                      }
                    >
                      {student.status}
                    </Badge>
                  </td>
                  {hasActions ? (
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {onEdit ? (
                          <Button variant="secondary" onClick={() => onEdit(student.id)}>
                            Editar
                          </Button>
                        ) : null}
                        {onDelete ? (
                          <Button variant="ghost" onClick={() => onDelete(student.id)}>
                            Excluir
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {!visibleStudents.length ? (
              <tr>
                <td
                  colSpan={hasActions ? 4 : 3}
                  className="px-6 py-8 text-center text-sm text-[var(--muted-foreground)]"
                >
                  {classFilter === "all" ? "Nenhum aluno cadastrado ainda." : "Nenhum aluno nesta sala."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
