import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ScanLine,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { correctionSessions, dashboardMetrics } from "@/lib/mock-data";

export default function HomePage() {
  const latest = correctionSessions[0];

  return (
    <div className="pb-16">
      <div className="mx-auto max-w-[1280px] px-4 pt-4 lg:px-6">
        <header className="relative z-40 flex flex-col gap-4 rounded-[30px] border border-[var(--border)] bg-[var(--card)] px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <ProvaScanLogo size="sm" priority />
          <div className="hidden items-center gap-6 text-sm text-[var(--muted-foreground)] md:flex">
            <a href="#beneficios">Benefícios</a>
            <a href="#fluxo">Como funciona</a>
            <a href="#recursos">Recursos</a>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
            <ThemeSwitcher compact />
            <Link href="/login">
              <Button variant="ghost" className="w-full sm:w-auto">Entrar</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="w-full sm:w-auto">Criar conta</Button>
            </Link>
          </div>
        </header>
      </div>

      <section className="mx-auto grid max-w-[1280px] gap-8 px-4 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-6 lg:pt-14">
        <div className="py-6">
          <Badge tone="neutral">Exclusivo para professores</Badge>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)] sm:text-6xl">
            Corrija cartões-resposta em segundos, com revisão visual e histórico salvo na sua planilha.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
            O ProvaScan organiza turmas, provas e gabaritos em um só lugar. Depois, lê a foto do cartão,
            identifica o aluno, compara com o gabarito oficial e entrega relatórios claros para a turma.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg">
                Abrir painel do professor
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/dashboard/correcao">
              <Button size="lg" variant="secondary">
                Testar correção por foto
              </Button>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              "OCR com revisão manual obrigatória quando necessário",
              "Google Sheets como base oficial de dados",
              "Fluxo otimizado para celular e desktop",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] p-4"
              >
                <CheckCircle2 className="mt-0.5 size-4 text-[var(--accent)]" />
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden p-5">
          <div className="grid gap-4 rounded-[26px] border border-[var(--hero-border)] bg-[linear-gradient(180deg,var(--hero-bg),var(--hero-bg-end))] p-5 text-[var(--hero-foreground)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--hero-muted)]">
                  Painel do professor
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Correção em andamento</h2>
              </div>
              <Badge tone="accent">{latest.confiancaOcr}% OCR</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
                <p className="text-sm text-[var(--hero-muted)]">Aluno encontrado</p>
                <p className="mt-3 text-lg font-semibold">{latest.aluno.nome}</p>
                <p className="mt-1 text-sm text-[var(--hero-muted)]">{latest.turma.nome}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4">
                <p className="text-sm text-[var(--hero-muted)]">Resultado parcial</p>
                <p className="mt-3 text-lg font-semibold">{latest.correction.percentual}% de acerto</p>
                <p className="mt-1 text-sm text-[var(--hero-muted)]">{latest.correction.tempoCorrecao} para concluir</p>
              </div>
            </div>
            <div className="grid gap-3">
              {latest.respostas.slice(0, 4).map((answer) => (
                <div
                  key={answer.questao}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[20px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3"
                >
                  <div className="grid size-10 place-items-center rounded-2xl bg-[var(--hero-chip)] text-sm font-semibold text-[var(--hero-foreground)]">
                    {answer.questao}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Questão {answer.questao}</p>
                    <p className="text-xs text-[var(--hero-muted)]">Gabarito {answer.respostaCorreta}</p>
                  </div>
                  <div className="flex gap-2">
                    {latest.prova.alternativas.map((alternative) => {
                      const isSelected = alternative === answer.respostaAluno;
                      const isCorrect = alternative === answer.respostaCorreta;
                      return (
                        <span
                          key={alternative}
                          className={`grid size-9 place-items-center rounded-xl text-xs font-semibold ${
                            isCorrect
                              ? "bg-[var(--success)] text-white"
                              : isSelected
                                ? "bg-[var(--error)] text-white"
                                : "bg-[var(--hero-chip)] text-[var(--hero-chip-muted)]"
                          }`}
                        >
                          {alternative}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {dashboardMetrics.slice(0, 3).map((metric) => (
              <div key={metric.label} className="rounded-[22px] border border-[var(--border)] bg-[var(--card-solid)] p-4">
                <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{metric.value}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{metric.helper}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="beneficios" className="mx-auto mt-10 grid max-w-[1280px] gap-5 px-4 lg:grid-cols-3 lg:px-6">
        {[
          {
            icon: Table2,
            title: "Planilha como banco oficial",
            text: "Cadastros de alunos, turmas, provas, gabaritos, correções e respostas ficam organizados na estrutura do Google Sheets.",
          },
          {
            icon: ScanLine,
            title: "Correção visual extremamente clara",
            text: "O professor vê questão por questão, com resposta do aluno, alternativa correta e destaque imediato em verde e vermelho.",
          },
          {
            icon: Upload,
            title: "Pronto para celular e desktop",
            text: "Fotografe no celular ou envie a imagem pelo computador sem quebrar o fluxo de revisão e salvamento.",
          },
        ].map((item) => (
          <Card key={item.title} className="p-6">
            <item.icon className="size-5 text-[var(--accent)]" />
            <h3 className="mt-5 text-xl font-semibold text-[var(--foreground)]">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.text}</p>
          </Card>
        ))}
      </section>

      <section id="fluxo" className="mx-auto mt-10 max-w-[1280px] px-4 lg:px-6">
        <Card className="p-6 lg:p-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge tone="neutral">Como funciona</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                Um fluxo pensado do cadastro até o relatório final.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
              O professor configura sua operação uma vez e repete o processo com velocidade: cadastro, gabarito,
              foto, revisão, confirmação e estatística atualizada.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              "1. Cadastre turmas e alunos",
              "2. Monte a prova e o gabarito oficial",
              "3. Tire a foto ou envie a imagem do cartão",
              "4. Revise OCR, aluno e respostas detectadas",
              "5. Salve na planilha e acompanhe relatórios",
            ].map((step) => (
              <div
                key={step}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm font-medium text-[var(--foreground)]"
              >
                {step}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="recursos" className="mx-auto mt-10 max-w-[1280px] px-4 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <Badge tone="neutral">Professor no controle</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              Nada de portal do aluno. Tudo gira em torno da rotina de quem corrige.
            </h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
              <li>Gerenciamento de turmas, alunos e provas em uma mesma navegação.</li>
              <li>Editor de gabarito com seleção clara por alternativa e salvamento automático.</li>
              <li>Relatórios com ranking, média da turma, questões mais erradas e filtros por período.</li>
              <li>Arquitetura pronta para Vercel, variáveis de ambiente e rotas protegidas no servidor.</li>
            </ul>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Visão geral
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">Recursos centrais</h3>
              </div>
              <Sparkles className="size-5 text-[var(--accent)]" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                "Dashboard do professor",
                "CRUD de turmas",
                "CRUD de alunos",
                "CRUD de provas",
                "Editor de gabarito",
                "Correção por foto",
                "Tela de revisão",
                "Resultado visual",
                "Relatórios analíticos",
                "Integração com Google Sheets",
              ].map((item) => (
                <div key={item} className="rounded-[22px] border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)]">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
