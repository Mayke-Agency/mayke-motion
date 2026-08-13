import type { BusinessTypeCode } from "@prisma/client";
import {
  BarChart3,
  Beef,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Home,
  Megaphone,
  MessageSquareText,
  ClipboardPenLine,
  ClipboardSignature,
  Settings,
  ShieldCheck,
  Trophy,
  TextCursorInput,
  Users,
  UserRound,
  FileText,
  CalendarClock,
  Landmark,
  MonitorCog,
  Handshake,
  LineChart
} from "lucide-react";

export const businessTypeCopy: Record<
  BusinessTypeCode,
  {
    label: string;
    noun: string;
    revenueLabel: string;
    primaryCatalogLabel: string;
    inquiryLabel: string;
    salesLabel: string;
    heroLine: string;
    operatingFocus: string;
  }
> = {
  RESTAURANT: {
    label: "Restaurant",
    noun: "guests",
    revenueLabel: "Dining revenue",
    primaryCatalogLabel: "Menu",
    inquiryLabel: "Reservations and catering",
    salesLabel: "Orders",
    heroLine: "Reservations, regulars, and revenue in one flow.",
    operatingFocus: "hospitality, catering, private events, and guest retention"
  },
  RETAIL: {
    label: "Retail / Ecommerce",
    noun: "customers",
    revenueLabel: "Store revenue",
    primaryCatalogLabel: "Products",
    inquiryLabel: "Customer inquiries",
    salesLabel: "Orders",
    heroLine: "Commerce, customers, and campaigns moving together.",
    operatingFocus: "customer insights, order analytics, product performance, and campaigns"
  },
  DANCE_STUDIO: {
    label: "Dance Studio / Education",
    noun: "families",
    revenueLabel: "Program revenue",
    primaryCatalogLabel: "Programs",
    inquiryLabel: "Student and parent inquiries",
    salesLabel: "Registrations",
    heroLine: "Families, classes, events, and communication in rhythm.",
    operatingFocus: "student inquiries, announcements, registration reminders, and event communication"
  },
  SPORTS_CLUB: {
    label: "Sports Club",
    noun: "families",
    revenueLabel: "Club revenue",
    primaryCatalogLabel: "Teams",
    inquiryLabel: "Tryouts and player inquiries",
    salesLabel: "Invoices",
    heroLine: "Players, families, teams, and club operations in one place.",
    operatingFocus: "player development, team operations, family communication, payments, and recruiting"
  }
};

export const baseNavigation = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/inquiries", label: "Inquiries", icon: ClipboardList },
  { href: "/dashboard/communications", label: "Communications", icon: MessageSquareText },
  { href: "/dashboard/templates", label: "Templates", icon: TextCursorInput },
  { href: "/dashboard/sales", label: "Sales", icon: CircleDollarSign },
  { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/integrations", label: "Integrations", icon: Boxes },
  { href: "/dashboard/notifications", label: "Notifications", icon: MessageSquareText },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function catalogNavigation(type: BusinessTypeCode) {
  if (type === "RESTAURANT") {
    return { href: "/dashboard/menu", label: "Menu", icon: Beef };
  }

  if (type === "DANCE_STUDIO") {
    return { href: "/dashboard/registrations", label: "Registrations", icon: ClipboardPenLine };
  }

  return { href: "/dashboard/products", label: "Products", icon: Boxes };
}

export function sportsNavigation(type: BusinessTypeCode) {
  if (type !== "SPORTS_CLUB") return [];

  return [
    { href: "/dashboard/players", label: "Players", icon: UserRound },
    { href: "/dashboard/club-families", label: "Families", icon: Users },
    { href: "/dashboard/coaches", label: "Coaches", icon: ShieldCheck },
    { href: "/dashboard/teams", label: "Teams", icon: Trophy },
    { href: "/dashboard/tryouts", label: "Tryouts", icon: ClipboardSignature },
    { href: "/dashboard/schedule", label: "Schedule", icon: CalendarClock },
    { href: "/dashboard/club-payments", label: "Payments", icon: Landmark },
    { href: "/dashboard/forms", label: "Forms & waivers", icon: ClipboardPenLine },
    { href: "/dashboard/documents", label: "Documents", icon: FileText },
    { href: "/dashboard/recruiting", label: "Recruiting", icon: GraduationCap },
    { href: "/dashboard/sponsors", label: "Sponsors", icon: Handshake },
    { href: "/dashboard/website", label: "Website CMS", icon: MonitorCog },
    { href: "/dashboard/reports", label: "Reports", icon: LineChart }
  ];
}

export function studioNavigation(type: BusinessTypeCode) {
  if (type !== "DANCE_STUDIO") return [];
  return [
    { href: "/dashboard/classes", label: "Classes", icon: BookOpenCheck },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardCheck },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/events", label: "Events", icon: CalendarDays }
  ];
}

export function operationsNavigation(type: BusinessTypeCode) {
  if (type === "RESTAURANT") {
    return { href: "/dashboard/reservations", label: "Reservations", icon: CalendarDays };
  }

  if (type === "DANCE_STUDIO") {
    return { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone };
  }

  return null;
}
