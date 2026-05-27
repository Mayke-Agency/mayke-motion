"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AttendanceActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | AttendanceActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

const attendanceSchema = z.object({
  classId: z.string().min(1),
  classDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function saveAttendanceAction(first: FormData | AttendanceActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = attendanceSchema.safeParse({
    classId: formString(formData, "classId"),
    classDate: formString(formData, "classDate")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Choose a class and class date before saving attendance." } satisfies AttendanceActionResult;
  }

  const studentIds = formData.getAll("studentProfileId").filter((value): value is string => typeof value === "string");
  const enrollmentIds = formData.getAll("classEnrollmentId").filter((value): value is string => typeof value === "string");
  const statuses = formData.getAll("status").filter((value): value is string => typeof value === "string");

  if (!studentIds.length || studentIds.length !== statuses.length || studentIds.length !== enrollmentIds.length) {
    return { error: "Attendance rows were incomplete." } satisfies AttendanceActionResult;
  }

  const classDate = dateOnly(parsed.data.classDate);
  const studioClass = await prisma.studioClass.findFirst({
    where: {
      id: parsed.data.classId,
      businessId: user.business.id,
      active: true,
      archivedAt: null
    }
  });

  if (!studioClass) return { error: "Class was not found for this business." } satisfies AttendanceActionResult;

  const validStatuses = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
  const rows = studentIds.map((studentProfileId, index) => ({
    studentProfileId,
    classEnrollmentId: enrollmentIds[index],
    status: statuses[index]
  }));

  if (rows.some((row) => !validStatuses.has(row.status))) {
    return { error: "Choose a valid attendance status." } satisfies AttendanceActionResult;
  }

  const enrollmentCount = await prisma.classEnrollment.count({
    where: {
      businessId: user.business.id,
      classId: studioClass.id,
      status: "ACTIVE",
      id: {
        in: enrollmentIds
      },
      studentProfileId: {
        in: studentIds
      }
    }
  });

  if (enrollmentCount !== rows.length) {
    return { error: "One or more students are not active in this class." } satisfies AttendanceActionResult;
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.attendanceRecord.upsert({
        where: {
          businessId_classId_studentProfileId_classDate: {
            businessId: user.business.id,
            classId: studioClass.id,
            studentProfileId: row.studentProfileId,
            classDate
          }
        },
        create: {
          businessId: user.business.id,
          classId: studioClass.id,
          studentProfileId: row.studentProfileId,
          classEnrollmentId: row.classEnrollmentId,
          classDate,
          status: row.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
        },
        update: {
          classEnrollmentId: row.classEnrollmentId,
          status: row.status as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"
        }
      })
    )
  );

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Saved class attendance",
      entity: studioClass.className,
      metadata: { classId: studioClass.id, classDate: parsed.data.classDate, count: rows.length }
    }
  });

  revalidatePath("/dashboard/attendance");
  revalidatePath(`/dashboard/classes/${studioClass.id}`);
  revalidatePath("/dashboard/classes");
  return { success: `Attendance saved for ${rows.length} students.` } satisfies AttendanceActionResult;
}
