"use client";

import { useActionState, useState } from "react";
import { Send } from "lucide-react";
import type { ActionResult } from "@/lib/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

type CampaignSendFormProps = {
  action: (previousState: ActionResult | null | undefined, formData: FormData) => Promise<ActionResult | undefined>;
  campaignId: string;
  campaignName: string;
  emailReady: boolean;
  recipientCount: number;
};

export function CampaignSendForm({ action, campaignId, campaignName, emailReady, recipientCount }: CampaignSendFormProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, null);
  const disabled = !recipientCount || !emailReady;

  return (
    <>
      <button className="button secondary" disabled={disabled} onClick={() => setOpen(true)} type="button" title={!emailReady ? "Email setup required before sending." : undefined}>
        <Send size={14} />
        Send
      </button>
      {open ? (
        <div className="modal-backdrop" role="presentation">
          <section className="send-modal" role="dialog" aria-modal="true" aria-labelledby={`send-${campaignId}`}>
            <div className="panel-header">
              <div>
                <h2 id={`send-${campaignId}`}>Send campaign?</h2>
                <p>
                  {campaignName} will send to {recipientCount} recipient{recipientCount === 1 ? "" : "s"} in its selected segment.
                </p>
              </div>
            </div>
            <form action={formAction} className="form-stack">
              {state?.error ? <div className="error">{state.error}</div> : null}
              {state?.success ? <div className="success">{state.success}</div> : null}
              <input type="hidden" name="campaignId" value={campaignId} />
              <div className="button-row">
                <button className="button ghost" onClick={() => setOpen(false)} type="button">
                  Cancel
                </button>
                <SubmitButton>
                  <Send size={16} />
                  Confirm send
                </SubmitButton>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
