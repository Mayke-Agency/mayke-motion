import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createOrganizationAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/dashboard-data";

export default async function NewOrganizationPage() {
  await requireAdmin();
  const { businessTypes } = await getAdminSnapshot();

  return (
    <main className="main">
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/admin">
          <ArrowLeft size={16} />
          Back to clients
        </Link>
      </div>

      <PageHeader
        eyebrow="Mayke admin"
        title="New organization"
        description="Create a client workspace, assign its owner, and provision the right baseline modules in one secure action."
      />

      <section className="panel" style={{ maxWidth: 980 }}>
        <div className="panel-header">
          <div>
            <h2>Workspace details</h2>
            <p>The initial password is hashed before it is stored. Share it with the client through a secure channel.</p>
          </div>
          <Building2 size={20} />
        </div>
        <div className="panel-body">
          <StatefulForm action={createOrganizationAction} className="detail-stack">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="organization-name">Business name</label>
                <input className="input" id="organization-name" name="name" placeholder="Ghost Baseball Club" required />
              </div>
              <div className="field">
                <label htmlFor="organization-slug">Workspace slug</label>
                <input className="input" id="organization-slug" name="slug" placeholder="ghost-baseball-club" pattern="[a-z0-9]+(-[a-z0-9]+)*" required />
              </div>
              <div className="field">
                <label htmlFor="organization-type">Business type</label>
                <select className="select" id="organization-type" name="businessTypeId" required>
                  {businessTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="organization-website">Website</label>
                <input className="input" id="organization-website" name="website" type="url" placeholder="https://example.com" />
              </div>
              <div className="field">
                <label htmlFor="organization-email">Primary contact email</label>
                <input className="input" id="organization-email" name="contactEmail" type="email" placeholder="hello@example.com" required />
              </div>
              <div className="field">
                <label htmlFor="organization-phone">Phone</label>
                <input className="input" id="organization-phone" name="phone" type="tel" placeholder="(555) 555-5555" />
              </div>
              <div className="field full">
                <label htmlFor="organization-address">Address</label>
                <input className="input" id="organization-address" name="address" placeholder="123 Main Street" required />
              </div>
              <div className="field">
                <label htmlFor="organization-city">City</label>
                <input className="input" id="organization-city" name="city" required />
              </div>
              <div className="field">
                <label htmlFor="organization-state">State / region</label>
                <input className="input" id="organization-state" name="state" required />
              </div>
              <div className="field">
                <label htmlFor="organization-zip">ZIP / postal code</label>
                <input className="input" id="organization-zip" name="zip" required />
              </div>
              <div className="field">
                <label htmlFor="organization-timezone">Timezone</label>
                <input className="input" id="organization-timezone" name="timezone" defaultValue="America/New_York" required />
              </div>
              <div className="field">
                <label htmlFor="organization-brand">Brand color</label>
                <input className="input" id="organization-brand" name="brandPrimary" defaultValue="#241915" pattern="#[0-9A-Fa-f]{6}" required />
              </div>
            </div>

            <div className="section-rule" />

            <div>
              <p className="eyebrow">Client owner</p>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="owner-first-name">First name</label>
                  <input className="input" id="owner-first-name" name="firstName" required />
                </div>
                <div className="field">
                  <label htmlFor="owner-last-name">Last name</label>
                  <input className="input" id="owner-last-name" name="lastName" required />
                </div>
                <div className="field">
                  <label htmlFor="owner-email">Owner login email</label>
                  <input className="input" id="owner-email" name="adminEmail" type="email" placeholder="owner@example.com" required />
                </div>
                <div className="field">
                  <label htmlFor="owner-password">Initial password</label>
                  <input className="input" id="owner-password" name="initialPassword" type="password" minLength={12} autoComplete="new-password" required />
                </div>
              </div>
            </div>

            <div className="button-row">
              <SubmitButton>
                <Building2 size={16} />
                Create organization
              </SubmitButton>
              <Link className="button secondary" href="/admin">
                Cancel
              </Link>
            </div>
          </StatefulForm>
        </div>
      </section>
    </main>
  );
}
