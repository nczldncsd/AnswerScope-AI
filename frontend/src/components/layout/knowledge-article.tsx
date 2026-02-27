import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";

export function KnowledgeArticle({
  title,
  sections,
}: {
  title: string;
  sections: Array<{ heading: string; body: string }>;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 md:px-8">
      <Link href="/knowledge" className="text-sm text-accent hover:text-accent-hover">
        Back to Knowledge
      </Link>
      <GlassCard className="space-y-6">
        <h1 className="headline text-5xl">{title}</h1>
        {sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="headline text-2xl">{section.heading}</h2>
            <p className="text-text-secondary">{section.body}</p>
          </section>
        ))}
      </GlassCard>
    </div>
  );
}
