import type { BusinessTypeCode, Customer } from "@prisma/client";

type SegmentCustomer = Pick<Customer, "createdAt" | "lastContactedAt" | "lifetimeValue" | "segment" | "tags" | "visits">;

export type SegmentOption = {
  key: string;
  label: string;
  description: string;
};

const baseSegments: SegmentOption[] = [
  { key: "all", label: "All contacts", description: "Every customer and contact in this workspace." },
  { key: "new-leads", label: "New leads", description: "Recently added, prospective, or newly captured contacts." },
  { key: "recent-customers", label: "Recent customers", description: "Contacts with recent value or purchase activity." },
  { key: "needs-follow-up", label: "Needs follow-up", description: "Contacts with no recent touch recorded." }
];

const typeSegments: Record<BusinessTypeCode, SegmentOption[]> = {
  RESTAURANT: [
    { key: "catering-private-events", label: "Catering/private events", description: "Guests and companies showing private dining or catering interest." }
  ],
  RETAIL: [{ key: "product-interest", label: "Product interest", description: "Contacts showing product, bundle, or wholesale intent." }],
  DANCE_STUDIO: [{ key: "event-recital-interest", label: "Event/recital interest", description: "Families interested in recitals, classes, events, or trials." }]
};

function normalizedTags(customer: SegmentCustomer) {
  return [customer.segment, ...customer.tags].map((value) => value.toLowerCase());
}

function hasAny(customer: SegmentCustomer, terms: string[]) {
  const values = normalizedTags(customer);
  return values.some((value) => terms.some((term) => value.includes(term)));
}

export function getSegmentOptions(type: BusinessTypeCode) {
  return [...baseSegments, ...typeSegments[type]];
}

export function getSegmentLabel(type: BusinessTypeCode, key: string) {
  return getSegmentOptions(type).find((segment) => segment.key === key)?.label ?? key;
}

export function customerMatchesSegment(customer: SegmentCustomer, key = "all") {
  if (key === "all") return true;

  if (key === "new-leads") {
    return hasAny(customer, ["new", "lead", "prospective", "trial"]) || Date.now() - customer.createdAt.getTime() < 1000 * 60 * 60 * 24 * 30;
  }

  if (key === "recent-customers") {
    return Number(customer.lifetimeValue) > 0 || customer.visits > 0;
  }

  if (key === "needs-follow-up") {
    return !customer.lastContactedAt || Date.now() - customer.lastContactedAt.getTime() > 1000 * 60 * 60 * 24 * 21;
  }

  if (key === "event-recital-interest") {
    return hasAny(customer, ["event", "recital", "class", "trial", "ballet", "jazz", "tap", "intensive"]);
  }

  if (key === "catering-private-events") {
    return hasAny(customer, ["catering", "private", "corporate", "event", "dining", "birthday"]);
  }

  if (key === "product-interest") {
    return hasAny(customer, ["product", "variety", "heat", "gift", "recipe", "wholesale", "mago", "early access"]);
  }

  return false;
}

export function filterCustomersBySegment<T extends SegmentCustomer>(customers: T[], key = "all") {
  return customers.filter((customer) => customerMatchesSegment(customer, key));
}

export function getSegmentCounts<T extends SegmentCustomer>(customers: T[], type: BusinessTypeCode) {
  return getSegmentOptions(type).map((segment) => ({
    ...segment,
    count: filterCustomersBySegment(customers, segment.key).length
  }));
}
