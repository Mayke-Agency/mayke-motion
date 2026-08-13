import { headers } from "next/headers";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { requireActiveTenant } from "@/server/tenant";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const currentPath = headerStore.get("x-current-path") ?? "";
  const user = await requireActiveTenant(currentPath);
  const theme = `theme-${user.business.businessType.code.toLowerCase().replaceAll("_", "-")}`;

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          title: user.title
        }}
        business={user.business}
        enabledModules={user.enabledModules}
      />
      <main className="main">{children}</main>
      {["READY_FOR_PILOT", "LIVE"].includes(user.business.launchStatus) ? (
        <Link className="feedback-fab" href="/dashboard/feedback">
          Feedback
        </Link>
      ) : null}
    </div>
  );
}
