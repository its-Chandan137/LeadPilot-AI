"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type BreadcrumbsProps = {
  projectName?: string;
};

const segmentLabels: Record<string, string> = {
  "": "Home",
  dashboard: "Home",
  projects: "Projects",
  "new": "New Project",
  overview: "Overview",
  conversations: "Conversations",
  leads: "Leads",
  "knowledge-base": "Knowledge Base",
  "widget-settings": "Widget Settings",
  analytics: "Analytics",
};

export function Breadcrumbs({ projectName }: BreadcrumbsProps) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || pathname === "/dashboard") {
    return (
      <div className="flex items-center gap-1.5 text-sm text-[#6B7280] italic">
        <span className="text-[#7C3AED] font-medium not-italic">Home</span>
      </div>
    );
  }

  const breadcrumbs: { label: string; href: string }[] = [];
  let accumulated = "";

  for (const segment of segments) {
    accumulated += "/" + segment;

    if (segmentLabels[segment]) {
      breadcrumbs.push({ label: segmentLabels[segment], href: accumulated });
    } else if (segment === "projects" && segments[segments.length - 1] !== segment) {
      // skip the project ID segment itself, we'll handle it separately
      continue;
    } else if (projectName && segment.length > 5 && segments.indexOf(segment) > 0) {
      // this is likely a project ID
      breadcrumbs.push({ label: projectName, href: accumulated });
    }
  }

  if (breadcrumbs.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-[#6B7280] italic">
        <Link href="/dashboard" className="hover:text-[#7C3AED] transition-colors not-italic">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-[#6B7280] italic">
      <Link href="/dashboard" className="hover:text-[#7C3AED] transition-colors not-italic">
        Home
      </Link>
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <span className="text-[#9CA3AF] not-italic">/</span>
            {isLast ? (
              <span className="text-[#7C3AED] font-medium not-italic">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-[#7C3AED] transition-colors not-italic">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}
