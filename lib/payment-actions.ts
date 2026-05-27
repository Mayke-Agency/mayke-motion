"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PaymentActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | PaymentActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

const paymentStatusSchema = z.object({
  registrationId: z.string().min(1),
  status: z.enum(["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"]),
  note: z.string().optional()
});

export async function updateRegistrationPaymentStatusAction(first: FormData | PaymentActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = paymentStatusSchema.safeParse({
    registrationId: formString(formData, "registrationId"),
    status: formString(formData, "status"),
    note: formString(formData, "note")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Choose a valid payment status." } satisfies PaymentActionResult;
  }

  const registration = await prisma.registrationSubmission.findFirst({
    where: {
      id: parsed.data.registrationId,
      businessId: user.business.id
    },
    include: {
      form: true,
      familyProfile: {
        include: {
          students: {
            orderBy: [{ createdAt: "desc" }]
          }
        }
      },
      studioClass: true,
      classEnrollment: true
    }
  });

  if (!registration) return { error: "Registration was not found for this business." } satisfies PaymentActionResult;

  const student = registration.familyProfile?.students.find(
    (item) => item.firstName === registration.studentFirstName && item.lastName === registration.studentLastName
  ) ?? registration.familyProfile?.students[0];

  await prisma.$transaction([
    prisma.registrationSubmission.update({
      where: { id: registration.id },
      data: { paymentStatus: parsed.data.status }
    }),
    prisma.paymentRecord.create({
      data: {
        businessId: user.business.id,
        registrationId: registration.id,
        familyProfileId: registration.familyProfileId,
        studentProfileId: student?.id,
        classId: registration.classId,
        classEnrollmentId: registration.classEnrollment?.id,
        amount: registration.form.fee,
        status: parsed.data.status,
        note: parsed.data.note || null
      }
    }),
    prisma.activityLog.create({
      data: {
        businessId: user.business.id,
        actor: user.name,
        action: "Updated registration payment status",
        entity: `${registration.studentFirstName} ${registration.studentLastName}`,
        metadata: {
          registrationId: registration.id,
          familyProfileId: registration.familyProfileId,
          classEnrollmentId: registration.classEnrollment?.id ?? null,
          from: registration.paymentStatus,
          to: parsed.data.status
        }
      }
    })
  ]);

  revalidatePath("/dashboard/payments");
  revalidatePath(`/dashboard/registrations/${registration.id}`);
  if (registration.familyProfileId) revalidatePath(`/dashboard/families/${registration.familyProfileId}`);
  if (registration.classId) revalidatePath(`/dashboard/classes/${registration.classId}`);
  revalidatePath("/dashboard/classes");
  revalidatePath("/dashboard/registrations");

  return { success: "Payment status updated." } satisfies PaymentActionResult;
}
