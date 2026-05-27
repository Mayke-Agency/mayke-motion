import Link from "next/link";
import { ArrowRight, PlugZap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { startStripeConnectOnboardingAction } from "@/lib/onboarding-integrations-actions";

export default function StripeConnectRefreshPage() {
  return (
    <main className="main">
      <PageHeader
        eyebrow="Stripe Connect"
        title="Refresh your Stripe onboarding link."
        description="Stripe asked for a new secure onboarding link. Mayke Motion will create one without collecting bank or KYC details."
        action={
          <Link className="button secondary" href="/onboarding/setup">
            Back to setup
            <ArrowRight size={16} />
          </Link>
        }
      />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Create a new Stripe link</h2>
            <p>The next step opens Stripe Express in a secure hosted flow.</p>
          </div>
          <PlugZap size={20} />
        </div>
        <div className="panel-body">
          <StatefulForm action={startStripeConnectOnboardingAction}>
            <SubmitButton>
              <PlugZap size={16} />
              Continue Stripe onboarding
            </SubmitButton>
          </StatefulForm>
        </div>
      </section>
    </main>
  );
}
