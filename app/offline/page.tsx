import Image from "next/image";

export default function OfflinePage() {
  return <main className="grid min-h-dvh place-items-center bg-[var(--background)] p-6 text-[var(--foreground)]"><section className="w-full max-w-lg rounded-[28px] border border-[var(--border)] bg-[var(--card-solid)] p-7 text-center shadow-[var(--shadow-floating)]"><Image unoptimized className="mx-auto size-20 rounded-2xl" src="/provascan-mark-v2.png" alt="" width={80} height={80} priority /><h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">Você está sem internet</h1><p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">Se havia uma correção em andamento, o rascunho continua salvo neste aparelho. Reconecte-se e abra o ProvaScan novamente para sincronizar.</p><a className="mt-6 inline-flex min-h-14 items-center justify-center rounded-xl bg-[var(--accent)] px-6 font-bold text-[var(--accent-contrast)]" href="/dashboard">Tentar novamente</a></section></main>;
}
