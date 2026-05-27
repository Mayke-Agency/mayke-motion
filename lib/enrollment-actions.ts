"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EnrollmentActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | EnrollmentActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

const enrollmentSchema = z.object({
  studentProfileId: z.string().min(1),
  classId: z.string().min(1),
  registrationId: z.string().optional(),
  status: z.enum(["ACTIVE", "WAITLISTED", "DROPPED", "COMPLETED"])
});

export async function saveClassEnrollmentAction(first: FormData | EnrollmentActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = enrollmentSchema.safeParse({
    studentProfileId: formString(formData, "studentProfileId"),
    classId: formString(formData, "classId"),
    registrationId: formString(formData, "registrationId") || undefined,
    status: formString(formData, "status")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Choose a student, class, and enrollment status." } satisfies EnrollmentActionResult;
  }

  const [student, studioClass, registration] = await Promise.all([
    prisma.studentProfile.findFirst({
      where: { id: parsed.data.studentProfileId, businessId: user.business.id },
      include: { familyProfile: true }
    }),
    prisma.studioClass.findFirst({
      where: { id: parsed.data.classId, businessId: user.business.id, active: true, archivedAt: null },
      include: {
        enrollments: {
          where: { status: "ACTIVE" }
        }
      }
    }),
    parsed.data.registrationId
      ? prisma.registrationSubmission.findFirst({
          where: { id: parsed.data.registrationId, businessId: user.business.id }
        })
      : Promise.resolve(null)
  ]);

  if (!student) return { error: "Student profile was not found for this business." } satisfies EnrollmentActionResult;
  if (!studioClass) return { error: "Class was not found for this business." } satisfies EnrollmentActionResult;
  if (parsed.data.registrationId && !registration) return { error: "Registration was not found for this business." } satisfies EnrollmentActionResult;

  const existing = await prisma.classEnrollment.findUnique({
    where: {
      businessId_classId_studentProfileId: {
        businessId: user.business.id,
        classId: studioClass.id,
        studentProfileId: student.id
      }
    }
  });
  const alreadyActive = existing?.status === "ACTIVE";
  const activeCount = studioClass.enrollments.length - (alreadyActive ? 1 : 0);

  if (parsed.data.status === "ACTIVE" && activeCount >= studioClass.capacity) {
    return { error: "This class is full. Choose waitlisted to keep the student queued for a spot." } satisfies EnrollmentActionResult;
  }

  const enrollment = await prisma.classEnrollment.upsert({
    where: {
      businessId_classId_studentProfileId: {
        businessId: user.business.id,
        classId: studioClass.id,
        studentProfileId: student.id
      }
    },
    create: {
      businessId: user.business.id,
      classId: studioClass.id,
      studentProfileId: student.id,
      registrationId: registration?.id,
      status: parsed.data.status,
      endedAt: ["DROPPED", "COMPLETED"].includes(parsed.data.status) ? new Date() : null
    },
    update: {
      registrationId: registration?.id ?? existing?.registrationId,
      status: parsed.data.status,
      endedAt: ["DROPPED", "COMPLETED"].includes(parsed.data.status) ? new Date() : null
    }
  });

  if (registration && parsed.data.status === "ACTIVE") {
    await prisma.registrationSubmission.update({
      where: { id: registration.id },
      data: { status: "ENROLLED" }
    });
  }

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: existing ? "Updated class enrollment" : "Enrolled student in class",
      entity: `${student.firstName} ${student.lastName} · ${studioClass.className}`,
      metadata: {
        enrollmentId: enrollment.id,
        studentProfileId: student.id,
        classId: studioClass.id,
        registrationId: registration?.id ?? null,
        status: parsed.data.status
      }
    }
  });

  revalidatePath(`/dashboard/classes/${studioClass.id}`);
  revalidatePath("/dashboard/classes");
  revalidatePath(`/dashboard/families/${student.familyProfileId}`);
  if (registration) revalidatePath(`/dashboard/registrations/${registration.id}`);
  revalidatePath("/dashboard/registrations");

  return { success: parsed.data.status === "ACTIVE" ? "Student enrolled." : `Enrollment saved as ${parsed.data.status.toLowerCase().replaceAll("_", " ")}.` } satisfies EnrollmentActionResult;
}
