import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type IntegrationGateNoticeProps = {
  kind: "stripe" | "email";
  message: string;
};

export function IntegrationGateNotice({ kind, message }: IntegrationGateNoticeProps) {
  return (
    <div className="integration-gate">
      <AlertCircle size={16} />
      <div>
        <strong>{kind === "stripe" ? "Stripe setup required" : "Email setup required"}</strong>
        <p>{message}</p>
      </div>
      <StatusBadge status="needs_attention" />
      <Link className="button ghost" href="/onboarding/setup">
        Open setup
      </Link>
    </div>
  );
}
