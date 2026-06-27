import type { ClassRoom, Student } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function StudentTable({
  classes,
  students,
}: {
  classes: ClassRoom[];
  students: Student[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Últimos alunos</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Cadastros organizados por turma e prontos para sincronização.
          </p>
        </div>
        <Badge tone="accent">Modo operacional</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[var(--table-head)] text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            <tr>
              <th className="px-6 py-4">Aluno</th>
              <th className="px-6 py-4">Matrícula</th>
              <th className="px-6 py-4">Turma</th>
              <th className="px-6 py-4">Status</th>
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
                </tr>
              );
            })}
            {!students.length ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-[var(--muted-foreground)]">
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
