type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function EmptyTableRow({ columns, message }: { columns: number; message: string }) {
  return (
    <tr>
      <td colSpan={columns}>
        <div className="empty-table">{message}</div>
      </td>
    </tr>
  );
}
