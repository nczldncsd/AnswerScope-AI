import type { ScanResultResponse } from "@/lib/types/contracts";
import { normalizeCharts } from "@/lib/normalizers/charts";
import { toNumber, toRecord, toStringArray, toStringValue } from "@/lib/utils";

export interface NormalizedAuditItem {
  check: string;
  status: "pass" | "warn" | "fail";
  evidence: string;
}

export interface NormalizedActionItem {
  priority: "High" | "Medium" | "Low";
  ownerHint: string;
  title: string;
  steps: string[];
  successMetric: string;
  whyThisMatters: string;
  evidenceReference: string;
  etaDays?: number;
}

export interface NormalizedPlaybookItem {
  title: string;
  ownerHint: string;
  reason: string;
}

export interface NormalizedAnalysis {
  scanId: number | null;
  keyword: string;
  url: string;
  lasScore: number;
  trustScore: number;
  citationAuthority: number;
  analysisLanguage: string;
  scores: {
    visibility: number;
    content: number;
    technical: number;
    visual: number;
  };
  scoreWeights: {
    visibility: number;
    content: number;
    technical: number;
    visual: number;
  };
  sentiment: {
    label: string;
    score: number;
  };
  marketIntel: {
    topCompetitorFound: string;
    whyTheyWon: string;
    competitorThreatLevel: string;
  };
  gapAnalysis: {
    missingKeywords: string[];
    contentGaps: string[];
  };
  technicalAudit: NormalizedAuditItem[];
  actionPlan: NormalizedActionItem[];
  recommendedPlaybook: NormalizedPlaybookItem[];
  executiveSummary: string[];
  diagnostics: Array<{ finding: string; evidence: string }>;
  legacy: {
    whatIsWorking: string[];
    whatIsMissing: string[];
  };
  charts: ReturnType<typeof normalizeCharts>;
  raw: Record<string, unknown>;
}

function hasKeys(record: Record<string, unknown>) {
  return Object.keys(record).length > 0;
}

function asPriority(value: string): "High" | "Medium" | "Low" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "high") {
    return "High";
  }
  if (normalized === "low") {
    return "Low";
  }
  return "Medium";
}

function asStatus(value: string): "pass" | "warn" | "fail" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "pass") {
    return "pass";
  }
  if (normalized === "fail") {
    return "fail";
  }
  return "warn";
}

function normalizeTechnicalAudit(value: unknown): NormalizedAuditItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const record = toRecord(entry);
    return {
      check: toStringValue(
        record.check,
        toStringValue(entry, `Technical Check ${index + 1}`)
      ),
      status: asStatus(toStringValue(record.status, "warn")),
      evidence: toStringValue(record.evidence, "No evidence provided."),
    };
  });
}

function normalizeActionPlan(value: unknown): NormalizedActionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const record = toRecord(entry);
    const title = toStringValue(
      record.title,
      toStringValue(record.action, `Action ${index + 1}`)
    );
    const etaRaw = toNumber(record.eta_days, Number.NaN);
    const steps = toStringArray(record.step_by_step);
    return {
      priority: asPriority(toStringValue(record.priority, "Medium")),
      ownerHint: toStringValue(record.owner_hint, "SEO Manager"),
      title,
      steps: steps.length > 0 ? steps : [title],
      successMetric: toStringValue(record.success_metric, "Track LAS uplift"),
      whyThisMatters: toStringValue(
        record.why_this_matters,
        "Improves your visibility and answer-readiness."
      ),
      evidenceReference: toStringValue(
        record.evidence_reference,
        "Derived from your current scan."
      ),
      etaDays: Number.isFinite(etaRaw) ? etaRaw : undefined,
    };
  });
}

function normalizePlaybook(value: unknown): NormalizedPlaybookItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    const record = toRecord(entry);
    return {
      title: toStringValue(record.title, `Playbook ${index + 1}`),
      ownerHint: toStringValue(record.owner_hint, "SEO Manager"),
      reason: toStringValue(
        record.reason,
        "Improves your authority and coverage quality."
      ),
    };
  });
}

function computeFallbackLas(scores: {
  visibility: number;
  content: number;
  technical: number;
  visual: number;
}) {
  const computed =
    scores.visibility * 0.4 +
    scores.content * 0.3 +
    scores.technical * 0.2 +
    scores.visual * 0.1;
  return Math.round(computed);
}

