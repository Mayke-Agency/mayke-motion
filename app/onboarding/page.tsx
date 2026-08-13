import { redirect } from "next/navigation";
import { Building2, ImagePlus, Paintbrush, Sparkles } from "lucide-react";
import { BrandColorField } from "@/components/forms/BrandColorField";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { completeOnboardingAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";

export default async function OnboardingPage() {
  const user = await requireUser();

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  if (user.business) {
    redirect("/onboarding/setup");
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-hero">
        <div className="auth-brand">
          <div className="brand-mark">M</div>
          <span>Mayke Motion</span>
        </div>
        <div>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.72)" }}>
            Workspace setup
          </p>
          <h1>Shape the operating room around your brand.</h1>
          <p>
            Tell Mayke Motion what kind of business you run and the dashboard will open with the right language,
            catalog, inquiry flow, and performance lens.
          </p>
        </div>
        <div className="onboarding-note">
          <Sparkles size={18} />
          <span>Signed in as {user.email}</span>
        </div>
      </section>

      <section className="onboarding-panel">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Create your business workspace</h2>
              <p>These details can be refined later in Settings. Integrations can be connected in the next setup step.</p>
            </div>
            <Building2 size={22} />
          </div>
          <div className="panel-body">
            <StatefulForm action={completeOnboardingAction}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="businessName">Business name</label>
                  <input className="input" id="businessName" name="businessName" placeholder="Luna Table" required />
                </div>
                <div className="field">
                  <label htmlFor="businessType">Business type</label>
                  <select className="select" id="businessType" name="businessType" defaultValue="RESTAURANT" required>
                    <option value="RESTAURANT">Restaurant</option>
                    <option value="RETAIL">Retail / ecommerce</option>
                    <option value="DANCE_STUDIO">Dance studio / education</option>
                    <option value="SPORTS_CLUB">Sports club</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="website">Business website</label>
                  <input className="input" id="website" name="website" type="url" placeholder="https://example.com" />
                </div>
                <div className="field">
                  <label htmlFor="contactEmail">Contact email</label>
                  <input className="input" id="contactEmail" name="contactEmail" type="text" inputMode="email" defaultValue={user.email} required />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone number</label>
                  <input className="input" id="phone" name="phone" placeholder="(555) 010-0000" />
                </div>
                <div className="field">
                  <label htmlFor="brandColor">Brand color</label>
                  <BrandColorField />
                </div>
                <div className="field full">
                  <label htmlFor="address">Location / address</label>
                  <input className="input" id="address" name="address" placeholder="84 Mercer Street, New York, NY" required />
                </div>
                <div className="field full">
                  <label htmlFor="description">Short business description</label>
                  <textarea
                    className="textarea"
                    id="description"
                    name="description"
                    maxLength={500}
                    placeholder="A few words about the experience, store, service style, or audience."
                  />
                </div>
                <div className="field full">
                  <label>Logo upload</label>
                  <div className="logo-placeholder">
                    <ImagePlus size={22} />
                    <div>
                      <strong>Logo upload placeholder</strong>
                      <p>File storage will connect later. Your workspace can launch now with brand color and business details.</p>
                    </div>
                  </div>
                </div>
              </div>
              <SubmitButton>
                <Paintbrush size={16} />
                Create workspace
              </SubmitButton>
            </StatefulForm>
          </div>
        </div>
      </section>
    </main>
  );
}
