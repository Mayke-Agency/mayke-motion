"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { importContactsAction } from "@/lib/actions";
import { parseContactCsv } from "@/lib/contact-csv";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";

type ContactImportFormProps = {
  businessId?: string;
};

export function ContactImportForm({ businessId }: ContactImportFormProps) {
  const [csv, setCsv] = useState("");
  const preview = useMemo(() => parseContactCsv(csv).slice(0, 5), [csv]);

  return (
    <StatefulForm action={importContactsAction}>
      {businessId ? <input type="hidden" name="businessId" value={businessId} /> : null}
      <input type="hidden" name="csv" value={csv} />
      <div className="field">
        <label htmlFor={`contact-import-${businessId ?? "tenant"}`}>CSV import</label>
        <input
          className="input"
          id={`contact-import-${businessId ?? "tenant"}`}
          type="file"
          accept=".csv,text/csv"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            setCsv(file ? await file.text() : "");
          }}
        />
      </div>
      {preview.length ? (
        <div className="timeline-list" style={{ marginBottom: 12 }}>
          {preview.map((contact, index) => (
            <article className="timeline-item" key={`${contact.email}-${index}`}>
              <div>
                <strong>{[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email || contact.phone}</strong>
                <span>{contact.source || "CSV import"}</span>
              </div>
              <p>{contact.email || contact.phone || "No contact detail"} · {contact.tags.join(", ") || "No tags"}</p>
            </article>
          ))}
        </div>
      ) : null}
      <SubmitButton className="button secondary">
        <Upload size={16} />
        Import contacts
      </SubmitButton>
    </StatefulForm>
  );
}
