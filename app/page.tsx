"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

const heroHighlights = [
  "OCR com revisão manual obrigatória quando necessário",
  "Google Sheets como base oficial de dados",
  "Fluxo otimizado para celular e desktop",
];

const benefits = [
  {
    icon: Table2,
    text: "Cadastros de alunos, turmas, provas, gabaritos, correções e respostas ficam organizados na estrutura do Google Sheets.",
    title: "Planilha como banco oficial",
  },
  {
    icon: ScanLine,
    text: "O professor vê questão por questão, com resposta do aluno, alternativa correta e destaque imediato em verde e vermelho.",
    title: "Correção visual extremamente clara",
  },
  {
    icon: Upload,
    text: "Fotografe no celular ou envie a imagem pelo computador sem quebrar o fluxo de revisão e salvamento.",
    title: "Pronto para celular e desktop",
  },
];

const flowSteps = [
  "1. Cadastre turmas e alunos",
  "2. Monte a prova e o gabarito oficial",
  "3. Tire a foto ou envie a imagem do cartão",
  "4. Revise OCR, aluno e respostas detectadas",
  "5. Salve na planilha e acompanhe relatórios",
];

const featureList = [
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
];

const mobileEntryPoints = [
  { href: "/dashboard/correcao", label: "Corrigir agora" },
  { href: "/login", label: "Entrar no painel" },
  { href: "#fluxo", label: "Ver fluxo" },
];

const MOTION_EASE = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      ease: MOTION_EASE,
      staggerChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    transition: { duration: 0.65, ease: MOTION_EASE },
    y: 0,
  },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.96, y: 18 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.58, ease: MOTION_EASE },
    y: 0,
  },
};

