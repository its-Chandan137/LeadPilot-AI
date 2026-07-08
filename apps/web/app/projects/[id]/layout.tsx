import { ProjectLayout } from "@/components/layout";

export default function ProjectScopedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  return <ProjectLayout params={params}>{children}</ProjectLayout>;
}
