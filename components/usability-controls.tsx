"use client";

import { CheckCircle2, Eye, GraduationCap } from "lucide-react";
import { useUsability } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function UsabilityControls({ tutorialOnly = false }: { tutorialOnly?: boolean }) {
  const { easyMode, setEasyMode, setTutorialSeen, tutorialSeen } = useUsability();
  if (tutorialOnly && tutorialSeen) return null;
  return <Card className="p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><Badge tone="accent">Ajuda para começar</Badge><h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">{tutorialOnly ? "Corrija a primeira prova em 3 passos" : "Modo fácil"}</h2><p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Textos maiores, botões mais altos e recursos avançados fechados até você precisar deles.</p></div>{!tutorialOnly ? <Button variant={easyMode ? "primary" : "secondary"} onClick={() => setEasyMode(!easyMode)}><Eye className="size-4" />{easyMode ? "Modo fácil ativado" : "Ativar modo fácil"}</Button> : null}</div>
    <ol className="mt-5 grid gap-3 sm:grid-cols-3"><li className="rounded-xl border border-[var(--border)] p-4"><strong className="flex items-center gap-2 text-[var(--foreground)]"><span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-white">1</span>Escolha a prova</strong><p className="mt-2 text-sm text-[var(--muted-foreground)]">Use um modelo ou envie uma folha.</p></li><li className="rounded-xl border border-[var(--border)] p-4"><strong className="flex items-center gap-2 text-[var(--foreground)]"><span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-white">2</span>Teste uma foto</strong><p className="mt-2 text-sm text-[var(--muted-foreground)]">Confira luz, foco e leitura antes do lote.</p></li><li className="rounded-xl border border-[var(--border)] p-4"><strong className="flex items-center gap-2 text-[var(--foreground)]"><span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-white">3</span>Revise e salve</strong><p className="mt-2 text-sm text-[var(--muted-foreground)]">Confirme apenas nomes e dúvidas.</p></li></ol>
    {tutorialOnly ? <Button className="mt-4" variant="secondary" onClick={() => setTutorialSeen(true)}><CheckCircle2 className="size-4" />Entendi, não mostrar novamente</Button> : <p className="mt-4 flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><GraduationCap className="size-5" />Você pode rever este guia sempre que quiser.</p>}
  </Card>;
}
