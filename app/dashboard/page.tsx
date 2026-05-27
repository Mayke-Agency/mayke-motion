import Link from "next/link";
import { AlertCircle, BarChart3, Bell, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardCheck, ClipboardList, GraduationCap, Megaphone, ShoppingBag, Users } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CampaignPie, RevenueChart, TopItemsChart } from "@/components/dashboard/Charts";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SetupChecklistCard } from "@/components/dashboard/SetupChecklistCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { completeReminderAction } from "@/lib/actions";
import { businessTypeCopy } from "@/lib/business-config";
import { getDashboardSummary, getJeteDashboardOverview, getSetupChecklistStatus } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireActiveTenant } from "@/server/tenant";

export default async function DashboardPage() {
  const user = await requireActiveTenant("/dashboard");
  const type = user.business.businessType.code;
  const copy = businessTypeCopy[type];
  const summary = await getDashboardSummary(user.business.id, type, user.enabledModules);
  const setupChecklist = await getSetupChecklistStatus(user.business.id);
  const campaignEvents = summary.campaigns.flatMap((campaign) => campaign.events);
  const campaignData = [
    { name: "Sent", value: campaignEvents.filter((event) => event.status === "SENT").length },
    { name: "Opened", value: campaignEvents.filter((event) => event.status === "OPENED").length },
    { name: "Clicked", value: campaignEvents.filter((event) => event.status === "CLICKED").length },
    { name: "Queued", value: campaignEvents.filter((event) => event.status === "QUEUED").length }
  ].filter((item) => item.value > 0);

  if (type === "DANCE_STUDIO") {
    const jete = await getJeteDashboardOverview(user.business.id);

    return (
      <>
        <PageHeader
          eyebrow="Jete operating view"
          title={`Good to see you, ${user.name.split(" ")[0]}.`}
          description="A daily command center for registrations, family follow-up, class enrollment, attendance, and recital-ready communication."
          action={<span className="role-badge">{user.role.replace("_", " ").toLowerCase()}</span>}
        />

        <div className="panel hero-panel education" style={{ marginBottom: 16 }}>
          <div>
            <p className="eyebrow" style={{ color: "rgba(255,255,255,0.76)" }}>Jete Dance Center</p>
            <h2>Families, classes, attendance, and communication in one rhythm.</h2>
            <p>Use this dashboard to review new registrations, keep families moving through enrollment, and stay ahead of upcoming studio moments.</p>
          </div>
          <div className="hero-stat">
            <strong>{jete.activeStudents}</strong>
            <span>active students enrolled across {jete.classes.length} classes</span>
          </div>
        </div>

        {setupChecklist ? <div style={{ marginBottom: 16 }}><SetupChecklistCard {...setupChecklist} /></div> : null}

        <div className="grid cols-4" style={{ marginBottom: 16 }}>
          <MetricCard icon={ClipboardList} label="New registrations" value={jete.newRegistrations.toString()} delta="Needs first review" />
          <MetricCard icon={GraduationCap} label="Pending reviews" value={jete.pendingReviews.toString()} delta="Registration pipeline" />
          <MetricCard icon={CircleDollarSign} label="Paid / unpaid" value={`${jete.paidRegistrations}/${jete.unpaidRegistrations}`} delta="Payment readiness" />
          <MetricCard icon={Users} label="Families" value={jete.families.toString()} delta="Converted profiles" />
        </div>

        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            <div>
              <h2>Quick actions</h2>
              <p>Most-used Jete workflows for internal pilot testing.</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="button-row">
              <Link className="button" href="/dashboard/registrations">New registration form</Link>
              <Link className="button secondary" href="/dashboard/announcements">Send announcement</Link>
              <Link className="button secondary" href="/dashboard/classes">View classes</Link>
              <Link className="button secondary" href="/dashboard/customers?segment=event-recital-interest">View families</Link>
            </div>
          </div>
        </section>

        <div className="grid cols-3" style={{ marginBottom: 16 }}>
          <section className="panel" style={{ gridColumn: "span 2" }}>
            <div className="panel-header">
              <div>
                <h2>Registration pipeline</h2>
                <p>Recent student submissions and payment state.</p>
              </div>
              <ClipboardList size={20} />
            </div>
            <div className="panel-body table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {jete.registrations.length ? (
                    jete.registrations.slice(0, 6).map((registration) => (
                      <tr key={registration.id}>
                        <td>
                          <Link className="table-link" href={`/dashboard/registrations/${registration.id}`}>
                            {registration.studentFirstName} {registration.studentLastName}
                          </Link>
                        </td>
                        <td>{registration.studioClass?.className ?? registration.classInterest}</td>
                        <td><StatusBadge status={registration.status} /></td>
                        <td><StatusBadge status={registration.paymentStatus} /></td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow columns={4} message="No registrations yet." />
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Attendance</h2>
                <p>Last 14 days of marked attendance.</p>
              </div>
              <ClipboardCheck size={20} />
            </div>
            <div className="panel-body">
              <div className="tag-row">
                <span>present · {jete.attendanceSummary.present}</span>
                <span>absent · {jete.attendanceSummary.absent}</span>
                <span>late · {jete.attendanceSummary.late}</span>
                <span>excused · {jete.attendanceSummary.excused}</span>
              </div>
              <Link className="button secondary" href="/dashboard/attendance" style={{ marginTop: 16 }}>Open attendance</Link>
            </div>
          </section>
        </div>

        <div className="grid cols-3" style={{ marginBottom: 16 }}>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Upcoming events</h2>
                <p>Recital, class, and studio moments.</p>
              </div>
              <CalendarDays size={20} />
            </div>
            <div className="panel-body">
              {jete.upcomingEvents.length ? (
                <div className="timeline-list">
                  {jete.upcomingEvents.map((event) => (
                    <article className="timeline-item" key={event.id}>
                      <div>
                        <strong>{event.title}</strong>
                        <StatusBadge status={event.type} />
                      </div>
                      <p>{formatDate(event.startsAt)} · {event.studioClass?.className ?? event.audience}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No upcoming events" description="Add recital dates or parent reminders from Events." />
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Follow-up reminders</h2>
                <p>Outstanding reminders for families.</p>
              </div>
              <Bell size={20} />
            </div>
            <div className="panel-body">
              {jete.reminders.length ? (
                <div className="timeline-list">
                  {jete.reminders.map((reminder) => (
                    <article className="timeline-item" key={reminder.id}>
                      <div>
                        <strong>{reminder.title}</strong>
                        <StatusBadge status={reminder.dueAt < new Date() ? "OVERDUE" : reminder.status} />
                      </div>
                      <p>{reminder.customer?.name ?? reminder.inquiry?.subject ?? reminder.message?.subject ?? "Follow-up"} · {formatDate(reminder.dueAt)}</p>
                      <StatefulForm action={completeReminderAction} className="button-row">
                        <input type="hidden" name="reminderId" value={reminder.id} />
                        <SubmitButton className="button ghost"><CheckCircle2 size={16} />Mark complete</SubmitButton>
                      </StatefulForm>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No pending reminders" description="Follow-up reminders will appear here." />
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Recent communication</h2>
                <p>Latest family follow-ups and announcements.</p>
              </div>
              <Megaphone size={20} />
            </div>
            <div className="panel-body">
              {jete.communication.length ? (
                <div className="timeline-list">
                  {jete.communication.map((item) => (
                    <article className="timeline-item" key={item.id}>
                      <div>
                        <strong>{item.subject}</strong>
                        <StatusBadge status={item.status} />
                      </div>
                      <p>{item.customer?.name ?? item.toEmail} · {formatDate(item.sentAt ?? item.createdAt)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="No recent communication" description="Sent announcements and follow-ups will appear here." />
              )}
            </div>
          </section>
        </div>

        <ActivityFeed items={summary.activity} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`${copy.label} workspace`}
        title={`Good to see you, ${user.name.split(" ")[0]}.`}
        description={`${user.business.name} is set up with a business-type dashboard for customers, ${copy.inquiryLabel.toLowerCase()}, ${copy.salesLabel.toLowerCase()}, and marketing performance.`}
        action={<span className="role-badge">{user.role.replace("_", " ").toLowerCase()}</span>}
      />

      <div className={`panel hero-panel ${type === "RETAIL" ? "retail" : ""}`} style={{ marginBottom: 16 }}>
        <div>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.76)" }}>
            Live operating view
          </p>
          <h2>{copy.heroLine}</h2>
          <p>
            Mayke Motion adapts the workspace around {copy.operatingFocus} while keeping a shared operating backbone for
            communication, insight, and retention.
          </p>
        </div>
        <div className="hero-stat">
          <strong>{formatCurrency(summary.revenue)}</strong>
          <span>{copy.revenueLabel} tracked from demo sales</span>
        </div>
      </div>

      {setupChecklist ? <div style={{ marginBottom: 16 }}><SetupChecklistCard {...setupChecklist} /></div> : null}

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <MetricCard icon={CircleDollarSign} label={copy.revenueLabel} value={formatCurrency(summary.revenue)} delta="+12.4%" />
        <MetricCard icon={Users} label={`${copy.noun} in CRM`} value={summary.customerCount.toString()} delta="+8 this month" />
        <MetricCard icon={ClipboardList} label="Open inquiries" value={summary.openInquiries.toString()} delta="Needs attention" />
        <MetricCard icon={ShoppingBag} label={copy.primaryCatalogLabel} value={summary.catalogCount.toString()} delta="Active catalog" />
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2>Priority alerts</h2>
            <p>The most important items for {user.business.name} right now.</p>
          </div>
          <AlertCircle size={20} />
        </div>
        <div className="panel-body">
          {summary.alerts.length ? (
            <div className="alert-list">
              {summary.alerts.map((alert) => (
                <Link className="alert-item" href={alert.href} key={alert.id}>
                  <span className="role-badge">{alert.label}</span>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Everything looks caught up." description="New alerts will appear here when something needs attention." />
          )}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2>Follow-up reminders</h2>
            <p>Upcoming and overdue reminders for {user.business.name}.</p>
          </div>
          <Bell size={20} />
        </div>
        <div className="panel-body">
          {summary.reminders.length ? (
            <div className="timeline-list">
              {summary.reminders.map((reminder) => {
                const overdue = reminder.dueAt < new Date();
                const relatedLabel = reminder.customer?.name ?? reminder.inquiry?.subject ?? reminder.message?.subject ?? "Follow-up";

                return (
                  <article className="timeline-item" key={reminder.id}>
                    <div>
                      <strong>{reminder.title}</strong>
                      <StatusBadge status={overdue ? "OVERDUE" : reminder.status} />
                    </div>
                    <p>
                      {relatedLabel} · Due {formatDate(reminder.dueAt)}
                    </p>
                    <StatefulForm action={completeReminderAction} className="button-row">
                      <input type="hidden" name="reminderId" value={reminder.id} />
                      <SubmitButton className="button ghost">
                        <CheckCircle2 size={16} />
                        Mark complete
                      </SubmitButton>
                    </StatefulForm>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No pending reminders" description="Create reminders from customer, inquiry, or message detail pages." />
          )}
        </div>
      </section>

      <div className="grid cols-2" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Revenue motion</h2>
              <p>Monthly revenue trend with demo data prepared for Stripe, Shopify, Toast, or Square syncs.</p>
            </div>
            <BarChart3 size={20} />
          </div>
          <div className="panel-body">
            <RevenueChart data={summary.revenueData} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{type === "RESTAURANT" ? "Popular menu items" : "Top product signals"}</h2>
              <p>
                {type === "RESTAURANT"
                  ? "Popularity score by menu item."
                  : "Demand proxy based on inventory movement."}
              </p>
            </div>
          </div>
          <div className="panel-body">
            <TopItemsChart data={summary.topItems} />
          </div>
        </section>
      </div>

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Latest inquiries</h2>
              <p>Front-of-house, ecommerce, catering, and support signals in one queue.</p>
            </div>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {summary.inquiries.length ? (
                  summary.inquiries.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>
                        <Link className="table-link" href={`/dashboard/inquiries/${inquiry.id}`}>
                          {inquiry.subject}
                        </Link>
                      </td>
                      <td>{inquiry.customer?.name ?? inquiry.leadName ?? inquiry.leadEmail ?? "New lead"}</td>
                      <td>{inquiry.kind.toLowerCase().replace("_", " ")}</td>
                      <td>
                        <StatusBadge status={inquiry.status} />
                      </td>
                      <td>{formatDate(inquiry.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={5} message="No inquiries have been captured yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Campaign pulse</h2>
              <p>Email and SMS readiness.</p>
            </div>
            <Megaphone size={20} />
          </div>
          <div className="panel-body">
            {campaignData.length ? (
              <CampaignPie data={campaignData} />
            ) : (
              <EmptyState title="No campaign events" description="Campaign engagement appears after a campaign is scheduled or sent." />
            )}
          </div>
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <ActivityFeed items={summary.activity} />
      </div>
    </>
  );
}
