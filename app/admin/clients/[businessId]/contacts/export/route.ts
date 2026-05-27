import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { escapeCsvCell } from "@/lib/contact-csv";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ businessId: string }> }) {
  await requireAdmin();
  const { businessId } = await params;
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      customers: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!business) {
    return new NextResponse("Business not found", { status: 404 });
  }

  const csv = [
    ["first name", "last name", "email", "phone", "tags", "source", "notes"].join(","),
    ...business.customers.map((customer) => {
      const [firstName, ...lastParts] = customer.name.split(" ");
      return [
        firstName,
        lastParts.join(" "),
        customer.email ?? "",
        customer.phone ?? "",
        customer.tags.join("; "),
        customer.source,
        customer.notes ?? ""
      ]
        .map(escapeCsvCell)
        .join(",");
    })
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${business.slug}-contacts.csv"`
    }
  });
}
