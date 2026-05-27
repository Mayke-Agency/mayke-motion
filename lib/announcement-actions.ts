"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth";
import { getEmailFromAddress, sendFollowUpEmail } from "@/lib/email";
import { emailSetupMessage, isEmailSendingReady } from "@/lib/integration-gates";
import { prisma } from "@/lib/prisma";

type AnnouncementActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | AnnouncementActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

const announcementSchema = z.object({
  audience: z.enum(["ALL_FAMILIES", "SPECIFIC_CLASS", "ACTIVE_STUDENTS", "WAITLISTED_STUDENTS", "UNPAID_FAMILIES"]),
  classId: z.string().optional(),
  subject: z.string().min(3),
  body: z.string().min(12),
  intent: z.enum(["DRAFT", "SEND"])
});

async function resolveAnnouncementRecipients(businessId: string, audience: z.infer<typeof announcementSchema>["audience"], classId?: string) {
  if (audience === "SPECIFIC_CLASS") {
    if (!classId) return [];
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        businessId,
        classId
      },
      include: {
        studentProfile: {
          include: {
            familyProfile: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });
    return enrollments.map((enrollment) => enrollment.studentProfile.familyProfile);
  }

  if (audience === "ACTIVE_STUDENTS" || audience === "WAITLISTED_STUDENTS") {
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        businessId,
        status: audience === "ACTIVE_STUDENTS" ? "ACTIVE" : "WAITLISTED"
      },
      include: {
        studentProfile: {
          include: {
            familyProfile: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    });
    return enrollments.map((enrollment) => enrollment.studentProfile.familyProfile);
  }

  if (audience === "UNPAID_FAMILIES") {
    const registrations = await prisma.registrationSubmission.findMany({
      where: {
        businessId,
        paymentStatus: {
          in: ["UNPAID", "PENDING", "FAILED"]
        },
        familyProfileId: {
          not: null
        }
      },
      include: {
        familyProfile: {
          include: {
            customer: true
          }
        }
      }
    });
    return registrations.flatMap((registration) => (registration.familyProfile ? [registration.familyProfile] : []));
  }

  return prisma.familyProfile.findMany({
    where: { businessId },
    include: { customer: true }
  });
}

function uniqueFamilies<T extends { id: string; customer: { email: string | null } }>(families: T[]) {
  return Array.from(new Map(families.filter((family) => family.customer.email).map((family) => [family.id, family])).values());
}

function audienceLabel(audience: z.infer<typeof announcementSchema>["audience"], className?: string) {
  if (audience === "SPECIFIC_CLASS") return className ? `Class: ${className}` : "Specific class";
  return audience.toLowerCase().replaceAll("_", " ");
}

export async function saveAnnouncementAction(first: FormData | AnnouncementActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = announcementSchema.safeParse({
    audience: formString(formData, "audience"),
    classId: formString(formData, "classId") || undefined,
    subject: formString(formData, "subject"),
    body: formString(formData, "body"),
    intent: formString(formData, "intent")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Add an audience, subject, and message." } satisfies AnnouncementActionResult;
  }

  const selectedClass = parsed.data.classId
    ? await prisma.studioClass.findFirst({
        where: {
          id: parsed.data.classId,
          businessId: user.business.id
        }
      })
    : null;

  if (parsed.data.audience === "SPECIFIC_CLASS" && !selectedClass) {
    return { error: "Choose a class for this announcement." } satisfies AnnouncementActionResult;
  }

  if (parsed.data.intent === "SEND" && !isEmailSendingReady(user.business)) {
    return { error: emailSetupMessage } satisfies AnnouncementActionResult;
  }

  const announcement = await prisma.announcement.create({
    data: {
      businessId: user.business.id,
      title: parsed.data.subject,
      body: parsed.data.body,
      audience: audienceLabel(parsed.data.audience, selectedClass?.className),
      status: parsed.data.intent === "SEND" ? "READY" : "DRAFT",
      channel: "EMAIL"
    }
  });

  if (parsed.data.intent === "DRAFT") {
    await prisma.activityLog.create({
      data: {
        businessId: user.business.id,
        actor: user.name,
        action: "Drafted announcement",
        entity: announcement.title,
        metadata: { announcementId: announcement.id, audience: announcement.audience }
      }
    });
    revalidatePath("/dashboard/announcements");
    return { success: "Announcement draft saved." } satisfies AnnouncementActionResult;
  }

  const families = uniqueFamilies(await resolveAnnouncementRecipients(user.business.id, parsed.data.audience, parsed.data.classId));
  if (!families.length) {
    await prisma.announcement.update({ where: { id: announcement.id }, data: { status: "DRAFT" } });
    return { error: "No families with email addresses matched this audience." } satisfies AnnouncementActionResult;
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const family of families) {
    let providerResult: { provider: "resend"; providerMessageId: string; fromEmail: string } | null = null;
    let sendError = "";

    try {
      providerResult = await sendFollowUpEmail({
        to: family.customer.email!,
        subject: parsed.data.subject,
        body: parsed.data.body,
        replyTo: user.email
      });
      sentCount += 1;
    } catch (error) {
      sendError = error instanceof Error ? error.message : "Email could not be sent.";
      failedCount += 1;
    }

    await prisma.followUpEmail.create({
      data: {
        businessId: user.business.id,
        customerId: family.customerId,
        createdById: user.id,
        toEmail: family.customer.email!,
        fromEmail: providerResult?.fromEmail ?? getEmailFromAddress(),
        subject: parsed.data.subject,
        body: parsed.data.body,
        status: sendError ? "FAILED" : "SENT",
        provider: providerResult?.provider,
        providerMessageId: providerResult?.providerMessageId,
        errorMessage: sendError || null,
        sentAt: sendError ? null : new Date()
      }
    });
  }

  await prisma.announcement.update({
    where: { id: announcement.id },
    data: {
      status: sentCount > 0 ? "SENT" : "DRAFT",
      sentAt: sentCount > 0 ? new Date() : null
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: sentCount > 0 ? "Sent announcement" : "Failed announcement send",
      entity: announcement.title,
      metadata: { announcementId: announcement.id, audience: announcement.audience, sentCount, failedCount }
    }
  });

  revalidatePath("/dashboard/announcements");
  revalidatePath("/dashboard/families");
  revalidatePath("/dashboard");

  if (!sentCount) return { error: `Announcement was not sent. ${failedCount} failed.` } satisfies AnnouncementActionResult;
  return { success: `Announcement sent to ${sentCount} families${failedCount ? `, ${failedCount} failed` : ""}.` } satisfies AnnouncementActionResult;
}
