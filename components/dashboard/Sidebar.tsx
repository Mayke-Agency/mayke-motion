"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import type { BusinessTypeCode, ModuleKey, UserRole } from "@prisma/client";
import { baseNavigation, catalogNavigation, operationsNavigation, studioNavigation } from "@/lib/business-config";
import { initials } from "@/lib/format";
import { logoutAction } from "@/lib/actions";
import { navModuleForHref } from "@/lib/module-access";

type SidebarProps = {
  user: {
    name: string;
    email: string;
    role: UserRole;
    title: string | null;
  };
  business: {
    name: string;
    description: string;
    businessType: {
      code: BusinessTypeCode;
      name: string;
    };
  };
  enabledModules: ModuleKey[];
};

export function Sidebar({ user, business, enabledModules }: SidebarProps) {
  const pathname = usePathname();
  const operations = operationsNavigation(business.businessType.code);
  const enabled = new Set(enabledModules);
  const hiddenForDance = new Set(["/dashboard/sales", "/dashboard/marketing", "/dashboard/analytics", "/dashboard/integrations", "/dashboard/billing"]);
  const navigation = [
    baseNavigation[0],
    baseNavigation[1],
    baseNavigation[2],
    baseNavigation[3],
    ...(operations ? [operations] : []),
    catalogNavigation(business.businessType.code),
    ...studioNavigation(business.businessType.code),
    ...baseNavigation.slice(4)
  ].filter((item) => {
    if (business.businessType.code === "DANCE_STUDIO" && hiddenForDance.has(item.href)) return false;
    const module = navModuleForHref(item.href);
    return !module || enabled.has(module);
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-mark">M</div>
        <div className="sidebar-title">
          <strong>Mayke Motion</strong>
          <span>by Mayke Agency</span>
        </div>
      </div>

      <div className="business-pill">
        <strong>{business.name}</strong>
        <p>{business.businessType.name} operating system</p>
      </div>

      <nav className="nav" aria-label="Dashboard navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href}>
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-strip">
          <div className="avatar">{initials(user.name)}</div>
          <div className="sidebar-title">
            <strong>{user.name}</strong>
            <span>{user.title ?? user.role.replace("_", " ").toLowerCase()}</span>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="button secondary" type="submit" style={{ width: "100%" }}>
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
