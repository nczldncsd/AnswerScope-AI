import { KnowledgeArticle } from "@/components/layout/knowledge-article";

export default function SentimentKnowledgePage() {
  return (
    <KnowledgeArticle
      title="Sentiment"
      sections={[
        {
          heading: "Definition",
          body: "Sentiment reflects whether your brand is discussed in positive, neutral, or negative framing within analysis outputs.",
        },
        {
          heading: "Why It Matters",
          body: "Even with good visibility, negative or weak sentiment can reduce recommendation quality and user trust in AI-assisted discovery.",
        },
        {
          heading: "How Scoring Works",
          body: "Structured sentiment includes both a label and numeric score. Visualizations should consume the chart payload directly where available.",
        },
        {
          heading: "How to Improve",
          body: "Address known product friction in content, publish stronger proof points, and align messaging with user intent and expectations.",
        },
      ]}
    />
  );
}
