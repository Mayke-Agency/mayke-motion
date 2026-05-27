"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions";

type StatefulFormProps = {
  action: (previousState: ActionResult | null | undefined, formData: FormData) => Promise<ActionResult | undefined>;
  children: React.ReactNode;
  className?: string;
};

export function StatefulForm({ action, children, className = "form-stack" }: StatefulFormProps) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {state?.error ? <div className="error">{state.error}</div> : null}
      {state?.success ? <div className="success">{state.success}</div> : null}
      {children}
    </form>
  );
}
