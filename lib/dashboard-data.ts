import "server-only";

import type { BusinessTypeCode, InquiryStatus, ModuleKey } from "@prisma/client";
import { isModuleEnabled } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

const inquiryStatuses = new Set(["NEW", "IN_PROGRESS", "FOLLOWED_UP", "CLOSED"]);
const markedDemoTextFilters = [
  { equals: "demo", mode: "insensitive" as const },
  { equals: "test", mode: "insensitive" as const },
  { startsWith: "demo ", mode: "insensitive" as const },
  { startsWith: "test ", mode: "insensitive" as const },
  { startsWith: "demo-", mode: "insensitive" as const },
  { startsWith: "test-", mode: "insensitive" as const },
  { contains: " demo ", mode: "insensitive" as const },
  { contains: " test ", mode: "insensitive" as const },
  { contains: "[demo]", mode: "insensitive" as const },
  { contains: "[test]", mode: "insensitive" as const }
];

export type SetupChecklistItem = {
  key: string;
  label: string;
  detail: string;
  href: string;
  complete: boolean;
};

export const launchReadinessItems = [
  { key: "profile", label: "Business profile complete" },
  { key: "modules", label: "Modules enabled" },
  { key: "provisioned", label: "Workspace provisioned" },
  { key: "email", label: "Email configured" },
  { key: "stripe", label: "Stripe configured if payments are enabled" },
  { key: "staff", label: "Staff invited" },
  { key: "contact", label: "Test contact added" },
  { key: "message", label: "Test message sent" },
  { key: "payment", label: "Test payment completed if payments are enabled" },
  { key: "demoDataRemoved", label: "Demo data removed" }
] as const;

function checklistOverrides(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const items = "items" in value ? (value as { items?: unknown }).items : value;
  if (!items || typeof items !== "object" || Array.isArray(items)) return {};
  return items as Record<string, boolean>;
}

function buildLaunchReadiness(input: {
  business: {
    name: string;
    contactEmail: string | null;
    address: string | null;
    stripeAccountId: string | null;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    emailSenderEmail: string | null;
    emailDomain: string | null;
    launchChecklist: unknown;
    launchNotes: string | null;
    launchStatus: string;
    modules: { key: ModuleKey; enabled: boolean }[];
    users: { id: string }[];
    userInvites: { id: string }[];
    _count: { customers: number };
  };
  paidPaymentCount: number;
  demoCleanupComplete: boolean;
  paymentsEnabled: boolean;
  provisioned: boolean;
  sentMessageCount: number;
}) {
  const manual = checklistOverrides(input.business.launchChecklist);
  const enabledModules = input.business.modules.filter((module) => module.enabled);
  const computed: Record<(typeof launchReadinessItems)[number]["key"], { complete: boolean; detail: string }> = {
    profile: {
      complete: Boolean(input.business.name && input.business.contactEmail && input.business.address),
      detail: input.business.contactEmail && input.business.address ? "Business profile has contact and location details." : "Missing contact or location detail."
    },
    modules: {
      complete: enabledModules.length > 0,
      detail: `${enabledModules.length} enabled module${enabledModules.length === 1 ? "" : "s"}.`
    },
    provisioned: {
      complete: input.provisioned,
      detail: input.provisioned ? "Workspace defaults have been generated." : "Provisioning activity has not been recorded."
    },
    email: {
      complete: Boolean(input.business.emailSenderEmail && input.business.emailDomain),
      detail: input.business.emailSenderEmail ?? "Sender/domain setup is not complete."
    },
    stripe: {
      complete: !input.paymentsEnabled || Boolean(input.business.stripeAccountId && input.business.stripeChargesEnabled && input.business.stripePayoutsEnabled),
      detail: input.paymentsEnabled ? input.business.stripeAccountId ?? "Payments are enabled but Stripe is not ready." : "No payment collection required."
    },
    staff: {
      complete: input.business.users.length > 1 || input.business.userInvites.length > 0,
      detail: input.business.users.length > 1 || input.business.userInvites.length ? "Team access has started." : "No staff user or invite yet."
    },
    contact: {
      complete: input.business._count.customers > 0,
      detail: `${input.business._count.customers} CRM contact${input.business._count.customers === 1 ? "" : "s"} on file.`
    },
    message: {
      complete: input.sentMessageCount > 0,
      detail: `${input.sentMessageCount} sent follow-up message${input.sentMessageCount === 1 ? "" : "s"}.`
    },
    payment: {
      complete: !input.paymentsEnabled || input.paidPaymentCount > 0,
      detail: input.paymentsEnabled ? `${input.paidPaymentCount} paid Stripe payment record${input.paidPaymentCount === 1 ? "" : "s"}.` : "No payment collection required."
    },
    demoDataRemoved: {
      complete: input.demoCleanupComplete,
      detail: input.demoCleanupComplete ? "Demo cleanup has been completed or confirmed." : "Run demo cleanup or confirm no marked demo records remain."
    }
  };
  const items = launchReadinessItems.map((item) => ({
    ...item,
    complete: typeof manual[item.key] === "boolean" ? manual[item.key] : computed[item.key].complete,
    computedComplete: computed[item.key].complete,
    detail: computed[item.key].detail
  }));

  return {
    items,
    completedCount: items.filter((item) => item.complete).length,
    notes: input.business.launchNotes ?? "",
    paymentsEnabled: input.paymentsEnabled,
    status: input.business.launchStatus,
    totalCount: items.length
  };
}

