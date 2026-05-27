import type { ModuleKey } from "@prisma/client";

export const allModuleKeys: ModuleKey[] = [
  "CRM",
  "INQUIRIES",
  "CAMPAIGNS",
  "ANALYTICS",
  "COMMUNICATIONS",
  "PRODUCTS",
  "MENU",
  "RESERVATIONS",
  "EDUCATION",
  "INTEGRATIONS",
  "BILLING"
];

const routeModuleMap: { prefix: string; module: ModuleKey }[] = [
  { prefix: "/dashboard/customers", module: "CRM" },
  { prefix: "/dashboard/inquiries", module: "INQUIRIES" },
  { prefix: "/dashboard/communications", module: "COMMUNICATIONS" },
  { prefix: "/dashboard/templates", module: "COMMUNICATIONS" },
  { prefix: "/dashboard/sales", module: "ANALYTICS" },
  { prefix: "/dashboard/marketing", module: "CAMPAIGNS" },
  { prefix: "/dashboard/analytics", module: "ANALYTICS" },
  { prefix: "/dashboard/integrations", module: "INTEGRATIONS" },
  { prefix: "/dashboard/billing", module: "BILLING" },
  { prefix: "/dashboard/products", module: "PRODUCTS" },
  { prefix: "/dashboard/menu", module: "MENU" },
  { prefix: "/dashboard/reservations", module: "RESERVATIONS" },
  { prefix: "/dashboard/attendance", module: "EDUCATION" },
  { prefix: "/dashboard/classes", module: "EDUCATION" },
  { prefix: "/dashboard/families", module: "EDUCATION" },
  { prefix: "/dashboard/payments", module: "EDUCATION" },
  { prefix: "/dashboard/registrations", module: "EDUCATION" },
  { prefix: "/dashboard/events", module: "EDUCATION" },
  { prefix: "/dashboard/announcements", module: "EDUCATION" }
];

export function moduleForPath(pathname: string) {
  return routeModuleMap.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`))?.module ?? null;
}

export function isModuleEnabled(enabledModules: Set<ModuleKey>, pathname: string) {
  const module = moduleForPath(pathname);
  return !module || enabledModules.has(module);
}

export function navModuleForHref(href: string) {
  return moduleForPath(href);
}
