import "server-only";

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
};

type SendEmailResult = {
  provider: "resend";
  providerMessageId: string;
  fromEmail: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bodyToHtml(body: string) {
  return escapeHtml(body)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replaceAll("\n", "<br />")}</p>`)
    .join("");
}

export function getEmailFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? "Mayke Motion <onboarding@resend.dev>";
}

export async function sendFollowUpEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = getEmailFromAddress();

  if (!apiKey) {
    throw new Error("Email sending is not configured. Add RESEND_API_KEY to the environment.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.to],
      subject: input.subject,
      text: input.body,
      html: bodyToHtml(input.body),
      reply_to: input.replyTo
    })
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;

  if (!response.ok || !payload?.id) {
    throw new Error(payload?.message ?? payload?.name ?? "Resend could not send this email.");
  }

  // TODO: Add an SMS provider path alongside Resend so follow-ups can choose email, SMS, or both.
  return {
    provider: "resend",
    providerMessageId: payload.id,
    fromEmail
  };
}