function buildSetupChecklistStatus(input: {
  business: {
    id: string;
    name: string;
    contactEmail: string | null;
    address: string | null;
    stripeAccountId: string | null;
    stripeChargesEnabled: boolean;
    stripePayoutsEnabled: boolean;
    emailSenderEmail: string | null;
    emailDomain: string | null;
    modules: { enabled: boolean }[];
    users: { id: string }[];
    userInvites: { id: string }[];
    _count: { customers: number };
  };
}) {
  const { business } = input;
  const enabledModuleCount = business.modules.filter((module) => module.enabled).length;
  const items: SetupChecklistItem[] = [
    {
      key: "profile",
      label: "Business profile complete",
      detail: business.contactEmail && business.address ? business.name : "Add contact and location details.",
      href: "/dashboard/settings",
      complete: Boolean(business.name && business.contactEmail && business.address)
    },
    {
      key: "modules",
      label: "Modules selected",
      detail: `${enabledModuleCount} enabled module${enabledModuleCount === 1 ? "" : "s"}.`,
      href: "/dashboard/integrations",
      complete: enabledModuleCount > 0
    },
    {
      key: "stripe",
      label: "Stripe connected",
      detail: business.stripeAccountId ? "Stripe Express onboarding has started." : "Connect Stripe when payments are needed.",
      href: "/onboarding/setup",
      complete: Boolean(business.stripeAccountId && business.stripeChargesEnabled && business.stripePayoutsEnabled)
    },
    {
      key: "email",
      label: "Email configured",
      detail: business.emailSenderEmail && business.emailDomain ? `${business.emailSenderEmail} · ${business.emailDomain}` : "Add a sender and sending domain.",
      href: "/onboarding/setup",
      complete: Boolean(business.emailSenderEmail && business.emailDomain)
    },
    {
      key: "staff",
      label: "Staff invited",
      detail: business.users.length > 1 || business.userInvites.length ? "Team access has started." : "Invite staff when the client team is ready.",
      href: "/dashboard/settings",
      complete: business.users.length > 1 || business.userInvites.length > 0
    },
    {
      key: "contacts",
      label: "First contact/import added",
      detail: business._count.customers ? `${business._count.customers} CRM contact${business._count.customers === 1 ? "" : "s"} added.` : "Add or import the first CRM contact.",
      href: "/dashboard/customers",
      complete: business._count.customers > 0
    }
  ];
  const completedCount = items.filter((item) => item.complete).length;

  return {
    items,
    completedCount,
    totalCount: items.length,
    percent: Math.round((completedCount / items.length) * 100),
    complete: completedCount === items.length
  };
}

export function demoCustomerWhere(businessId: string) {
  return {
    businessId,
    OR: [
      ...markedDemoTextFilters.map((filter) => ({ name: filter })),
      ...markedDemoTextFilters.map((filter) => ({ email: filter })),
      ...markedDemoTextFilters.map((filter) => ({ source: filter })),
      ...markedDemoTextFilters.map((filter) => ({ segment: filter })),
      ...markedDemoTextFilters.map((filter) => ({ notes: filter })),
      { tags: { hasSome: ["demo", "test", "Demo", "Test"] } }
    ]
  };
}

export function demoInquiryWhere(businessId: string) {
  return {
    businessId,
    OR: [
      ...markedDemoTextFilters.map((filter) => ({ subject: filter })),
      ...markedDemoTextFilters.map((filter) => ({ message: filter })),
      ...markedDemoTextFilters.map((filter) => ({ source: filter })),
      ...markedDemoTextFilters.map((filter) => ({ leadName: filter })),
      ...markedDemoTextFilters.map((filter) => ({ leadEmail: filter }))
    ]
  };
}

export function demoCampaignWhere(businessId: string) {
  return {
    businessId,
    OR: [
      ...markedDemoTextFilters.map((filter) => ({ name: filter })),
      ...markedDemoTextFilters.map((filter) => ({ subject: filter })),
      ...markedDemoTextFilters.map((filter) => ({ body: filter })),
      ...markedDemoTextFilters.map((filter) => ({ audience: filter }))
    ]
  };
}

export function demoRegistrationWhere(businessId: string) {
  return {
    businessId,
    OR: [
      ...markedDemoTextFilters.map((filter) => ({ referralSource: filter })),
      ...markedDemoTextFilters.map((filter) => ({ referralName: filter })),
      ...markedDemoTextFilters.map((filter) => ({ familyLastName: filter })),
      ...markedDemoTextFilters.map((filter) => ({ contact1Email: filter })),
      ...markedDemoTextFilters.map((filter) => ({ studentFirstName: filter })),
      ...markedDemoTextFilters.map((filter) => ({ studentLastName: filter })),
      ...markedDemoTextFilters.map((filter) => ({ notes: filter }))
    ]
  };
}

