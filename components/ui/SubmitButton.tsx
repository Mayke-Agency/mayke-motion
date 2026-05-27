"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
};

export function SubmitButton({ children, className = "button", disabled = false, name, value }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" name={name} value={value} disabled={pending || disabled}>
      {pending ? <LoaderCircle size={16} className="spin" /> : null}
      {pending ? "Working..." : children}
    </button>
  );
}
