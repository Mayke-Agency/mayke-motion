"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/lib/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ nextPath = "" }: { nextPath?: string }) {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="form-stack">
      {state?.error ? <div className="error">{state.error}</div> : null}
      <input name="next" type="hidden" value={nextPath} />

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          className="input"
          id="email"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          defaultValue="owner@bloomtable.com"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="Motion2026!"
          required
        />
      </div>

      <SubmitButton>
        <LogIn size={16} />
        Enter dashboard
      </SubmitButton>
    </form>
  );
}
