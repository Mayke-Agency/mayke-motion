"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StudioClassActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | StudioClassActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

const studioClassSchema = z.object({
  classId: z.string().optional(),
  className: z.string().min(2),
  ageRange: z.string().min(1),
  level: z.string().min(1),
  dayTime: z.string().min(2),
  instructor: z.string().min(2),
  capacity: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0),
  active: z.boolean()
});

export async function saveStudioClassAction(first: FormData | StudioClassActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Classes are only available for dance studio workspaces." } satisfies StudioClassActionResult;
  }

  const parsed = studioClassSchema.safeParse({
    classId: formString(formData, "classId") || undefined,
    className: formString(formData, "className"),
    ageRange: formString(formData, "ageRange"),
    level: formString(formData, "level"),
    dayTime: formString(formData, "dayTime"),
    instructor: formString(formData, "instructor"),
    capacity: formString(formData, "capacity"),
    price: formString(formData, "price") || "0",
    active: formData.get("active") === "on"
  });

  if (!parsed.success) {
    return { error: "Add class name, age range, level, day/time, instructor, capacity, and price." } satisfies StudioClassActionResult;
  }

  if (parsed.data.classId) {
    const existing = await prisma.studioClass.findFirst({
      where: { id: parsed.data.classId, businessId: user.business.id }
    });
    if (!existing) return { error: "Class was not found for this business." } satisfies StudioClassActionResult;

    const studioClass = await prisma.studioClass.update({
      where: { id: existing.id },
      data: {
        className: parsed.data.className,
        ageRange: parsed.data.ageRange,
        level: parsed.data.level,
        dayTime: parsed.data.dayTime,
        instructor: parsed.data.instructor,
        capacity: parsed.data.capacity,
        price: parsed.data.price,
        active: parsed.data.active,
        archivedAt: parsed.data.active ? null : existing.archivedAt
      }
    });

    await prisma.activityLog.create({
      data: {
        businessId: user.business.id,
        actor: user.name,
        action: "Updated studio class",
        entity: studioClass.className,
        metadata: { classId: studioClass.id }
      }
    });
    revalidatePath("/dashboard/classes");
    revalidatePath("/dashboard/registrations");
    return { success: "Class updated." } satisfies StudioClassActionResult;
  }

  const studioClass = await prisma.studioClass.create({
    data: {
      businessId: user.business.id,
      className: parsed.data.className,
      ageRange: parsed.data.ageRange,
      level: parsed.data.level,
      dayTime: parsed.data.dayTime,
      instructor: parsed.data.instructor,
      capacity: parsed.data.capacity,
      price: parsed.data.price,
      active: parsed.data.active
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Created studio class",
      entity: studioClass.className,
      metadata: { classId: studioClass.id }
    }
  });
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/registrations");
  return { success: "Class created." } satisfies StudioClassActionResult;
}

const archiveStudioClassSchema = z.object({ classId: z.string().min(1) });

export async function archiveStudioClassAction(first: FormData | StudioClassActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = archiveStudioClassSchema.safeParse({ classId: formString(formData, "classId") });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Choose a valid class." } satisfies StudioClassActionResult;
  }

  const existing = await prisma.studioClass.findFirst({
    where: { id: parsed.data.classId, businessId: user.business.id }
  });
  if (!existing) return { error: "Class was not found for this business." } satisfies StudioClassActionResult;

  await prisma.studioClass.update({
    where: { id: existing.id },
    data: {
      active: false,
      archivedAt: new Date()
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Archived studio class",
      entity: existing.className,
      metadata: { classId: existing.id }
    }
  });
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/registrations");
  return { success: "Class archived." } satisfies StudioClassActionResult;
}
