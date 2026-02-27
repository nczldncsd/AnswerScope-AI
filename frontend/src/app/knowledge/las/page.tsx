import { KnowledgeArticle } from "@/components/layout/knowledge-article";

export default function LasKnowledgePage() {
  return (
    <KnowledgeArticle
      title="LAS Score"
      sections={[
        {
          heading: "Definition",
          body: "LAS (LLM Answer Score) is a weighted measure of how well your brand performs across visibility, content quality, technical readiness, and visual trust cues.",
        },
        {
          heading: "Why It Matters",
          body: "A high LAS indicates stronger inclusion potential in AI-generated answers and better overall discoverability in modern search experiences.",
        },
        {
          heading: "How Scoring Works",
          body: "AnswerScope uses weighted pillars: Visibility 40%, Content 30%, Technical 20%, and Visual 10%. This avoids over-indexing on a single metric.",
        },
        {
          heading: "How to Improve",
          body: "Expand intent-aligned pages, improve content depth, strengthen technical markup, and keep page structure clear for extraction systems.",
        },
      ]}
    />
  );
}
