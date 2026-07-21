import type { ClassRoom, Student } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Últimos alunos</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Cadastros organizados por turma e prontos para correção com persistência segura.
          </p>
        </div>
        <Badge tone="accent">Modo operacional</Badge>
      </div>
      <p id="students-table-hint" className="px-6 pt-4 text-xs text-[var(--muted-foreground)] sm:hidden">Deslize horizontalmente para ver todas as colunas.</p>
      <div className="overflow-x-auto" aria-describedby="students-table-hint">
        <table className="min-w-full text-left">
          <caption className="sr-only">Lista de alunos, matrícula, turma, status e ações disponíveis.</caption>
          <thead className="bg-[var(--table-head)] text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-6 py-4">Aluno</th>
              <th className="px-6 py-4">Matrícula</th>
              <th className="px-6 py-4">Turma</th>
              <th className="px-6 py-4">Status</th>
              {hasActions ? <th className="px-6 py-4 text-right">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const turma = classes.find((item) => item.id === student.turma);
              return (
                <tr key={student.id} className="border-t border-[var(--border)] text-sm">
                  <td className="px-6 py-4 font-medium text-[var(--foreground)]">{student.nome}</td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">{student.matricula}</td>
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
            {!students.length ? (
              <tr>
                <td
                  colSpan={hasActions ? 5 : 4}
                  className="px-6 py-8 text-center text-sm text-[var(--muted-foreground)]"
                >
                  Nenhum aluno cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
