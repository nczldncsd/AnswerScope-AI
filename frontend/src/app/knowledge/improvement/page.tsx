import { KnowledgeArticle } from "@/components/layout/knowledge-article";

export default function ImprovementKnowledgePage() {
  return (
    <KnowledgeArticle
      title="How to Improve Metrics"
      sections={[
        {
          heading: "Improve LAS",
          body: "Prioritize high-intent keyword coverage, remove thin content, and ensure every strategic page answers concrete user questions.",
        },
        {
          heading: "Improve Citation Authority",
          body: "Increase evidence quality, use structured metadata, and maintain consistency across core pages.",
        },
        {
          heading: "Improve Sentiment",
          body: "Align messaging with outcomes, reduce ambiguous claims, and provide transparent proof of value and reliability.",
        },
        {
          heading: "Operational Workflow",
          body: "Run monthly scans, compare trends, execute high-priority actions first, then re-scan and validate uplift against metrics.",
        },
      ]}
    />
  );
}
