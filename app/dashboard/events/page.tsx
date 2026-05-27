import Link from "next/link";
import { Archive, CalendarDays, GraduationCap, Plus } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { archiveEventAction, saveEventAction } from "@/lib/event-actions";
import { getActiveEvents, getStudioClasses } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

function datetimeInputValue(value?: Date | null) {
  if (!value) return "";
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default async function EventsPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return (
      <>
        <PageHeader eyebrow="Programs" title="Events" description="Education events are enabled for dance studio and learning clients." />
        <EmptyState title="Not enabled for this business type" description="Use the catalog module configured for this workspace." />
      </>
    );
  }

  const [events, classes] = await Promise.all([getActiveEvents(user.business.id), getStudioClasses(user.business.id)]);
  const editingEvent = events.find((event) => event.id === params.edit);

  return (
    <>
      <PageHeader
        eyebrow="Education operations"
        title="Classes and events"
        description="Track classes, recital deadlines, workshops, and parent communication moments."
      />

      <div className="grid cols-3">
      <section className="panel" style={{ gridColumn: "span 2" }}>
        <div className="panel-header">
          <div>
            <h2>Program calendar</h2>
            <p>{events.length} education events and registration moments.</p>
          </div>
          <GraduationCap size={20} />
        </div>
        <div className="panel-body table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Type</th>
                <th>Date</th>
                <th>Audience</th>
                <th>Class</th>
                <th>Capacity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events.length ? (
                events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.title}</strong>
                      <div style={{ color: "var(--muted)", marginTop: 4 }}>{event.location ?? "Studio"} · {event.description ?? "No description"}</div>
                    </td>
                    <td>
                      <StatusBadge status={event.type} />
                    </td>
                    <td>{formatDate(event.startsAt)}</td>
                    <td>{event.audience}</td>
                    <td>{event.studioClass?.className ?? "Studio-wide"}</td>
                    <td>{event.capacity ?? "Open"}</td>
                    <td>
                      <div className="button-row">
                        <Link className="button ghost" href={`/dashboard/events?edit=${event.id}`}>
                          Edit
                        </Link>
                        <StatefulForm action={archiveEventAction} className="">
                          <input type="hidden" name="eventId" value={event.id} />
                          <SubmitButton className="button ghost">
                            <Archive size={14} />
                            Archive
                          </SubmitButton>
                        </StatefulForm>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyTableRow columns={7} message="No education events have been added yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{editingEvent ? "Edit event" : "Create event"}</h2>
            <p>Recitals, workshops, parent dates, and class-specific reminders.</p>
          </div>
          <Plus size={20} />
        </div>
        <div className="panel-body">
          <StatefulForm action={saveEventAction}>
            {editingEvent ? <input type="hidden" name="eventId" value={editingEvent.id} /> : null}
            <div className="field">
              <label htmlFor="title">Title</label>
              <input className="input" id="title" name="title" defaultValue={editingEvent?.title ?? ""} required />
            </div>
            <div className="field">
              <label htmlFor="type">Type</label>
              <select className="select" id="type" name="type" defaultValue={editingEvent?.type ?? "RECITAL"}>
                <option value="CLASS">Class</option>
                <option value="RECITAL">Recital</option>
                <option value="PROMOTION">Promotion</option>
                <option value="PRIVATE_EVENT">Private event</option>
                <option value="CAMPAIGN">Campaign</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="startsAt">Date/time</label>
              <input className="input" id="startsAt" name="startsAt" type="datetime-local" defaultValue={datetimeInputValue(editingEvent?.startsAt)} required />
            </div>
            <div className="field">
              <label htmlFor="location">Location</label>
              <input className="input" id="location" name="location" defaultValue={editingEvent?.location ?? ""} placeholder="Main studio" />
            </div>
            <div className="field">
              <label htmlFor="classId">Related class</label>
              <select className="select" id="classId" name="classId" defaultValue={editingEvent?.classId ?? ""}>
                <option value="">Studio-wide</option>
                {classes.map((studioClass) => (
                  <option value={studioClass.id} key={studioClass.id}>{studioClass.className}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="audience">Audience</label>
              <select className="select" id="audience" name="audience" defaultValue={editingEvent?.audience ?? "All families"}>
                <option>All families</option>
                <option>Active students</option>
                <option>Waitlisted students</option>
                <option>Unpaid families</option>
                <option>Selected class families</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="capacity">Capacity</label>
              <input className="input" id="capacity" name="capacity" type="number" min="0" defaultValue={editingEvent?.capacity ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea className="textarea" id="description" name="description" defaultValue={editingEvent?.description ?? ""} />
            </div>
            <SubmitButton>{editingEvent ? "Save event" : "Create event"}</SubmitButton>
          </StatefulForm>
        </div>
      </section>
      </div>

      <div className="notice" style={{ marginTop: 16 }}>
        <CalendarDays size={18} />
        <span>Use Announcements to email reminders for upcoming recitals, class deadlines, and family updates.</span>
      </div>
    </>
  );
}
