"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ScanLine, ShieldCheck, UsersRound } from "lucide-react";
import { CreatorCredit } from "@/components/creator-credit";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { correctionSessions, dashboardMetrics } from "@/lib/mock-data";

const capabilities = [
  ["Organize", "Turmas, alunos, provas e gabaritos no mesmo lugar."],
  ["Corrija", "Leia o cartão, confirme a identificação e revise as respostas."],
  ["Entenda", "Acompanhe desempenho por turma, prova e questão."],
];

const benefits = [
  { icon: ScanLine, title: "Revisão que não pula etapas", text: "A leitura por foto apoia a correção. A confirmação do professor continua sendo a decisão final." },
  { icon: UsersRound, title: "Rotina escolar em ordem", text: "Cadastros e resultados ficam próximos do trabalho que o professor executa todos os dias." },
  { icon: ShieldCheck, title: "Dados no lugar certo", text: "O histórico operacional fica centralizado no Supabase, com sessão e acesso protegidos." },
];

export default function HomePage() {
  const latest = correctionSessions[0];
  const reduceMotion = useReducedMotion();

  return (
    <main className="min-h-[100dvh] pb-12">
      <header className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-4 lg:flex-nowrap lg:px-6 lg:py-5">
        <ProvaScanLogo size="sm" priority className="max-w-[148px] sm:max-w-none" />
        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex" aria-label="Navegação principal">
          <a className="nav-link" href="#como-funciona">Como funciona</a>
          <a className="nav-link" href="#por-que">Por que ProvaScan</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitcher compact />
          <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link href="/login">Entrar</Link></Button>
          <Button asChild className="h-10 px-3 text-xs !text-white sm:h-11 sm:px-4 sm:text-sm"><Link href="/dashboard">Abrir painel <ArrowRight className="size-4" /></Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1320px] gap-10 px-4 pb-12 pt-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-center lg:px-6 lg:pb-20 lg:pt-16">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Badge tone="accent">Correção objetiva para professores</Badge>
          <h1 className="mt-5 max-w-[760px] text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
            Corrija com clareza. Decida com confiança.
          </h1>
          <p className="mt-6 max-w-[640px] text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
            ProvaScan reúne a operação da avaliação em um só fluxo: preparar a prova, revisar o cartão-resposta e compreender os resultados da turma.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="!text-white"><Link href="/dashboard/correcao">Corrigir por foto <ScanLine className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="#como-funciona">Conhecer o fluxo</Link></Button>
          </div>
          <div className="mt-10 grid max-w-[660px] gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
            {capabilities.map(([title, description]) => <div key={title}><p className="text-sm font-semibold text-[var(--foreground)]">{title}</p><p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p></div>)}
          </div>
        </motion.div>

        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.08 }}>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-[var(--hero-border)] bg-[linear-gradient(145deg,var(--hero-bg),var(--hero-bg-end))] p-5 text-[var(--hero-foreground)] sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--hero-muted)]">Revisão em curso</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Cartão-resposta</h2></div><Badge tone="success">{latest.confiancaOcr}% identificado</Badge></div>
              <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-[var(--radius-md)] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4"><p className="text-xs text-[var(--hero-muted)]">Aluno</p><p className="mt-2 text-sm font-semibold">{latest.aluno.nome}</p><p className="mt-1 text-xs text-[var(--hero-muted)]">{latest.turma.nome}</p></div><div className="rounded-[var(--radius-md)] border border-[var(--hero-border)] bg-[var(--hero-surface)] p-4"><p className="text-xs text-[var(--hero-muted)]">Resultado parcial</p><p className="numeric mt-2 text-xl font-semibold">{latest.correction.percentual}%</p><p className="mt-1 text-xs text-[var(--hero-muted)]">em revisão</p></div></div>
              <div className="mt-4 space-y-2">
                {latest.respostas.slice(0, 4).map((answer) => <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--hero-border)] bg-[var(--hero-surface)] px-3 py-2.5" key={answer.questao}><span className="numeric text-xs font-semibold text-[var(--hero-muted)]">{answer.questao}</span><span className="text-sm font-medium">Questão {answer.questao}</span><span className={`grid size-7 place-items-center rounded-[6px] text-xs font-bold ${answer.respostaAluno === answer.respostaCorreta ? "bg-[var(--success)] text-white" : "bg-[var(--error)] text-white"}`}>{answer.respostaAluno}</span></div>)}
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[var(--border)] bg-[var(--card-solid)]">
              {dashboardMetrics.slice(0, 3).map((metric) => <div className="p-4 sm:p-5" key={metric.label}><p className="text-xs text-[var(--muted-foreground)]">{metric.label}</p><p className="numeric mt-2 text-2xl font-semibold tracking-[-.04em] text-[var(--foreground)]">{metric.value}</p></div>)}
            </div>
          </Card>
        </motion.div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-[1320px] px-4 py-8 lg:px-6 lg:py-12">
        <div className="border-y border-[var(--border)] py-8 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:py-12"><div><Badge tone="neutral">Fluxo principal</Badge><h2 className="mt-4 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Menos tela para entender. Mais contexto para agir.</h2></div><ol className="mt-7 grid gap-4 lg:mt-0"><li className="grid grid-cols-[32px_1fr] gap-4 border-b border-[var(--border)] pb-4"><span className="font-mono text-sm text-[var(--accent)]">01</span><p className="text-sm leading-6 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Prepare.</strong> Cadastre turmas, alunos, prova e gabarito uma única vez.</p></li><li className="grid grid-cols-[32px_1fr] gap-4 border-b border-[var(--border)] pb-4"><span className="font-mono text-sm text-[var(--accent)]">02</span><p className="text-sm leading-6 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Revise.</strong> Envie a imagem, confira identificação e valide cada resposta necessária.</p></li><li className="grid grid-cols-[32px_1fr] gap-4"><span className="font-mono text-sm text-[var(--accent)]">03</span><p className="text-sm leading-6 text-[var(--muted-foreground)]"><strong className="text-[var(--foreground)]">Acompanhe.</strong> Veja resultados claros para orientar a próxima decisão pedagógica.</p></li></ol></div>
      </section>

      <section id="por-que" className="mx-auto grid max-w-[1320px] gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--border)] px-px lg:grid-cols-3">
        {benefits.map((item) => <article className="bg-[var(--card-solid)] p-6 sm:p-8" key={item.title}><item.icon className="size-5 text-[var(--accent)]" /><h2 className="mt-8 text-xl font-semibold tracking-[-.025em]">{item.title}</h2><p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{item.text}</p></article>)}
      </section>

      <footer className="mx-auto max-w-[1320px] px-4 pt-10 lg:px-6"><CreatorCredit variant="footer" /></footer>
    </main>
  );
}
