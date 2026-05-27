import { BellPlus } from "lucide-react";
import { createReminderAction } from "@/lib/actions";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";

type ReminderFormProps = {
  title?: string;
  customerId?: string | null;
  inquiryId?: string | null;
  messageId?: string | null;
};

function defaultDueAt() {
  const due = new Date(Date.now() + 1000 * 60 * 60 * 24);
  return due.toISOString().slice(0, 16);
}

export function ReminderForm({ title = "Follow up", customerId, inquiryId, messageId }: ReminderFormProps) {
  return (
    <StatefulForm action={createReminderAction}>
      {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}
      {inquiryId ? <input type="hidden" name="inquiryId" value={inquiryId} /> : null}
      {messageId ? <input type="hidden" name="messageId" value={messageId} /> : null}
      <div className="field">
        <label htmlFor={`reminder-title-${customerId ?? inquiryId ?? messageId ?? "new"}`}>Reminder title</label>
        <input className="input" id={`reminder-title-${customerId ?? inquiryId ?? messageId ?? "new"}`} name="title" defaultValue={title} required />
      </div>
      <div className="field">
        <label htmlFor={`reminder-due-${customerId ?? inquiryId ?? messageId ?? "new"}`}>Due date</label>
        <input className="input" id={`reminder-due-${customerId ?? inquiryId ?? messageId ?? "new"}`} name="dueAt" type="datetime-local" defaultValue={defaultDueAt()} required />
      </div>
      <SubmitButton className="button secondary">
        <BellPlus size={16} />
        Add reminder
      </SubmitButton>
    </StatefulForm>
  );
}
