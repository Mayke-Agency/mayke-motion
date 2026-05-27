import { NextResponse } from "next/server";
import { processStripeWebhookEvent, verifyStripeWebhookPayload } from "@/lib/stripe-webhook";

export async function POST(request: Request) {
  const payload = await request.text();

  try {
    const event = verifyStripeWebhookPayload(payload, request.headers.get("stripe-signature"));

    if (!["checkout.session.completed", "payment_intent.succeeded", "payment_intent.payment_failed"].includes(event.type)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const result = await processStripeWebhookEvent(event);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Stripe webhook could not be processed." }, { status: 400 });
  }
}