export function normalizeAnalysisResult(source: unknown): NormalizedAnalysis {
  const sourceRecord = toRecord(source);
  const report = hasKeys(toRecord(sourceRecord.full_report))
    ? toRecord(sourceRecord.full_report)
    : sourceRecord;

  const breakdown = toRecord(sourceRecord.breakdown);
  const analysisCandidate = toRecord(report.analysis);
  const analysis = hasKeys(analysisCandidate) ? analysisCandidate : breakdown;

  const scoreRecord = toRecord(analysis.scores);
  const scores = {
    visibility: toNumber(
      scoreRecord.visibility ?? analysis.visibility ?? report.visibility,
      0
    ),
    content: toNumber(scoreRecord.content ?? analysis.content ?? report.content, 0),
    technical: toNumber(
      scoreRecord.technical ?? analysis.technical ?? report.technical,
      0
    ),
    visual: toNumber(scoreRecord.visual ?? analysis.visual ?? report.visual, 0),
  };

  const weightsRecord = toRecord(analysis.score_weights);
  const scoreWeights = {
    visibility: toNumber(weightsRecord.visibility, 40),
    content: toNumber(weightsRecord.content, 30),
    technical: toNumber(weightsRecord.technical, 20),
    visual: toNumber(weightsRecord.visual, 10),
  };

  const trustScore = toNumber(report.trust_score, 0);
  const citationAuthority = toNumber(report.citation_authority, trustScore);
  const lasScore = toNumber(report.las_score, computeFallbackLas(scores));

  const sentimentRecord = toRecord(analysis.sentiment);
  const sentiment = {
    label: toStringValue(sentimentRecord.label, "Neutral"),
    score: toNumber(sentimentRecord.score, 0),
  };

  const marketRecord = toRecord(analysis.market_intel);
  const competitorRecord = toRecord(analysis.competitor_analysis);
  const gapRecord = toRecord(analysis.gap_analysis);

  const marketIntel = {
    topCompetitorFound: toStringValue(
      marketRecord.top_competitor_found,
      toStringValue(competitorRecord.top_competitor_found, "Not identified")
    ),
    whyTheyWon: toStringValue(
      marketRecord.why_they_won,
      "No competitor rationale was provided."
    ),
    competitorThreatLevel: toStringValue(
      marketRecord.competitor_threat_level,
      "Medium"
    ),
  };

  const gapAnalysis = {
    missingKeywords:
      toStringArray(gapRecord.missing_keywords).length > 0
        ? toStringArray(gapRecord.missing_keywords)
        : toStringArray(analysis.keyword_gaps),
    contentGaps: toStringArray(gapRecord.content_gaps),
  };

  const technicalAudit = normalizeTechnicalAudit(
    analysis.technical_audit ?? report.technical_audit
  );
  const actionPlan = normalizeActionPlan(
    analysis.action_plan ?? report.action_plan ?? analysis.actions
  );
  const recommendedPlaybook = normalizePlaybook(
    analysis.recommended_playbook ?? report.recommended_playbook
  );

  const diagnosticsSource = Array.isArray(analysis.diagnostics)
    ? analysis.diagnostics
    : [];
  const diagnostics = diagnosticsSource.map((entry) => {
    const record = toRecord(entry);
    return {
      finding: toStringValue(record.finding, "Diagnostic"),
      evidence: toStringValue(record.evidence, ""),
    };
  });

  const executiveSummary = toStringArray(analysis.executive_summary);
  const legacy = {
    whatIsWorking: toStringArray(analysis.what_is_working),
    whatIsMissing: toStringArray(analysis.what_is_missing),
  };

  const charts = normalizeCharts(
    report.charts ?? analysis.charts,
    citationAuthority,
    scores.visibility
  );

  return {
    scanId: toNumber(report.scan_id ?? sourceRecord.scan_id, 0) || null,
    keyword: toStringValue(report.keyword ?? sourceRecord.keyword),
    url: toStringValue(report.url),
    lasScore,
    trustScore,
    citationAuthority,
    analysisLanguage: toStringValue(report.analysis_language ?? analysis.language, "en"),
    scores,
    scoreWeights,
    sentiment,
    marketIntel,
    gapAnalysis,
    technicalAudit,
    actionPlan,
    recommendedPlaybook,
    executiveSummary,
    diagnostics,
    legacy,
    charts,
    raw: report,
  };
}

export function normalizeFromScanResultResponse(
  payload: ScanResultResponse
): NormalizedAnalysis {
  return normalizeAnalysisResult(payload);
}
