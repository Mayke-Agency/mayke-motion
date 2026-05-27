import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { refreshStripeConnectStatusAction } from "@/lib/onboarding-integrations-actions";

export default async function StripeConnectReturnPage() {
  const result = await refreshStripeConnectStatusAction();

  return (
    <main className="main">
      <PageHeader
        eyebrow="Stripe Connect"
        title="Stripe onboarding returned to Mayke Motion."
        description="The latest account status has been pulled from Stripe when possible."
        action={
          <Link className="button" href="/onboarding/setup">
            Continue setup
            <ArrowRight size={16} />
          </Link>
        }
      />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Connection status</h2>
            <p>{result.success ?? result.error ?? "Return received."}</p>
          </div>
          {result.success ? <CheckCircle2 size={20} /> : <StatusBadge status="needs_attention" />}
        </div>
      </section>
    </main>
  );
}
