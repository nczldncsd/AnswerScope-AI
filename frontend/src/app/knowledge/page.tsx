import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";

const ARTICLES = [
  {
    href: "/knowledge/las",
    title: "What is LAS?",
    summary: "Understand weighted visibility scoring and what moves the needle.",
  },
  {
    href: "/knowledge/sentiment",
    title: "What is Sentiment?",
    summary: "Interpret positive, neutral, and negative model framing.",
  },
  {
    href: "/knowledge/improvement",
    title: "How to Improve Metrics",
    summary: "Practical steps to improve LAS, trust-readiness, and sentiment over time.",
  },
];

export default function KnowledgeIndexPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 md:px-8">
      <GlassCard className="space-y-2">
        <h1 className="headline text-5xl">Knowledge Center</h1>
        <p className="text-text-secondary">
          Definitions, scoring interpretation, and practical optimization guidance.
        </p>
      </GlassCard>
      <section className="grid gap-4 md:grid-cols-2">
        {ARTICLES.map((article) => (
          <Link key={article.href} href={article.href} className="glass-card glass-card-interactive p-6">
            <h2 className="headline text-2xl">{article.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">{article.summary}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