export function demoPaymentWhere(businessId: string) {
  return {
    businessId,
    OR: [...markedDemoTextFilters.map((filter) => ({ source: filter })), ...markedDemoTextFilters.map((filter) => ({ note: filter }))]
  };
}

export function demoActivityLogWhere(businessId: string) {
  return {
    businessId,
    OR: [...markedDemoTextFilters.map((filter) => ({ actor: filter })), ...markedDemoTextFilters.map((filter) => ({ action: filter })), ...markedDemoTextFilters.map((filter) => ({ entity: filter }))]
  };
}

export async function getDemoDataCleanupStatus(businessId: string) {
  const [contacts, inquiries, campaigns, registrations, payments, activityLogs] = await Promise.all([
    prisma.customer.count({ where: demoCustomerWhere(businessId) }),
    prisma.inquiry.count({ where: demoInquiryWhere(businessId) }),
    prisma.campaign.count({ where: demoCampaignWhere(businessId) }),
    prisma.registrationSubmission.count({ where: demoRegistrationWhere(businessId) }),
    prisma.paymentRecord.count({ where: demoPaymentWhere(businessId) }),
    prisma.activityLog.count({ where: demoActivityLogWhere(businessId) })
  ]);

  return {
    contacts,
    inquiries,
    campaigns,
    registrations,
    payments,
    activityLogs,
    total: contacts + inquiries + campaigns + registrations + payments + activityLogs
  };
}

export async function getSetupChecklistStatus(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      modules: { select: { enabled: true } },
      users: { select: { id: true } },
      userInvites: { select: { id: true } },
      _count: { select: { customers: true } }
    }
  });

  if (!business) return null;

  return buildSetupChecklistStatus({ business });
}

export async function getDashboardSummary(businessId: string, type: BusinessTypeCode, enabledModuleKeys?: ModuleKey[]) {
  const [customers, inquiries, sales, campaigns, activity, reminders, catalogCount, events] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.inquiry.findMany({
      where: { businessId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.sale.findMany({
      where: { businessId },
      include: { saleItems: true, customer: true },
      orderBy: { placedAt: "desc" }
    }),
    prisma.campaign.findMany({
      where: { businessId },
      include: { events: true },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.activityLog.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.reminder.findMany({
      where: {
        businessId,
        status: "PENDING"
      },
      include: {
        customer: {
          select: {
            name: true
          }
        },
        inquiry: {
          select: {
            subject: true
          }
        },
        message: {
          select: {
            subject: true
          }
        }
      },
      orderBy: { dueAt: "asc" },
      take: 6
    }),
    type === "RESTAURANT"
      ? prisma.menuItem.count({ where: { businessId } })
      : type === "DANCE_STUDIO"
        ? prisma.event.count({ where: { businessId } })
        : prisma.product.count({ where: { businessId } }),
    type === "DANCE_STUDIO"
      ? prisma.event.findMany({
          where: {
            businessId,
            startsAt: {
              gte: new Date()
            }
          },
          orderBy: {
            startsAt: "asc"
          },
          take: 3
        })
      : Promise.resolve([])
  ]);

  const revenue = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const openInquiries = await prisma.inquiry.count({
    where: {
      businessId,
      status: {
        in: ["NEW", "IN_PROGRESS"]
      }
    }
  });

  const revenueData = Array.from({ length: 6 }).map((_, index) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - index));
    const label = month.toLocaleString("en-US", { month: "short" });
    const revenueForMonth = sales
      .filter((sale) => sale.placedAt.getMonth() === month.getMonth())
      .reduce((sum, sale) => sum + Number(sale.total), 0);

    return {
      label,
      revenue: Math.round(revenueForMonth || revenue * (0.08 + index * 0.045))
    };
  });

  const topItems = await getTopItems(businessId, type);
  const staleTouchDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 21);
  const contactsNeedingFollowUp = await prisma.customer.count({
    where: {
      businessId,
      OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: staleTouchDate } }]
    }
  });
  const newInquiryCount = inquiries.filter((inquiry) => inquiry.status === "NEW").length;
  const draftCampaigns = campaigns.filter((campaign) => campaign.status === "DRAFT" || campaign.status === "READY");
  const failedEmailCount = campaigns.flatMap((campaign) => campaign.events).filter((event) => event.status === "FAILED").length;
  const highValueSale = sales.find((sale) => Number(sale.total) >= 500);
  const alertCandidates = [
    ...(newInquiryCount
      ? [
          {
            id: "new-inquiries",
            label: "Inquiry",
            title: `${newInquiryCount} new ${newInquiryCount === 1 ? "inquiry" : "inquiries"} need review`,
            description: "Reply quickly while interest is fresh.",
            href: "/dashboard/inquiries?status=NEW"
          }
        ]
      : []),
    ...(contactsNeedingFollowUp
      ? [
          {
            id: "needs-follow-up",
            label: "CRM",
            title: `${contactsNeedingFollowUp} ${contactsNeedingFollowUp === 1 ? "contact needs" : "contacts need"} follow-up`,
            description: "Use CRM segments to revive stale conversations.",
            href: "/dashboard/customers?segment=needs-follow-up"
          }
        ]
      : []),
    ...(draftCampaigns.length
      ? [
          {
            id: "campaign-drafts",
            label: "Marketing",
            title: `${draftCampaigns.length} unsent campaign ${draftCampaigns.length === 1 ? "draft" : "drafts"}`,
            description: "Review ready messages before they go out.",
            href: "/dashboard/marketing"
          }
        ]
      : []),
    ...(failedEmailCount
      ? [
          {
            id: "failed-email",
            label: "Email",
            title: `${failedEmailCount} failed campaign ${failedEmailCount === 1 ? "send" : "sends"}`,
            description: "Check sender/domain setup or recipient addresses.",
            href: "/dashboard/marketing"
          }
        ]
      : []),
    ...(highValueSale
      ? [
          {
            id: "high-value-order",
            label: "Revenue",
            title: `Recent ${formatNumberAsCurrency(Number(highValueSale.total))} order`,
            description: "High-value activity is ready for follow-up or retention.",
            href: "/dashboard/sales"
          }
        ]
      : []),
    ...events.map((event) => ({
      id: `event-${event.id}`,
      label: "Event",
      title: `${event.title} is coming up`,
      description: event.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      href: "/dashboard/events"
    }))
  ];
  const enabledModules = enabledModuleKeys ? new Set(enabledModuleKeys) : null;
  const alerts = alertCandidates.filter((alert) => !enabledModules || isModuleEnabled(enabledModules, alert.href)).slice(0, 6);

  return {
    customers: customers.slice(0, 5),
    inquiries,
    sales: sales.slice(0, 6),
    campaigns,
    activity,
    reminders,
    catalogCount,
    revenue,
    openInquiries,
    customerCount: await prisma.customer.count({ where: { businessId } }),
    orderCount: sales.length,
    revenueData,
    topItems,
    alerts
  };
}

