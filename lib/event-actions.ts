"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EventActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | EventActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

const eventSchema = z.object({
  eventId: z.string().optional(),
  title: z.string().min(2),
  type: z.enum(["CLASS", "RECITAL", "PROMOTION", "PRIVATE_EVENT", "CAMPAIGN"]),
  startsAt: z.coerce.date(),
  location: z.string().optional(),
  description: z.string().optional(),
  classId: z.string().optional(),
  audience: z.string().min(2),
  capacity: z.coerce.number().int().min(0).optional()
});

export async function saveEventAction(first: FormData | EventActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = eventSchema.safeParse({
    eventId: formString(formData, "eventId") || undefined,
    title: formString(formData, "title"),
    type: formString(formData, "type"),
    startsAt: formString(formData, "startsAt"),
    location: formString(formData, "location"),
    description: formString(formData, "description"),
    classId: formString(formData, "classId") || undefined,
    audience: formString(formData, "audience"),
    capacity: formString(formData, "capacity") || undefined
  });

  if (!parsed.success || parsed.data.startsAt.toString() === "Invalid Date" || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Add event title, type, date/time, and audience." } satisfies EventActionResult;
  }

  if (parsed.data.classId) {
    const studioClass = await prisma.studioClass.findFirst({
      where: { id: parsed.data.classId, businessId: user.business.id }
    });
    if (!studioClass) return { error: "Related class was not found for this business." } satisfies EventActionResult;
  }

  const data = {
    title: parsed.data.title,
    type: parsed.data.type,
    startsAt: parsed.data.startsAt,
    location: parsed.data.location || null,
    description: parsed.data.description || null,
    audience: parsed.data.audience,
    classId: parsed.data.classId || null,
    capacity: parsed.data.capacity || null,
    archivedAt: null
  };

  if (parsed.data.eventId) {
    const existing = await prisma.event.findFirst({
      where: { id: parsed.data.eventId, businessId: user.business.id }
    });
    if (!existing) return { error: "Event was not found for this business." } satisfies EventActionResult;
  }

  const event = parsed.data.eventId
    ? await prisma.event.update({
        where: { id: parsed.data.eventId },
        data
      })
    : await prisma.event.create({
        data: {
          businessId: user.business.id,
          ...data
        }
      });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: parsed.data.eventId ? "Updated event" : "Created event",
      entity: event.title,
      metadata: { eventId: event.id, classId: event.classId }
    }
  });

  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
  return { success: parsed.data.eventId ? "Event updated." : "Event created." } satisfies EventActionResult;
}

const archiveEventSchema = z.object({ eventId: z.string().min(1) });

export async function archiveEventAction(first: FormData | EventActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = archiveEventSchema.safeParse({ eventId: formString(formData, "eventId") });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Choose a valid event." } satisfies EventActionResult;
  }

  const event = await prisma.event.findFirst({
    where: { id: parsed.data.eventId, businessId: user.business.id }
  });
  if (!event) return { error: "Event was not found for this business." } satisfies EventActionResult;

  await prisma.event.update({
    where: { id: event.id },
    data: { archivedAt: new Date() }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Archived event",
      entity: event.title,
      metadata: { eventId: event.id }
    }
  });

  revalidatePath("/dashboard/events");
  revalidatePath("/dashboard");
  return { success: "Event archived." } satisfies EventActionResult;
}
