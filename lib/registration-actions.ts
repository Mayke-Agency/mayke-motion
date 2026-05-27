"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBusinessUser } from "@/lib/auth";
import { getEmailFromAddress, sendFollowUpEmail } from "@/lib/email";
import { emailSetupMessage, isEmailSendingReady, isStripePaymentsReady, stripeSetupMessage } from "@/lib/integration-gates";
import { prisma } from "@/lib/prisma";
import { createRegistrationCheckoutSession, isStripeConfigured } from "@/lib/stripe";

export type RegistrationActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | RegistrationActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "registration"
  );
}

const registrationFormSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  fee: z.coerce.number().min(0)
});

export async function createRegistrationFormAction(first: FormData | RegistrationActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Registration forms are only available for dance studio workspaces." } satisfies RegistrationActionResult;
  }

  const parsed = registrationFormSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    fee: formString(formData, "fee") || "0"
  });

  if (!parsed.success) {
    return { error: "Add a form title and valid registration fee." } satisfies RegistrationActionResult;
  }

  if (parsed.data.fee > 0 && !isStripePaymentsReady(user.business)) {
    return { error: stripeSetupMessage } satisfies RegistrationActionResult;
  }

  const form = await prisma.registrationForm.create({
    data: {
      businessId: user.business.id,
      title: parsed.data.title,
      slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
      description: parsed.data.description || null,
      fee: parsed.data.fee
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Created registration form",
      entity: form.title,
      metadata: { formId: form.id, fee: parsed.data.fee }
    }
  });

  revalidatePath("/dashboard/registrations");
  return { success: "Registration form created." } satisfies RegistrationActionResult;
}

const registrationSubmitSchema = z.object({
  formId: z.string().min(1),
  classId: z.string().optional(),
  referralSource: z.string().min(2),
  referralName: z.string().optional(),
  familyLastName: z.string().min(2),
  homeAddress: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().min(3),
  primaryPhone: z.string().min(7),
  emergencyContactInfo: z.string().min(5),
  contact1FirstName: z.string().min(2),
  contact1LastName: z.string().min(2),
  contact1Type: z.string().min(2),
  contact1Phone: z.string().min(7),
  contact1Email: z.string().email(),
  smsConsent: z.boolean(),
  contact2FirstName: z.string().optional(),
  contact2LastName: z.string().optional(),
  contact2Type: z.string().optional(),
  contact2Phone: z.string().optional(),
  contact2Email: z.string().email().optional().or(z.literal("")),
  studentFirstName: z.string().min(2),
  studentLastName: z.string().min(2),
  studentGender: z.string().min(1),
  birthDate: z.coerce.date(),
  studentPhone: z.string().optional(),
  tshirtSize: z.string().min(1),
  gradeLevel: z.string().min(1),
  specialNeeds: z.string().optional(),
  classInterest: z.string().min(2),
  trialClass: z.boolean(),
  notes: z.string().optional()
});

