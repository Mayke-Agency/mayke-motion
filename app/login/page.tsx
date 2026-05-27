import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : user.business ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="auth-brand">
          <div className="brand-mark">M</div>
          <span>Mayke Motion</span>
        </div>
        <div>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.74)" }}>
            Mayke Agency client operating system
          </p>
          <h1>Run the business in motion.</h1>
          <p>
            A high-end portal for customer communication, inquiries, campaigns, analytics, and the daily signals that
            move Mayke-built brands forward.
          </p>
        </div>
      </section>

      <section className="auth-panel">
        <div className="login-card">
          <p className="eyebrow">Secure access</p>
          <h2>Welcome back</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 24 }}>
            Sign in with a demo account to view a business-specific Mayke Motion workspace.
          </p>
          <LoginForm nextPath={params.next ?? ""} />
          <div className="demo-grid">
            <strong>Demo accounts</strong>
            <span>Restaurant owner: owner@bloomtable.com</span>
            <span>Retail owner: owner@magohotsauce.com</span>
            <span>Dance studio owner: owner@jetedance.com</span>
            <span>New client onboarding: new@maykeclient.com</span>
            <span>Admin: admin@mayke.agency</span>
            <span>Password: Motion2026!</span>
          </div>
        </div>
      </section>
    </main>
  );
}
