"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="panel" style={{ padding: 28 }}>
      <div className="metric-icon" style={{ marginBottom: 18 }}>
        <AlertTriangle size={18} />
      </div>
      <h1 className="font-display" style={{ fontSize: 38, margin: 0 }}>
        Something interrupted this workspace.
      </h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 680 }}>
        The dashboard could not finish loading. Try again, and if it repeats, check the local database and dev server logs.
      </p>
      {error.digest ? <p className="eyebrow">Digest: {error.digest}</p> : null}
      <button className="button" onClick={reset} type="button">
        <RotateCcw size={16} />
        Try again
      </button>
    </section>
  );
}
