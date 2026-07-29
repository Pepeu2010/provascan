"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  FileCheck2,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CreatorCredit } from "@/components/creator-credit";
import { ProvaScanLogo } from "@/components/provascan-logo";
import { Button } from "@/components/ui/button";

const workflow = [
  {
    icon: Camera,
    title: "Fotografe o cartão",
    text: "Use a câmera do celular. O enquadramento e a qualidade da imagem são verificados antes da leitura.",
  },
  {
    icon: ScanLine,
    title: "Confira só o necessário",
    text: "O sistema separa leituras seguras das marcações que precisam da sua atenção.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Salve e acompanhe",
    text: "O resultado entra no histórico da turma e já fica disponível para a próxima decisão.",
  },
];

const features = [
  {
    icon: FileCheck2,
    title: "Feito para provas reais",
    text: "Gabaritos de até 45 questões, turmas e alunos no mesmo fluxo de trabalho.",
    className: "landing-feature--wide",
  },
  {
    icon: ClipboardCheck,
    title: "Revisão é obrigatória",
    text: "A leitura auxilia. A confirmação final continua com o professor.",
    className: "landing-feature--violet",
  },
  {
    icon: ShieldCheck,
    title: "Dados organizados",
    text: "Resultados, gabaritos e histórico ficam ligados à sua turma.",
    className: "landing-feature--quiet",
  },
];

const heroTransition = {
  duration: 0.55,
  ease: [0.16, 1, 0.3, 1] as const,
};

export default function HomePage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header__inner">
          <Link href="/" className="landing-brand" aria-label="ProvaScan, página inicial">
            <ProvaScanLogo size="sm" priority className="landing-brand__logo" />
          </Link>
          <nav className="landing-nav" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#seguranca">Segurança</a>
          </nav>
          <div className="landing-header__actions">
            <Button asChild variant="ghost" className="landing-login">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild className="landing-primary-button">
              <Link href="/login">Começar agora <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-container landing-hero__grid">
          <motion.div
            className="landing-hero__copy"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={heroTransition}
          >
            <p className="landing-kicker"><Sparkles className="size-3.5" /> Para quem corrige prova objetiva</p>
            <h1>A correção que cabe no ritmo da <span>escola.</span></h1>
            <p className="landing-hero__description">
              Fotografe o cartão-resposta. O ProvaScan destaca apenas o que precisa da sua confirmação.
            </p>
            <div className="landing-hero__actions">
              <Button asChild size="lg" className="landing-primary-button landing-primary-button--large">
                <Link href="/login">Começar agora <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="landing-secondary-button">
                <a href="#como-funciona">Ver como funciona</a>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="landing-hero__media"
            initial={reduceMotion ? false : { opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ ...heroTransition, delay: 0.1 }}
          >
            <div className="landing-hero__image-frame">
              <Image
                src="/provascan-mobile-scan-hero.png"
                alt="Professor fotografando um cartão-resposta com o celular"
                fill
                priority
                sizes="(max-width: 900px) 100vw, 54vw"
                className="object-cover"
              />
            </div>
            <div className="landing-result-panel" aria-label="Exemplo de resultado de correção">
              <div className="landing-result-panel__heading">
                <span className="landing-result-panel__check"><Check className="size-4" /></span>
                <div><strong>Leitura concluída</strong><span>Pronta para revisar</span></div>
              </div>
              <div className="landing-result-panel__metrics">
                <div><span>Confirmadas</span><strong>42</strong></div>
                <div><span>Revisar</span><strong>3</strong></div>
                <div><span>Em branco</span><strong>0</strong></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="landing-assurance" aria-label="Pontos principais do ProvaScan">
        <div className="landing-container landing-assurance__items">
          <p><Camera className="size-4" /> Leitura por foto no celular</p>
          <p><ClipboardCheck className="size-4" /> Revisão do professor preservada</p>
          <p><ChartNoAxesCombined className="size-4" /> Resultados por turma</p>
        </div>
      </section>

      <section id="como-funciona" className="landing-section landing-workflow">
        <div className="landing-container">
          <div className="landing-section__intro">
            <p className="landing-kicker">Do papel ao resultado</p>
            <h2>Três movimentos. Sem trabalho repetido.</h2>
          </div>
          <div className="landing-workflow__layout">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  className={`landing-workflow-card landing-workflow-card--${index + 1}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.28 }}
                  transition={{ ...heroTransition, delay: index * 0.06 }}
                >
                  <div className="landing-workflow-card__icon"><Icon className="size-5" /></div>
                  <span className="landing-workflow-card__number">0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="recursos" className="landing-section landing-features">
        <div className="landing-container landing-features__layout">
          <div className="landing-features__copy">
            <p className="landing-kicker">O essencial, bem resolvido</p>
            <h2>Menos interfaces para aprender. Mais tempo para ensinar.</h2>
            <p>O ProvaScan junta a preparação, a correção e a consulta dos resultados em uma rotina direta.</p>
            <Button asChild variant="secondary" className="landing-secondary-button">
              <Link href="/login">Conhecer o painel <ArrowRight className="size-4" /></Link>
            </Button>
          </div>
          <div className="landing-feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className={`landing-feature ${feature.className}`} key={feature.title}>
                  <Icon className="size-5" />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="seguranca" className="landing-section landing-security">
        <div className="landing-container landing-security__frame">
          <div>
            <p className="landing-kicker">Você continua no controle</p>
            <h2>Leitura automática não substitui a decisão pedagógica.</h2>
          </div>
          <p>As exceções ficam claras para você confirmar antes de salvar. Nada é corrigido em silêncio.</p>
          <Button asChild className="landing-primary-button">
            <Link href="/login">Criar acesso <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <ProvaScanLogo size="sm" className="landing-footer__logo" />
          <CreatorCredit variant="footer" />
        </div>
      </footer>
    </main>
  );
}
