import { LoaderCircle } from "lucide-react";
import { ProvaScanLogo } from "@/components/provascan-logo";

export default function SiteLoading() {
  return (
    <main className="site-loading" aria-busy="true">
      <section className="site-loading__content" role="status" aria-live="polite">
        <ProvaScanLogo size="sm" />
        <div className="site-loading__indicator" aria-hidden="true"><LoaderCircle className="size-4 animate-spin" /></div>
        <p>Abrindo o ProvaScan</p>
      </section>
    </main>
  );
}