export async function submitRegistrationAction(first: FormData | RegistrationActionResult | null | undefined, second?: FormData) {
  const formData = resolveFormData(first, second);
  const parsed = registrationSubmitSchema.safeParse({
    formId: formString(formData, "formId"),
    classId: formString(formData, "classId") || undefined,
    referralSource: formString(formData, "referralSource"),
    referralName: formString(formData, "referralName"),
    familyLastName: formString(formData, "familyLastName"),
    homeAddress: formString(formData, "homeAddress"),
    city: formString(formData, "city"),
    state: formString(formData, "state"),
    zip: formString(formData, "zip"),
    primaryPhone: formString(formData, "primaryPhone"),
    emergencyContactInfo: formString(formData, "emergencyContactInfo"),
    contact1FirstName: formString(formData, "contact1FirstName"),
    contact1LastName: formString(formData, "contact1LastName"),
    contact1Type: formString(formData, "contact1Type"),
    contact1Phone: formString(formData, "contact1Phone"),
    contact1Email: formString(formData, "contact1Email"),
    smsConsent: formData.get("smsConsent") === "on",
    contact2FirstName: formString(formData, "contact2FirstName"),
    contact2LastName: formString(formData, "contact2LastName"),
    contact2Type: formString(formData, "contact2Type"),
    contact2Phone: formString(formData, "contact2Phone"),
    contact2Email: formString(formData, "contact2Email"),
    studentFirstName: formString(formData, "studentFirstName"),
    studentLastName: formString(formData, "studentLastName"),
    studentGender: formString(formData, "studentGender"),
    birthDate: formString(formData, "birthDate"),
    studentPhone: formString(formData, "studentPhone"),
    tshirtSize: formString(formData, "tshirtSize"),
    gradeLevel: formString(formData, "gradeLevel"),
    specialNeeds: formString(formData, "specialNeeds"),
    classInterest: formString(formData, "classInterest"),
    trialClass: formData.get("trialClass") === "on",
    notes: formString(formData, "notes")
  });

  if (!parsed.success || parsed.data.birthDate.toString() === "Invalid Date") {
    return { error: "Complete the required registration fields before submitting." } satisfies RegistrationActionResult;
  }

  const form = await prisma.registrationForm.findUnique({
    where: { id: parsed.data.formId },
    include: { business: { include: { businessType: true } } }
  });

  if (!form || !form.active || form.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Registration form is not available." } satisfies RegistrationActionResult;
  }

  const selectedClass = parsed.data.classId
    ? await prisma.studioClass.findFirst({
        where: {
          id: parsed.data.classId,
          businessId: form.businessId,
          active: true,
          archivedAt: null
        },
        include: {
          _count: {
            select: {
              submissions: true
            }
          }
        }
      })
    : null;

  if (parsed.data.classId && !selectedClass) {
    return { error: "Choose an available class before submitting." } satisfies RegistrationActionResult;
  }

  if (selectedClass && selectedClass._count.submissions >= selectedClass.capacity) {
    return { error: "That class is currently full. Please choose another class or contact the studio." } satisfies RegistrationActionResult;
  }

  const classInterest = selectedClass?.className ?? parsed.data.classInterest;
  const fee = Number(form.fee);
  if (fee > 0 && !isStripePaymentsReady(form.business)) {
    return { error: stripeSetupMessage } satisfies RegistrationActionResult;
  }

  if (fee > 0 && !isStripeConfigured()) {
    return { error: "Stripe API keys are not configured. Please contact Jete Dance Center to complete registration." } satisfies RegistrationActionResult;
  }

  const registration = await prisma.registrationSubmission.create({
    data: {
      businessId: form.businessId,
      formId: form.id,
      classId: selectedClass?.id,
      paymentStatus: fee > 0 ? "PENDING" : "UNPAID",
      referralSource: parsed.data.referralSource,
      referralName: parsed.data.referralName || null,
      familyLastName: parsed.data.familyLastName,
      homeAddress: parsed.data.homeAddress,
      city: parsed.data.city,
      state: parsed.data.state,
      zip: parsed.data.zip,
      primaryPhone: parsed.data.primaryPhone,
      emergencyContactInfo: parsed.data.emergencyContactInfo,
      contact1FirstName: parsed.data.contact1FirstName,
      contact1LastName: parsed.data.contact1LastName,
      contact1Type: parsed.data.contact1Type,
      contact1Phone: parsed.data.contact1Phone,
      contact1Email: parsed.data.contact1Email,
      smsConsent: parsed.data.smsConsent,
      contact2FirstName: parsed.data.contact2FirstName || null,
      contact2LastName: parsed.data.contact2LastName || null,
      contact2Type: parsed.data.contact2Type || null,
      contact2Phone: parsed.data.contact2Phone || null,
      contact2Email: parsed.data.contact2Email || null,
      studentFirstName: parsed.data.studentFirstName,
      studentLastName: parsed.data.studentLastName,
      studentGender: parsed.data.studentGender,
      birthDate: parsed.data.birthDate,
      studentPhone: parsed.data.studentPhone || null,
      tshirtSize: parsed.data.tshirtSize,
      gradeLevel: parsed.data.gradeLevel,
      specialNeeds: parsed.data.specialNeeds || null,
      classInterest,
      trialClass: parsed.data.trialClass,
      notes: parsed.data.notes || null
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: form.businessId,
      actor: `${parsed.data.contact1FirstName} ${parsed.data.contact1LastName}`,
      action: "Submitted registration",
      entity: `${parsed.data.studentFirstName} ${parsed.data.studentLastName}`,
      metadata: { registrationId: registration.id, formId: form.id, classId: selectedClass?.id ?? null, paymentStatus: registration.paymentStatus }
    }
  });

  if (fee > 0) {
    try {
      const session = await createRegistrationCheckoutSession({
        businessId: form.businessId,
        registrationId: registration.id,
        formSlug: form.slug,
        amountCents: Math.round(fee * 100),
        title: form.title,
        email: parsed.data.contact1Email
      });

      await prisma.registrationSubmission.update({ where: { id: registration.id }, data: { stripeSessionId: session.id } });

      if (!session.url) return { error: "Stripe did not return a checkout URL." } satisfies RegistrationActionResult;
      redirect(session.url);
    } catch (error) {
      await prisma.registrationSubmission.update({ where: { id: registration.id }, data: { paymentStatus: "FAILED" } });
      return { error: error instanceof Error ? error.message : "Payment checkout could not be started." } satisfies RegistrationActionResult;
    }
  }

  redirect(`/register/${form.slug}/success?registration=${registration.id}`);
}

