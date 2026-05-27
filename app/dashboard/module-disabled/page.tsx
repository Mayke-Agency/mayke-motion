import Link from "next/link";
import { Lock } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";

export default function ModuleDisabledPage() {
  return (
    <section className="panel" style={{ padding: 28 }}>
      <div className="metric-icon" style={{ marginBottom: 18 }}>
        <Lock size={18} />
      </div>
      <EmptyState
        title="This module is not enabled"
        description="Mayke can turn this workspace module on from the admin client settings panel."
      />
      <div style={{ marginTop: 18 }}>
        <Link className="button secondary" href="/dashboard">
          Back to overview
        </Link>
      </div>
    </section>
  );
}
