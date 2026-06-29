import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/conversations", label: "Conversations" },
  { href: "/leads", label: "Leads" },
  { href: "/analytics", label: "Analytics" },
  { href: "/widget-settings", label: "Widget Settings" },
  { href: "/integrations", label: "Integrations" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" }
];

type DashboardLayoutProps = {
  children: React.ReactNode;
  workspaceName: string;
  userName: string;
};

export function DashboardLayout({ children, workspaceName, userName }: DashboardLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:border-b-0 lg:border-r">
          <Link className="text-lg font-semibold text-slate-950" href="/dashboard">LeadPilot AI</Link>
          <div className="mt-3 rounded-md bg-slate-100 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Workspace</p>
            <p className="text-sm font-semibold text-slate-950 truncate">{workspaceName}</p>
          </div>
          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => (
              <Link
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t pt-4">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-medium text-slate-950 truncate">{userName}</p>
          </div>
        </aside>
        <section className="px-5 py-8 md:px-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