export default function HomePage() {
  const latest = correctionSessions[0];
  const reducedMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="ambient-orb ambient-orb-a" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-b" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-c" aria-hidden="true" />

      <div className="mx-auto max-w-[1280px] px-4 pt-4 lg:px-6">
        <header className="mobile-top-shell relative z-40 flex flex-col gap-4 rounded-[30px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 backdrop-blur md:flex-row md:items-center md:justify-between md:px-5">
          <ProvaScanLogo size="sm" priority />
          <nav className="hidden items-center gap-6 text-sm text-[var(--muted-foreground)] md:flex">
            {[
              { href: "#beneficios", label: "Benefícios" },
              { href: "#fluxo", label: "Como funciona" },
              { href: "#recursos", label: "Recursos" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="nav-link inline-flex items-center py-2 transition-transform hover:-translate-y-0.5"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <ThemeSwitcher compact />
            <Link href="/login">
              <Button variant="ghost" className="min-w-[96px]">
                Entrar
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="min-w-[124px]">Abrir painel</Button>
            </Link>
          </div>
          <div className="mobile-nav-scroller -mx-1 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {mobileEntryPoints.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_76%,transparent)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </header>
      </div>

      <section className="relative mx-auto grid max-w-[1280px] gap-6 px-4 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-6 lg:pt-14">
        <div className="relative py-2 lg:py-6">
          <motion.div variants={fadeUp}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Exclusivo para professores</Badge>
              <span className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_86%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Mobile first
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-sheen mt-5 max-w-3xl text-[2.5rem] font-semibold leading-[0.92] tracking-[-0.07em] text-[var(--foreground)] sm:text-6xl"
          >
            Corrija cartões-resposta em segundos, com revisão visual e histórico salvo na sua planilha.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg sm:leading-8"
          >
            O ProvaScan organiza turmas, provas e gabaritos em um só lugar. Depois, lê a foto do cartão,
            identifica o aluno, compara com o gabarito oficial e entrega relatórios claros para a turma.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                Abrir painel do professor
                <ArrowRight className="size-4 transition-transform duration-300 group-hover/button:translate-x-1" />
              </Button>
            </Link>
            <Link href="/dashboard/correcao">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Testar correção por foto
              </Button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mobile-signal-panel mt-6 rounded-[28px] border border-[var(--border)] p-4 sm:p-5 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Entrada rápida
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                  Tudo o que o professor precisa na primeira dobra.
                </p>
              </div>
              <Badge tone="accent">{latest.confiancaOcr}% OCR</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_88%,transparent)] p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Aluno</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{latest.aluno.nome}</p>
              </div>
              <div className="rounded-[20px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--card-solid)_88%,transparent)] p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Acerto</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{latest.correction.percentual}% na revisão</p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={containerVariants} className="mt-8 grid gap-4 sm:grid-cols-3">
            {heroHighlights.map((item) => (
              <motion.div
                key={item}
                variants={fadeScale}
                className="feature-chip group rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] p-4"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" />
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div variants={fadeScale} className="hidden lg:block">
          <Card className="hero-monitor overflow-hidden p-5">
            <div className="scan-sweep" aria-hidden="true" />
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
                <motion.div
                  animate={reducedMotion ? {} : { y: [0, -4, 0] }}
                  transition={{ duration: 5.4, ease: "easeInOut", repeat: Infinity }}
                  className="rounded-[22px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4"
                >
                  <p className="text-sm text-[var(--hero-muted)]">Aluno encontrado</p>
                  <p className="mt-3 text-lg font-semibold">{latest.aluno.nome}</p>
                  <p className="mt-1 text-sm text-[var(--hero-muted)]">{latest.turma.nome}</p>
                </motion.div>
                <motion.div
                  animate={reducedMotion ? {} : { y: [0, 4, 0] }}
                  transition={{ duration: 6.2, ease: "easeInOut", repeat: Infinity }}
                  className="rounded-[22px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4"
                >
                  <p className="text-sm text-[var(--hero-muted)]">Resultado parcial</p>
                  <p className="mt-3 text-lg font-semibold">{latest.correction.percentual}% de acerto</p>
                  <p className="mt-1 text-sm text-[var(--hero-muted)]">{latest.correction.tempoCorrecao} para concluir</p>
                </motion.div>
              </div>
              <div className="grid gap-3">
                {latest.respostas.slice(0, 4).map((answer, index) => (
                  <motion.div
                    key={answer.questao}
                    initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                    animate={reducedMotion ? {} : { opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + index * 0.08, duration: 0.5 }}
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[20px] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-3 transition-transform duration-300 hover:-translate-y-0.5"
                  >
                    <div className="grid size-10 place-items-center rounded-2xl bg-[var(--hero-chip)] text-sm font-semibold text-[var(--hero-foreground)] transition-transform duration-300 group-hover:scale-105">
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
                            className={`grid size-9 place-items-center rounded-xl text-xs font-semibold transition-transform duration-300 group-hover:scale-[1.03] ${
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
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {dashboardMetrics.slice(0, 3).map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + index * 0.1, duration: 0.52 }}
                  className="feature-chip rounded-[22px] border border-[var(--border)] bg-[var(--card-solid)] p-4"
                >
                  <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{metric.value}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{metric.helper}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </section>

      <RevealSection id="beneficios" className="mx-auto mt-10 grid max-w-[1280px] gap-5 px-4 lg:grid-cols-3 lg:px-6">
        {benefits.map((item, index) => (
          <RevealCard key={item.title} delay={index * 0.08}>
            <Card className="feature-card p-6">
              <item.icon className="size-5 text-[var(--accent)]" />
              <h3 className="mt-5 text-xl font-semibold text-[var(--foreground)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.text}</p>
            </Card>
          </RevealCard>
        ))}
      </RevealSection>

      <RevealSection id="fluxo" className="mx-auto mt-10 max-w-[1280px] px-4 lg:px-6">
        <Card className="feature-card p-6 lg:p-8">
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
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.24, once: true }}
            className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          >
            {flowSteps.map((step) => (
              <motion.div
                key={step}
                variants={fadeScale}
                className="feature-chip rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm font-medium text-[var(--foreground)]"
              >
                {step}
              </motion.div>
            ))}
          </motion.div>
        </Card>
      </RevealSection>

      <RevealSection id="recursos" className="mx-auto mt-10 max-w-[1280px] px-4 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <RevealCard>
            <Card className="feature-card p-6">
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
          </RevealCard>
          <RevealCard delay={0.08}>
            <Card className="feature-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                    Visão geral
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">Recursos centrais</h3>
                </div>
                <motion.div
                  animate={reducedMotion ? {} : { rotate: [0, 8, -6, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
                >
                  <Sparkles className="size-5 text-[var(--accent)]" />
                </motion.div>
              </div>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ amount: 0.22, once: true }}
                className="mt-6 grid gap-4 md:grid-cols-2"
              >
                {featureList.map((item) => (
                  <motion.div
                    key={item}
                    variants={fadeScale}
                    className="feature-chip rounded-[22px] border border-[var(--border)] p-4 text-sm font-medium text-[var(--foreground)]"
                  >
                    {item}
                  </motion.div>
                ))}
              </motion.div>
            </Card>
          </RevealCard>
        </div>
      </RevealSection>
    </div>
  );
}

function RevealSection({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2, once: true }}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function RevealCard({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.25, once: true }}
      transition={{ delay, duration: 0.6, ease: MOTION_EASE }}
    >
      {children}
    </motion.div>
  );
}
