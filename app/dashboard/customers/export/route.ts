import { NextResponse } from "next/server";
import { requireBusinessUser } from "@/lib/auth";
import { escapeCsvCell } from "@/lib/contact-csv";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireBusinessUser();
  const customers = await prisma.customer.findMany({
    where: { businessId: user.business.id },
    orderBy: { createdAt: "desc" }
  });
  const csv = [
    ["first name", "last name", "email", "phone", "tags", "source", "notes"].join(","),
    ...customers.map((customer) => {
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
      "Content-Disposition": `attachment; filename="${user.business.slug}-contacts.csv"`
    }
  });
}
