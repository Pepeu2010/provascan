import { LoaderCircle } from "lucide-react";
import { ProvaScanLogo } from "@/components/provascan-logo";

export default function DashboardLoading() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[var(--background)] px-5 py-10">
      <section className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card-solid)] p-6 shadow-[var(--shadow-floating)]">
        <ProvaScanLogo size="sm" />
        <div className="mt-8 flex items-center gap-3 border-t border-[var(--border)] pt-5" role="status" aria-live="polite">
          <span className="grid size-10 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Carregando seu painel</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Organizando as informações da turma.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