const registrationStatusSchema = z.object({
  registrationId: z.string().min(1),
  status: z.enum(["NEW", "REVIEWED", "CONTACTED", "ENROLLED", "NOT_A_FIT"])
});

export async function updateRegistrationStatusAction(first: FormData | RegistrationActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = registrationStatusSchema.safeParse({ registrationId: formString(formData, "registrationId"), status: formString(formData, "status") });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") return { error: "Choose a valid registration status." } satisfies RegistrationActionResult;

  const registration = await prisma.registrationSubmission.findFirst({ where: { id: parsed.data.registrationId, businessId: user.business.id } });
  if (!registration) return { error: "Registration was not found for this business." } satisfies RegistrationActionResult;

  await prisma.registrationSubmission.update({ where: { id: registration.id }, data: { status: parsed.data.status } });
  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Updated registration status",
      entity: `${registration.studentFirstName} ${registration.studentLastName}`,
      metadata: { registrationId: registration.id, from: registration.status, to: parsed.data.status }
    }
  });

  revalidatePath(`/dashboard/registrations/${registration.id}`);
  revalidatePath("/dashboard/registrations");
  revalidatePath("/dashboard");
  return { success: "Registration status updated." } satisfies RegistrationActionResult;
}

const registrationNoteSchema = z.object({ registrationId: z.string().min(1), body: z.string().min(3) });

export async function addRegistrationNoteAction(first: FormData | RegistrationActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = registrationNoteSchema.safeParse({ registrationId: formString(formData, "registrationId"), body: formString(formData, "body") });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") return { error: "Write a note before saving." } satisfies RegistrationActionResult;

  const registration = await prisma.registrationSubmission.findFirst({ where: { id: parsed.data.registrationId, businessId: user.business.id } });
  if (!registration) return { error: "Registration was not found for this business." } satisfies RegistrationActionResult;

  await prisma.registrationNote.create({ data: { businessId: user.business.id, registrationId: registration.id, authorId: user.id, body: parsed.data.body } });
  await prisma.activityLog.create({ data: { businessId: user.business.id, actor: user.name, action: "Added registration note", entity: `${registration.studentFirstName} ${registration.studentLastName}`, metadata: { registrationId: registration.id } } });

  revalidatePath(`/dashboard/registrations/${registration.id}`);
  return { success: "Note added." } satisfies RegistrationActionResult;
}

const registrationFollowUpSchema = z.object({
  registrationId: z.string().min(1),
  toEmail: z.string().email(),
  subject: z.string().min(3),
  body: z.string().min(12)
});

export async function sendRegistrationFollowUpEmailAction(first: FormData | RegistrationActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = registrationFollowUpSchema.safeParse({
    registrationId: formString(formData, "registrationId"),
    toEmail: formString(formData, "toEmail"),
    subject: formString(formData, "subject"),
    body: formString(formData, "body")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Add recipient email, subject, and message." } satisfies RegistrationActionResult;
  }

  const registration = await prisma.registrationSubmission.findFirst({
    where: { id: parsed.data.registrationId, businessId: user.business.id }
  });
  if (!registration) return { error: "Registration was not found for this business." } satisfies RegistrationActionResult;

  if (!isEmailSendingReady(user.business)) {
    return { error: emailSetupMessage } satisfies RegistrationActionResult;
  }

  let providerResult: { provider: "resend"; providerMessageId: string; fromEmail: string } | null = null;
  let sendError = "";

  try {
    providerResult = await sendFollowUpEmail({
      to: parsed.data.toEmail,
      subject: parsed.data.subject,
      body: parsed.data.body,
      replyTo: user.email
    });
  } catch (error) {
    sendError = error instanceof Error ? error.message : "Email could not be sent.";
  }

  const status = sendError ? "FAILED" : "SENT";
  const followUp = await prisma.followUpEmail.create({
    data: {
      businessId: user.business.id,
      customerId: registration.customerId,
      createdById: user.id,
      toEmail: parsed.data.toEmail,
      fromEmail: providerResult?.fromEmail ?? getEmailFromAddress(),
      subject: parsed.data.subject,
      body: parsed.data.body,
      status,
      provider: providerResult?.provider,
      providerMessageId: providerResult?.providerMessageId,
      errorMessage: sendError || null,
      sentAt: status === "SENT" ? new Date() : null
    }
  });

  if (status === "SENT" && registration.customerId) {
    await prisma.customer.update({ where: { id: registration.customerId }, data: { lastContactedAt: new Date() } });
  }

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: status === "SENT" ? "Sent registration follow-up email" : "Failed registration follow-up email",
      entity: `${registration.studentFirstName} ${registration.studentLastName}`,
      metadata: {
        registrationId: registration.id,
        followUpId: followUp.id,
        toEmail: parsed.data.toEmail,
        provider: providerResult?.provider ?? "resend",
        error: sendError || null
      }
    }
  });

  revalidatePath(`/dashboard/registrations/${registration.id}`);
  revalidatePath("/dashboard/communications");
  revalidatePath("/dashboard");
  if (registration.customerId) revalidatePath(`/dashboard/customers/${registration.customerId}`);

  if (sendError) return { error: sendError } satisfies RegistrationActionResult;
  return { success: "Follow-up email sent." } satisfies RegistrationActionResult;
}