export async function getJeteDashboardOverview(businessId: string) {
  const now = new Date();
  const [registrations, activeEnrollments, upcomingEvents, attendance, reminders, communication, classes, families] = await Promise.all([
    prisma.registrationSubmission.findMany({
      where: { businessId },
      include: { form: true, studioClass: true, familyProfile: true },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.classEnrollment.findMany({
      where: { businessId, status: "ACTIVE" },
      include: { studentProfile: true, studioClass: true },
      orderBy: { enrolledAt: "desc" },
      take: 8
    }),
    prisma.event.findMany({
      where: { businessId, archivedAt: null, startsAt: { gte: now } },
      include: { studioClass: true },
      orderBy: { startsAt: "asc" },
      take: 5
    }),
    prisma.attendanceRecord.findMany({
      where: {
        businessId,
        classDate: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)
        }
      },
      include: { studioClass: true, studentProfile: true },
      orderBy: { classDate: "desc" },
      take: 20
    }),
    prisma.reminder.findMany({
      where: { businessId, status: "PENDING" },
      include: {
        customer: { select: { name: true } },
        inquiry: { select: { subject: true } },
        message: { select: { subject: true } }
      },
      orderBy: { dueAt: "asc" },
      take: 5
    }),
    prisma.followUpEmail.findMany({
      where: { businessId },
      include: { customer: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.studioClass.findMany({
      where: { businessId, archivedAt: null },
      include: { enrollments: { select: { status: true } } },
      orderBy: { className: "asc" },
      take: 6
    }),
    prisma.familyProfile.count({ where: { businessId } })
  ]);

  return {
    registrations,
    newRegistrations: registrations.filter((registration) => registration.status === "NEW").length,
    pendingReviews: registrations.filter((registration) => ["NEW", "REVIEWED", "CONTACTED"].includes(registration.status)).length,
    paidRegistrations: registrations.filter((registration) => registration.paymentStatus === "PAID").length,
    unpaidRegistrations: registrations.filter((registration) => registration.paymentStatus !== "PAID").length,
    activeEnrollments,
    activeStudents: activeEnrollments.length,
    upcomingEvents,
    attendance,
    attendanceSummary: {
      present: attendance.filter((record) => record.status === "PRESENT").length,
      absent: attendance.filter((record) => record.status === "ABSENT").length,
      late: attendance.filter((record) => record.status === "LATE").length,
      excused: attendance.filter((record) => record.status === "EXCUSED").length
    },
    reminders,
    communication,
    classes,
    families
  };
}

function formatNumberAsCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export async function getTopItems(businessId: string, type: BusinessTypeCode) {
  if (type === "RESTAURANT") {
    const items = await prisma.menuItem.findMany({
      where: { businessId },
      orderBy: { popularityScore: "desc" },
      take: 5
    });

    return items.map((item) => ({
      name: item.name,
      value: item.popularityScore
    }));
  }

  if (type === "DANCE_STUDIO") {
    const events = await prisma.event.findMany({
      where: { businessId },
      orderBy: [{ registrations: "desc" }, { startsAt: "asc" }],
      take: 5
    });

    return events.map((event) => ({
      name: event.title,
      value: event.registrations
    }));
  }

  const items = await prisma.product.findMany({
    where: { businessId },
    orderBy: [{ inventory: "asc" }, { createdAt: "desc" }],
    take: 5
  });

  return items.map((item) => ({
    name: item.name,
    value: Math.max(1, 100 - item.inventory)
  }));
}

export async function getCustomers(businessId: string, query?: string) {
  return prisma.customer.findMany({
    where: {
      businessId,
      OR: query
        ? [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { segment: { contains: query, mode: "insensitive" } },
            { source: { contains: query, mode: "insensitive" } }
          ]
        : undefined
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getInquiries(businessId: string, status?: string) {
  const safeStatus = status && inquiryStatuses.has(status) ? status : undefined;

  return prisma.inquiry.findMany({
    where: {
      businessId,
      status: safeStatus && safeStatus !== "ALL" ? (safeStatus as InquiryStatus) : undefined
    },
    include: {
      customer: true,
      _count: {
        select: {
          notes: true,
          followUps: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getInquiryDetail(businessId: string, inquiryId: string) {
  const inquiry = await prisma.inquiry.findFirst({
    where: {
      id: inquiryId,
      businessId
    },
    include: {
      customer: true,
      notes: {
        include: {
          author: {
            select: {
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      followUps: {
        include: {
          createdBy: {
            select: {
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!inquiry) return null;

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      businessId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 30
  });

  return {
    ...inquiry,
    activityLogs: activityLogs.filter((log) => {
      const metadata = log.metadata;
      if (!metadata || typeof metadata !== "object" || !("inquiryId" in metadata)) return false;
      return (metadata as { inquiryId?: unknown }).inquiryId === inquiryId;
    })
  };
}

export async function getCustomerProfile(businessId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId
    },
    include: {
      inquiries: {
        include: {
          notes: {
            include: {
              author: {
                select: {
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          followUps: {
            orderBy: {
              createdAt: "desc"
            }
          },
          _count: {
            select: {
              notes: true,
              followUps: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      sales: {
        include: {
          saleItems: true
        },
        orderBy: {
          placedAt: "desc"
        }
      },
      followUpEmails: {
        include: {
          inquiry: {
            select: {
              id: true,
              subject: true
            }
          },
          createdBy: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      campaignEvents: {
        include: {
          campaign: {
            select: {
              name: true,
              subject: true,
              audience: true,
              sentAt: true
            }
          }
        },
        orderBy: {
          occurredAt: "desc"
        }
      }
    }
  });

  if (!customer) return null;

  const inquiryIds = customer.inquiries.map((inquiry) => inquiry.id);
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      businessId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 80
  });

  const relatedActivityLogs = activityLogs.filter((log) => {
    const metadata = log.metadata;
    if (!metadata || typeof metadata !== "object") return false;
    const values = metadata as { customerId?: unknown; inquiryId?: unknown };
    return values.customerId === customer.id || (typeof values.inquiryId === "string" && inquiryIds.includes(values.inquiryId));
  });

  const activityTimeline = [
    ...customer.inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry.id}`,
      type: "Inquiry",
      title: inquiry.subject,
      description: `${inquiry.kind.toLowerCase().replaceAll("_", " ")} · ${inquiry.status.toLowerCase().replaceAll("_", " ")}`,
      date: inquiry.createdAt,
      href: `/dashboard/inquiries/${inquiry.id}`
    })),
    ...customer.inquiries.flatMap((inquiry) =>
      inquiry.notes.map((note) => ({
        id: `note-${note.id}`,
        type: "Note",
        title: "Internal note",
        description: `${note.author?.name ?? "Mayke Motion"} · ${note.body}`,
        date: note.createdAt,
        href: `/dashboard/inquiries/${inquiry.id}`
      }))
    ),
    ...customer.followUpEmails.map((followUp) => ({
      id: `follow-up-${followUp.id}`,
      type: "Follow-up",
      title: followUp.subject,
      description: `${followUp.status.toLowerCase()} · ${followUp.inquiry?.subject ?? "Customer profile"}`,
      date: followUp.sentAt ?? followUp.createdAt,
      href: followUp.inquiry ? `/dashboard/inquiries/${followUp.inquiry.id}` : undefined
    })),
    ...customer.campaignEvents.map((event) => ({
      id: `campaign-${event.id}`,
      type: "Campaign",
      title: event.campaign.name,
      description: `${event.status.toLowerCase()} · ${event.campaign.audience} · ${event.campaign.subject}`,
      date: event.occurredAt,
      href: undefined
    })),
    ...relatedActivityLogs.map((log) => ({
      id: `activity-${log.id}`,
      type: log.action.includes("status") ? "Status" : "Activity",
      title: log.action,
      description: `${log.actor} · ${log.entity}`,
      date: log.createdAt,
      href: undefined
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    ...customer,
    activityTimeline
  };
}

export async function getFamilyProfile(businessId: string, familyId: string) {
  return prisma.familyProfile.findFirst({
    where: {
      id: familyId,
      businessId
    },
    include: {
      customer: {
        include: {
          followUpEmails: {
            include: {
              createdBy: {
                select: {
                  name: true
                }
              }
            },
            orderBy: { createdAt: "desc" }
          },
          campaignEvents: {
            include: {
              campaign: {
                select: {
                  name: true,
                  subject: true
                }
              }
            },
            orderBy: { occurredAt: "desc" }
          }
        }
      },
      students: {
        include: {
          enrollments: {
            include: {
              studioClass: true,
              registration: true
            },
            orderBy: [{ status: "asc" }, { enrolledAt: "desc" }]
          },
          attendanceRecords: {
            include: {
              studioClass: true
            },
            orderBy: { classDate: "desc" },
            take: 8
          }
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
      },
      registrations: {
        include: {
          form: true,
          studioClass: true,
          paymentRecords: {
            orderBy: { recordedAt: "desc" },
            take: 3
          },
          internalNotes: {
            include: {
              author: {
                select: {
                  name: true
                }
              }
            },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function getSales(businessId: string) {
  return prisma.sale.findMany({
    where: { businessId },
    include: { customer: true, saleItems: true },
    orderBy: { placedAt: "desc" }
  });
}

export async function getProducts(businessId: string) {
  return prisma.product.findMany({
    where: { businessId },
    orderBy: [{ active: "desc" }, { category: "asc" }]
  });
}

export async function getMenuItems(businessId: string) {
  return prisma.menuItem.findMany({
    where: { businessId },
    orderBy: [{ active: "desc" }, { category: "asc" }]
  });
}

export async function getMarketing(businessId: string) {
  return prisma.campaign.findMany({
    where: { businessId },
    include: { events: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getMessageTemplates(businessId: string) {
  return prisma.messageTemplate.findMany({
    where: { businessId },
    orderBy: [{ type: "asc" }, { name: "asc" }]
  });
}

export async function getNotifications(businessId: string) {
  return prisma.notification.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: 12
  });
}

export async function getIntegrations(businessId: string) {
  return prisma.integration.findMany({
    where: { businessId },
    orderBy: [{ status: "asc" }, { displayName: "asc" }]
  });
}

export async function getModules(businessId: string) {
  return prisma.module.findMany({
    where: { businessId },
    orderBy: [{ enabled: "desc" }, { label: "asc" }]
  });
}

export async function getTeamAccess(businessId: string) {
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      where: { businessId },
      orderBy: [{ role: "asc" }, { name: "asc" }]
    }),
    prisma.userInvite.findMany({
      where: { businessId },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    })
  ]);

  return { users, invites };
}

export async function getReservations(businessId: string) {
  return prisma.reservation.findMany({
    where: { businessId },
    include: { customer: true },
    orderBy: { requestedFor: "asc" }
  });
}

export async function getAnnouncements(businessId: string) {
  return prisma.announcement.findMany({
    where: { businessId },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }]
  });
}

export async function getAttendanceClasses(businessId: string) {
  return prisma.studioClass.findMany({
    where: {
      businessId,
      active: true,
      archivedAt: null
    },
    include: {
      enrollments: {
        where: {
          status: "ACTIVE"
        },
        select: {
          id: true
        }
      }
    },
    orderBy: { className: "asc" }
  });
}

export async function getClassAttendanceSession(businessId: string, classId: string, classDate: Date) {
  return prisma.studioClass.findFirst({
    where: {
      id: classId,
      businessId
    },
    include: {
      enrollments: {
        where: {
          status: "ACTIVE"
        },
        include: {
          studentProfile: {
            include: {
              familyProfile: true
            }
          }
        },
        orderBy: {
          studentProfile: {
            lastName: "asc"
          }
        }
      },
      attendanceRecords: {
        where: {
          classDate
        },
        include: {
          studentProfile: true
        }
      }
    }
  });
}

export async function getEvents(businessId: string) {
  return prisma.event.findMany({
    where: { businessId },
    include: {
      studioClass: true
    },
    orderBy: { startsAt: "asc" }
  });
}

export async function getActiveEvents(businessId: string) {
  return prisma.event.findMany({
    where: { businessId, archivedAt: null },
    include: { studioClass: true },
    orderBy: { startsAt: "asc" }
  });
}

export async function getStudioClasses(businessId: string) {
  return prisma.studioClass.findMany({
    where: { businessId },
    include: {
      enrollments: {
        select: {
          status: true
        }
      },
      _count: {
        select: {
          submissions: true
        }
      }
    },
    orderBy: [{ active: "desc" }, { className: "asc" }]
  });
}

export async function getStudioClassDetail(businessId: string, classId: string) {
  return prisma.studioClass.findFirst({
    where: {
      id: classId,
      businessId
    },
    include: {
      enrollments: {
        include: {
          studentProfile: {
            include: {
              familyProfile: true
            }
          },
          registration: {
            include: {
              form: true,
              paymentRecords: {
                orderBy: { recordedAt: "desc" },
                take: 3
              }
            }
          }
        },
        orderBy: [{ status: "asc" }, { enrolledAt: "desc" }]
      },
      attendanceRecords: {
        orderBy: { classDate: "desc" },
        take: 30
      }
    }
  });
}

export async function getJetePaymentDashboard(businessId: string) {
  const [registrations, paymentRecords] = await Promise.all([
    prisma.registrationSubmission.findMany({
      where: { businessId },
      include: {
        form: true,
        studioClass: true,
        familyProfile: true,
        classEnrollment: {
          include: {
            studentProfile: true,
            studioClass: true
          }
        },
        paymentRecords: {
          orderBy: { recordedAt: "desc" },
          take: 3
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.paymentRecord.findMany({
      where: { businessId },
      include: {
        registration: true,
        familyProfile: true,
        studentProfile: true,
        studioClass: true,
        classEnrollment: true
      },
      orderBy: { recordedAt: "desc" },
      take: 30
    })
  ]);

  return { registrations, paymentRecords };
}

export async function getRegistrationForms(businessId: string) {
  return prisma.registrationForm.findMany({
    where: { businessId },
    include: {
      _count: {
        select: {
          submissions: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getRegistrationSubmissions(businessId: string) {
  return prisma.registrationSubmission.findMany({
    where: { businessId },
    include: {
      form: true,
      studioClass: true,
      customer: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getRegistrationDetail(businessId: string, registrationId: string) {
  return prisma.registrationSubmission.findFirst({
    where: {
      id: registrationId,
      businessId
    },
    include: {
      form: true,
      studioClass: true,
      classEnrollment: {
        include: {
          studentProfile: true,
          studioClass: true
        }
      },
      customer: true,
      familyProfile: {
        include: {
          students: {
            include: {
              enrollments: {
                include: {
                  studioClass: true
                }
              }
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
          }
        }
      },
      business: {
        include: {
          studioClasses: {
            where: {
              active: true,
              archivedAt: null
            },
            include: {
              enrollments: {
                select: {
                  status: true
                }
              }
            },
            orderBy: { className: "asc" }
          }
        }
      },
      internalNotes: {
        include: {
          author: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function getPublicRegistrationForm(slug: string) {
  return prisma.registrationForm.findFirst({
    where: {
      slug,
      active: true,
      business: {
        businessType: {
          code: "DANCE_STUDIO"
        }
      }
    },
    include: {
      business: {
        include: {
          studioClasses: {
            where: {
              active: true,
              archivedAt: null
            },
            include: {
              _count: {
                select: {
                  submissions: true
                }
              }
            },
            orderBy: { className: "asc" }
          }
        }
      }
    }
  });
}

export async function getConversations(businessId: string) {
  return prisma.conversation.findMany({
    where: { businessId },
    include: {
      customer: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getCommunicationHub(businessId: string) {
  const [inquiries, inboundMessages, followUps, campaignEvents] = await Promise.all([
    prisma.inquiry.findMany({
      where: { businessId },
      include: {
        customer: true,
        _count: {
          select: {
            notes: true,
            followUps: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 24
    }),
    prisma.message.findMany({
      where: {
        businessId,
        direction: "INBOUND"
      },
      include: {
        customer: true,
        conversation: true
      },
      orderBy: { createdAt: "desc" },
      take: 24
    }),
    prisma.followUpEmail.findMany({
      where: { businessId },
      include: {
        customer: true,
        inquiry: true,
        createdBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 24
    }),
    prisma.campaignEvent.findMany({
      where: {
        campaign: {
          businessId
        },
        status: {
          in: ["SENT", "FAILED"]
        }
      },
      include: {
        customer: true,
        campaign: true
      },
      orderBy: { occurredAt: "desc" },
      take: 24
    })
  ]);

  const inbox = [
    ...inquiries.map((inquiry) => ({
      id: `inquiry-${inquiry.id}`,
      kind: "Inquiry",
      subject: inquiry.subject,
      contact: inquiry.customer?.name ?? inquiry.leadName ?? "Unassigned lead",
      preview: inquiry.message,
      status: inquiry.status === "IN_PROGRESS" ? "OPEN" : inquiry.status,
      date: inquiry.createdAt,
      href: `/dashboard/communications/inquiry-${inquiry.id}`,
      meta: `${inquiry.source} · ${inquiry._count.notes} notes · ${inquiry._count.followUps} follow-ups`
    })),
    ...inboundMessages.map((message) => ({
      id: `conversation-${message.conversationId ?? message.id}`,
      kind: "Message",
      subject: message.subject ?? message.conversation?.subject ?? "Inbound message",
      contact: message.customer?.name ?? "Unassigned contact",
      preview: message.body,
      status: message.conversation?.status ?? "OPEN",
      date: message.createdAt,
      href: message.conversationId ? `/dashboard/communications/conversation-${message.conversationId}` : `/dashboard/communications/message-${message.id}`,
      meta: `${message.channel.toLowerCase()} · inbound`
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const outbox = [
    ...followUps.map((followUp) => ({
      id: `followup-${followUp.id}`,
      kind: "Follow-up",
      subject: followUp.subject,
      contact: followUp.customer?.name ?? followUp.toEmail,
      preview: followUp.body,
      status: followUp.status,
      date: followUp.sentAt ?? followUp.createdAt,
      href: `/dashboard/communications/followup-${followUp.id}`,
      meta: `To ${followUp.toEmail} · ${followUp.createdBy?.name ?? "Mayke Motion"}`
    })),
    ...campaignEvents.map((event) => ({
      id: `campaign-${event.id}`,
      kind: "Campaign",
      subject: event.campaign.subject,
      contact: event.customer?.name ?? event.campaign.audience,
      preview: event.campaign.body,
      status: event.status,
      date: event.occurredAt,
      href: `/dashboard/marketing?campaign=${event.campaign.id}`,
      meta: `${event.campaign.name} · ${event.campaign.audience}`
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return { inbox, outbox };
}

export async function getCommunicationDetail(businessId: string, threadId: string) {
  const [kind, ...idParts] = threadId.split("-");
  const id = idParts.join("-");

  if (kind === "inquiry") {
    const inquiry = await getInquiryDetail(businessId, id);
    return inquiry ? ({ type: "inquiry" as const, inquiry }) : null;
  }

  if (kind === "followup") {
    const followUp = await prisma.followUpEmail.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        inquiry: {
          include: {
            customer: true,
            notes: {
              include: {
                author: {
                  select: {
                    name: true
                  }
                }
              },
              orderBy: { createdAt: "desc" }
            },
            followUps: {
              include: {
                createdBy: {
                  select: {
                    name: true
                  }
                }
              },
              orderBy: { createdAt: "desc" }
            }
          }
        },
        customer: {
          include: {
            followUpEmails: {
              orderBy: { createdAt: "desc" },
              take: 12
            }
          }
        },
        createdBy: {
          select: {
            name: true
          }
        }
      }
    });
    return followUp ? ({ type: "followup" as const, followUp }) : null;
  }

  if (kind === "conversation") {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        customer: true,
        messages: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
    return conversation ? ({ type: "conversation" as const, conversation }) : null;
  }

  if (kind === "message") {
    const message = await prisma.message.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        customer: true,
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" }
            }
          }
        }
      }
    });
    return message ? ({ type: "message" as const, message }) : null;
  }

  return null;
}

export async function getAdminSnapshot() {
  const [businesses, businessTypes, users, customers, revenue] = await Promise.all([
    prisma.business.findMany({
      include: {
        businessType: true,
        users: true,
        userInvites: true,
        modules: {
          select: {
            enabled: true
          }
        },
        _count: {
          select: {
            customers: true,
            inquiries: true,
            campaigns: true,
            integrations: true,
            modules: true
          }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.businessType.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.user.count(),
    prisma.customer.count(),
    prisma.sale.aggregate({
      _sum: {
        total: true
      }
    })
  ]);

  return {
    businesses: businesses.map((business) => ({
      ...business,
      setupChecklist: buildSetupChecklistStatus({ business })
    })),
    businessTypes,
    users,
    customers,
    revenue: Number(revenue._sum.total ?? 0)
  };
}

export async function getAdminClient(businessId: string) {
  const [business, businessTypes, provisionedLog, sentMessageCount, paidPaymentCount, paidFormCount, demoCleanup, cleanupLog] = await Promise.all([
    prisma.business.findUnique({
      where: {
        id: businessId
      },
      include: {
        businessType: true,
        users: {
          orderBy: [{ role: "asc" }, { name: "asc" }]
        },
        userInvites: {
          orderBy: [{ status: "asc" }, { createdAt: "desc" }]
        },
        modules: {
          orderBy: [{ enabled: "desc" }, { label: "asc" }]
        },
        messageTemplates: {
          orderBy: [{ type: "asc" }, { name: "asc" }]
        },
        integrations: true,
        activityLogs: {
          orderBy: {
            createdAt: "desc"
          },
          take: 8
        },
        _count: {
          select: {
            customers: true,
            inquiries: true,
            campaigns: true,
            followUpEmails: true
          }
        }
      }
    }),
    prisma.businessType.findMany({
      orderBy: {
        name: "asc"
      }
    }),
    prisma.activityLog.findFirst({
      where: { businessId, action: "Provisioned workspace defaults" },
      select: { id: true }
    }),
    prisma.followUpEmail.count({
      where: { businessId, status: "SENT" }
    }),
    prisma.paymentRecord.count({
      where: { businessId, status: "PAID", source: "stripe" }
    }),
    prisma.registrationForm.count({
      where: { businessId, fee: { gt: 0 } }
    }),
    getDemoDataCleanupStatus(businessId),
    prisma.activityLog.findFirst({
      where: { businessId, action: "Removed demo data" },
      select: { id: true }
    })
  ]);
  const paymentsEnabled = Boolean(business?.modules.some((module) => module.enabled && ["BILLING", "EDUCATION"].includes(module.key)) || paidFormCount > 0);

  return {
    business: business
      ? {
          ...business,
          demoCleanup,
          setupChecklist: buildSetupChecklistStatus({ business }),
          launchReadiness: buildLaunchReadiness({
            business,
            demoCleanupComplete: demoCleanup.total === 0 || Boolean(cleanupLog),
            paidPaymentCount,
            paymentsEnabled,
            provisioned: Boolean(provisionedLog),
            sentMessageCount
          })
        }
      : null,
    businessTypes
  };
}

export async function getAdminActivity() {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 8
  });
}
