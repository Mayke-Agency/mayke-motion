import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function RegistrationSuccessPage() {
  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.74)" }}>Registration received</p>
          <h1>Thank you.</h1>
          <p>The Jete team has your registration and will review the details shortly.</p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="login-card">
          <div className="metric-icon" style={{ marginBottom: 18 }}>
            <CheckCircle2 size={18} />
          </div>
          <h2>Registration complete</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>You can close this page. If payment was required, Stripe confirmation may take a moment to appear in the studio dashboard.</p>
          <Link className="button secondary" href="/">
            Back to Mayke Motion
          </Link>
        </div>
      </section>
    </main>
  );
}
