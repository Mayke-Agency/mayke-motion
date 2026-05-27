"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="main">
      <section className="panel" style={{ padding: 28 }}>
        <div className="metric-icon" style={{ marginBottom: 18 }}>
          <AlertTriangle size={18} />
        </div>
        <h1 className="font-display" style={{ fontSize: 38, margin: 0 }}>
          Admin view could not load.
        </h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 680 }}>
          Try again after confirming the database is running and the current account has admin access.
        </p>
        <button className="button" onClick={reset} type="button">
          <RotateCcw size={16} />
          Try again
        </button>
      </section>
    </main>
  );
}
