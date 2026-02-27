import { describe, expect, it } from "vitest";

import { normalizeAnalysisResult } from "@/lib/normalizers/analysis";

describe("normalizeAnalysisResult", () => {
  it("prefers structured analysis keys", () => {
    const normalized = normalizeAnalysisResult({
      scan_id: 10,
      keyword: "best crm",
      las_score: 55,
      trust_score: 64,
      citation_authority: 64,
      analysis: {
        scores: {
          visibility: 51,
          content: 62,
          technical: 47,
          visual: 40,
        },
        sentiment: {
          label: "Neutral",
          score: 58,
        },
        action_plan: [
          {
            priority: "High",
            owner_hint: "SEO Manager",
            title: "Improve schema",
            step_by_step: ["Audit current schema", "Add product schema"],
            success_metric: "Schema pass rate",
            why_this_matters: "Improves authority signal",
            evidence_reference: "Technical audit",
            eta_days: 7,
          },
        ],
      },
    });

    expect(normalized.scanId).toBe(10);
    expect(normalized.scores.content).toBe(62);
    expect(normalized.actionPlan[0].title).toBe("Improve schema");
    expect(normalized.citationAuthority).toBe(64);
  });

  it("falls back to legacy keys without crashing", () => {
    const normalized = normalizeAnalysisResult({
      trust_score: 43,
      analysis: {
        visibility: 30,
        content: 20,
        technical: 10,
        visual: 5,
        actions: ["Fix headings"],
        what_is_working: ["Some ranking present"],
        what_is_missing: ["Schema missing"],
      },
    });

    expect(normalized.citationAuthority).toBe(43);
    expect(normalized.scores.visibility).toBe(30);
    expect(normalized.actionPlan.length).toBe(1);
    expect(normalized.legacy.whatIsMissing).toContain("Schema missing");
  });
});