const convertRegistrationSchema = z.object({ registrationId: z.string().min(1) });

export async function convertRegistrationToCustomerAction(first: FormData | RegistrationActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = convertRegistrationSchema.safeParse({ registrationId: formString(formData, "registrationId") });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") return { error: "Choose a valid registration." } satisfies RegistrationActionResult;

  const registration = await prisma.registrationSubmission.findFirst({
    where: { id: parsed.data.registrationId, businessId: user.business.id },
    include: { familyProfile: true, customer: true, studioClass: true }
  });
  if (!registration) return { error: "Registration was not found for this business." } satisfies RegistrationActionResult;
  if (registration.familyProfileId) return { error: "Registration is already connected to a family profile." } satisfies RegistrationActionResult;

  const family = await prisma.$transaction(async (tx) => {
    const customer =
      registration.customer ??
      (await tx.customer.create({
        data: {
          businessId: user.business.id,
          name: `${registration.contact1FirstName} ${registration.contact1LastName}`,
          email: registration.contact1Email,
          phone: registration.contact1Phone,
          source: registration.referralSource,
          segment: "Registration family",
          tags: ["registration", "family", registration.classInterest.toLowerCase()],
          notes: `Student: ${registration.studentFirstName} ${registration.studentLastName}. ${registration.notes ?? ""}`.trim(),
          lastContactedAt: new Date()
        }
      }));

    const existingFamily = await tx.familyProfile.findUnique({
      where: { customerId: customer.id }
    });

    const familyProfile =
      existingFamily ??
      (await tx.familyProfile.create({
        data: {
          businessId: user.business.id,
          customerId: customer.id,
          familyLastName: registration.familyLastName,
          homeAddress: registration.homeAddress,
          city: registration.city,
          state: registration.state,
          zip: registration.zip,
          primaryPhone: registration.primaryPhone,
          emergencyContactInfo: registration.emergencyContactInfo,
          contact1Name: `${registration.contact1FirstName} ${registration.contact1LastName}`,
          contact1Type: registration.contact1Type,
          contact1Phone: registration.contact1Phone,
          contact1Email: registration.contact1Email,
          contact2Name: [registration.contact2FirstName, registration.contact2LastName].filter(Boolean).join(" ") || null,
          contact2Type: registration.contact2Type,
          contact2Phone: registration.contact2Phone,
          contact2Email: registration.contact2Email,
          smsConsent: registration.smsConsent,
          notes: registration.notes
        }
      }));

    const selectedClass = registration.studioClass?.className ?? registration.classInterest;
    await tx.studentProfile.create({
      data: {
        businessId: user.business.id,
        familyProfileId: familyProfile.id,
        firstName: registration.studentFirstName,
        lastName: registration.studentLastName,
        gender: registration.studentGender,
        birthDate: registration.birthDate,
        phone: registration.studentPhone,
        tshirtSize: registration.tshirtSize,
        gradeLevel: registration.gradeLevel,
        specialNeeds: registration.specialNeeds,
        currentClassInterest: selectedClass
      }
    });

    await tx.registrationSubmission.update({
      where: { id: registration.id },
      data: {
        customerId: customer.id,
        familyProfileId: familyProfile.id,
        status: registration.status === "NEW" ? "REVIEWED" : registration.status
      }
    });

    await tx.activityLog.create({
      data: {
        businessId: user.business.id,
        actor: user.name,
        action: "Converted registration to family profile",
        entity: `${familyProfile.familyLastName} family`,
        metadata: { registrationId: registration.id, customerId: customer.id, familyProfileId: familyProfile.id }
      }
    });

    return familyProfile;
  });

  revalidatePath(`/dashboard/registrations/${registration.id}`);
  revalidatePath(`/dashboard/families/${family.id}`);
  revalidatePath("/dashboard/customers");
  return { success: "Registration converted to family profile." } satisfies RegistrationActionResult;
}
