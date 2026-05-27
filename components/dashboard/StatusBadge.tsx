export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll("_", " ");
  const color =
    status.includes("FOLLOWED_UP") || status.includes("CLOSED") || status.includes("PAID") || status.includes("FULFILLED") || status.includes("SENT")
      ? "green"
      : status.includes("NEW") || status.includes("OPENED") || status.includes("CLICKED")
        ? "blue"
        : "yellow";

  return <span className={`status-badge ${color}`}>{normalized}</span>;
}
