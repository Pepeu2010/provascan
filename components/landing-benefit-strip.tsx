"use client";

import { Camera, ChartNoAxesCombined, ClipboardCheck } from "lucide-react";
import styles from "./landing-benefit-strip.module.css";

const benefits = [
  {
    icon: Camera,
    title: "Leitura por foto",
    description: "Capture o cartão pelo celular.",
  },
  {
    icon: ClipboardCheck,
    title: "Revisão preservada",
    description: "A confirmação final continua sua.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Resultados por turma",
    description: "Acompanhe cada avanço com clareza.",
  },
];

export function LandingBenefitStrip() {
  return (
    <section className={styles.strip} aria-label="Pontos principais do ProvaScan">
      <div className={styles.grid}>
        {benefits.map(({ icon: Icon, title, description }, index) => (
          <article
            className={styles.card}
            key={title}
            style={{ animationDelay: `${80 + index * 60}ms` }}
            onPointerMove={(event) => {
              if (event.pointerType !== "mouse") return;

              const bounds = event.currentTarget.getBoundingClientRect();
              event.currentTarget.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
              event.currentTarget.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
            }}
          >
            <span className={styles.icon} aria-hidden="true">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
