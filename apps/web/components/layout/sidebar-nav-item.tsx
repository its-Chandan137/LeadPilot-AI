import Link from "next/link";
import { cn } from "@/lib/utils";

export function SidebarNavItem({ href, label, isActive, children }: { href: string; label: string; isActive: boolean; children: React.ReactNode }) {
  return (
    <Link
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB] hover:text-[#7C3AED]",
        isActive && "bg-[#EDE9FE] pl-[13px] text-[#7C3AED] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-7 before:w-[3px] before:rounded-full before:bg-[#7C3AED]"
      )}
      href={href}
    >
      {children}
      {label}
    </Link>
  );
}
