import "server-only";

import { redirect } from "next/navigation";
import { hasDashboardAccess } from "@/lib/billing";
import { requireBusinessUser } from "@/lib/auth";
import { allModuleKeys, isModuleEnabled } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";

export async function requireActiveTenant(currentPath = "") {
  const user = await requireBusinessUser();

  if (!hasDashboardAccess(user.business.subscriptionStatus) && !currentPath.startsWith("/dashboard/billing")) {
    redirect("/dashboard/billing?restricted=subscription");
  }

  const modules = await prisma.module.findMany({
    where: {
      businessId: user.business.id
    },
    select: {
      key: true,
      enabled: true
    }
  });
  const enabledModules = modules.length ? modules.filter((module) => module.enabled).map((module) => module.key) : allModuleKeys;

  if (currentPath && !currentPath.startsWith("/dashboard/module-disabled")) {
    if (!isModuleEnabled(new Set(enabledModules), currentPath)) {
      redirect("/dashboard/module-disabled");
    }
  }

  return {
    ...user,
    enabledModules
  };
}
