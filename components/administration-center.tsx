"use client";

import Link from "next/link";
import { BarChart3, BookCheck, ClipboardCheck, GraduationCap, ScanLine, Settings2, ShieldCheck, Users } from "lucide-react";
import { useAppData } from "@/components/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canManageUsers } from "@/lib/access-control";

const operations = [
  { href: "/dashboard/alunos", label: "Alunos", description: "Cadastre, mova de turma e acompanhe a situação de cada estudante.", icon: Users },
  { href: "/dashboard/turmas", label: "Turmas", description: "Organize séries, turmas e o público de cada avaliação.", icon: GraduationCap },
  { href: "/dashboard/provas", label: "Provas", description: "Crie avaliações, regras, datas e alternativas.", icon: BookCheck },
  { href: "/dashboard/gabaritos", label: "Gabaritos", description: "Libere avaliações, revise respostas e imprima cartões.", icon: ClipboardCheck },
  { href: "/dashboard/correcao", label: "Correção", description: "Leia cartões, revise exceções e salve resultados.", icon: ScanLine },
  { href: "/dashboard/relatorios", label: "Relatórios", description: "Consulte desempenho por turma, aluno e avaliação.", icon: BarChart3 },
];

export function AdministrationCenter() {
  const { data, session } = useAppData();
  const hasInstitutionalControl = canManageUsers(session?.role ?? "");
  const activeStudents = data.students.filter((student) => student.status === "Ativo").length;

  return (
    <section className="grid gap-5" aria-labelledby="administration-center-title">
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 id="administration-center-title" className="text-3xl font-semibold tracking-[-0.045em] text-[var(--foreground)]">Central de administração</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">Organize a instituição, conduza a operação acadêmica e mantenha acessos sob controle em um único lugar.</p>
          </div>
          <Badge tone={hasInstitutionalControl ? "accent" : "warning"}>{session?.role === "admin" ? "Admin: controle institucional" : "Vice-direção: controle institucional"}</Badge>
        </div>
        <dl className="mt-7 grid grid-cols-2 divide-x divide-[var(--border)] border-y border-[var(--border)] sm:grid-cols-4">
          {[
            ["Alunos ativos", activeStudents],
            ["Turmas", data.classes.length],
            ["Provas", data.exams.length],
            ["Correções", data.corrections.length],
          ].map(([label, value]) => <div key={String(label)} className="px-4 py-4 first:pl-0 sm:px-5"><dt className="text-xs font-medium text-[var(--muted-foreground)]">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{value}</dd></div>)}
        </dl>
      </Card>

      <div className="grid gap-x-8 gap-y-4 border-y border-[var(--border)] py-5 sm:grid-cols-2 xl:grid-cols-3">
        {operations.map((operation) => {
          const Icon = operation.icon;
          return <Link key={operation.href} href={operation.href} className="group flex min-h-32 gap-4 rounded-[18px] px-3 py-4 transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--card-solid)] text-[var(--accent)]"><Icon className="size-5" aria-hidden="true" /></span>
            <span><span className="text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">{operation.label}</span><span className="mt-2 block text-sm leading-6 text-[var(--muted-foreground)]">{operation.description}</span></span>
          </Link>;
        })}
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Governança e continuidade</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">Abaixo, gerencie pessoas, recuperação de acesso e segurança. Admin e Vice-direção têm o mesmo alcance institucional.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary"><a href="#equipe"><ShieldCheck className="size-4" />Equipe e acessos</a></Button>
            <Button asChild variant="ghost"><a href="#seguranca"><Settings2 className="size-4" />Segurança</a></Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
