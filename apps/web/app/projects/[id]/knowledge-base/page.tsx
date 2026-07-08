import { KnowledgeClient } from "./knowledge-client";

export const dynamic = "force-dynamic";

export default async function ProjectKnowledgeBasePage({ params }: { params: { id: string } }) {
  return (
    <KnowledgeClient projectId={params.id} />
  );
}
