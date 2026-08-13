import { notFound } from "next/navigation";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getPublicRegistrationForm } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";
import { isStripePaymentsReady, stripeSetupMessage } from "@/lib/integration-gates";
import { submitRegistrationAction } from "@/lib/registration-actions";

export default async function PublicRegistrationPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const form = await getPublicRegistrationForm(slug);

  if (!form) {
    notFound();
  }

  const classes = form.business.studioClasses;
  const requiresPayment = Number(form.fee) > 0;
  const stripeReady = isStripePaymentsReady(form.business);
  const canCollectPayment = requiresPayment && stripeReady;

  return (
    <main className="auth-shell" style={{ gridTemplateColumns: "minmax(320px, 0.7fr) minmax(0, 1.3fr)" }}>
      <section className="auth-visual">
        <div className="auth-brand">
          <div className="brand-mark">J</div>
          <span>{form.business.name}</span>
        </div>
        <div>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.74)" }}>Registration</p>
          <h1>{form.title}</h1>
          <p>{form.description ?? "Complete the form below so the studio team can review placement, contact details, and next steps."}</p>
          <p>Registration fee: {formatCurrency(form.fee)}</p>
        </div>
      </section>

      <section className="auth-panel" style={{ overflow: "auto" }}>
        <div className="login-card" style={{ maxWidth: 900 }}>
          {query.payment === "canceled" ? <div className="error">Payment was canceled. Please submit again when ready.</div> : null}
          {requiresPayment && !stripeReady ? <div className="error">{stripeSetupMessage} Submit now and {form.business.name} will follow up about payment.</div> : null}
          <StatefulForm action={submitRegistrationAction} className="form-stack">
            <input type="hidden" name="formId" value={form.id} />
            <div className="form-grid">
              <Field name="referralSource" label="Referral source" required />
              <Field name="referralName" label="Referral name" />
              <Field name="familyLastName" label="Family last name" required />
              <Field name="primaryPhone" label="Primary phone" required />
              <Field name="homeAddress" label="Home address" required full />
              <Field name="city" label="City" required />
              <Field name="state" label="State" required />
              <Field name="zip" label="Zip" required />
              <Field name="emergencyContactInfo" label="Emergency contact info" required full />
              <Field name="contact1FirstName" label="Contact #1 first name" required />
              <Field name="contact1LastName" label="Contact #1 last name" required />
              <Field name="contact1Type" label="Contact #1 type" required />
              <Field name="contact1Phone" label="Contact #1 phone" required />
              <Field name="contact1Email" label="Contact #1 email" type="email" required />
              <label className="module-toggle">
                <input type="checkbox" name="smsConsent" />
                <span>SMS consent</span>
              </label>
              <Field name="contact2FirstName" label="Contact #2 first name" />
              <Field name="contact2LastName" label="Contact #2 last name" />
              <Field name="contact2Type" label="Contact #2 type" />
              <Field name="contact2Phone" label="Contact #2 phone" />
              <Field name="contact2Email" label="Contact #2 email" type="email" />
              <Field name="studentFirstName" label="Student first name" required />
              <Field name="studentLastName" label="Student last name" required />
              <Field name="studentGender" label="Student gender" required />
              <Field name="birthDate" label="Birth date" type="date" required />
              <Field name="studentPhone" label="Student phone optional" />
              <Field name="tshirtSize" label="T-shirt size" required />
              <Field name="gradeLevel" label="Grade level" required />
              <Field name="specialNeeds" label="Special needs" full />
              {classes.length ? (
                <div className="field full">
                  <label htmlFor="classId">Class interest / selected class</label>
                  <input type="hidden" name="classInterest" value="Selected class" />
                  <select className="select" id="classId" name="classId" required>
                    <option value="">Choose a class</option>
                    {classes.map((studioClass) => {
                      const registrationCount = studioClass._count.submissions;
                      const full = registrationCount >= studioClass.capacity;
                      return (
                        <option value={studioClass.id} key={studioClass.id} disabled={full}>
                          {studioClass.className} · {studioClass.ageRange} · {studioClass.level} · {studioClass.dayTime} · {formatCurrency(studioClass.price)}
                          {full ? " · Full" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <Field name="classInterest" label="Class interest / selected class" required full />
              )}
              <label className="module-toggle">
                <input type="checkbox" name="trialClass" />
                <span>Interested in trial class</span>
              </label>
              <div className="field full">
                <label htmlFor="notes">Notes / questions</label>
                <textarea className="textarea" id="notes" name="notes" />
              </div>
            </div>
            <SubmitButton>{canCollectPayment ? `Continue to payment (${formatCurrency(form.fee)})` : requiresPayment ? `Submit registration (${formatCurrency(form.fee)} due)` : "Submit registration"}</SubmitButton>
          </StatefulForm>
        </div>
      </section>
    </main>
  );
}

function Field({ name, label, type = "text", required = false, full = false }: { name: string; label: string; type?: string; required?: boolean; full?: boolean }) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} required={required} />
    </div>
  );
}
