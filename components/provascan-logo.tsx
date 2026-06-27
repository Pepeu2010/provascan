export function ProvaScanLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-11 place-items-center rounded-2xl bg-[radial-gradient(circle_at_top,#93c5fd,transparent_60%),linear-gradient(135deg,#2563eb,#0f172a)] text-sm font-black text-white shadow-[var(--shadow-soft)]">
        PS
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
          ProvaScan
        </p>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Correção inteligente para professores
        </p>
      </div>
    </div>
  );
}
