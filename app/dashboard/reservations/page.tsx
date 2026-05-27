import { CalendarDays } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getReservations } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function ReservationsPage() {
  const user = await requireBusinessUser();

  if (user.business.businessType.code !== "RESTAURANT") {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Reservations" description="Reservation workflows are enabled for restaurant and hospitality clients." />
        <EmptyState title="Not enabled for this business type" description="Mayke can enable a business-specific operations module for this workspace." />
      </>
    );
  }

  const reservations = await getReservations(user.business.id);

  return (
    <>
      <PageHeader
        eyebrow="Hospitality operations"
        title="Reservations"
        description="Track reservation, private dining, and service requests before Toast, Square, or booking integrations connect."
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Reservation queue</h2>
            <p>{reservations.length} upcoming reservation records.</p>
          </div>
          <CalendarDays size={20} />
        </div>
        <div className="panel-body table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Party</th>
                <th>Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length ? (
                reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>{reservation.customer?.name ?? "Guest"}</td>
                    <td>{reservation.partySize}</td>
                    <td>{formatDate(reservation.requestedFor)}</td>
                    <td>
                      <StatusBadge status={reservation.status} />
                    </td>
                    <td>{reservation.notes ?? "No notes"}</td>
                  </tr>
                ))
              ) : (
                <EmptyTableRow columns={5} message="No reservations have been logged yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
