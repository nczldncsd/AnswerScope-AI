export interface BackendErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    request_id?: string | null;
  };
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  requestId?: string;
  raw: unknown;
}

export interface ApiSuccessMessage {
  success: true;
  message: string;
}

export interface AuthSuccessResponse extends ApiSuccessMessage {
  user_id: number;
}

export interface MeResponse {
  success: true;
  user_id: number;
  email: string;
  name?: string | null;
  logo_url?: string | null;
}

export interface ProfileResponse {
  success: true;
  user_id: number;
  email: string;
  name?: string | null;
  logo_url?: string | null;
  message?: string;
}

export type BrandCategory = "generic" | "ecommerce" | "saas" | "local";

export interface BrandProfile {
  id: number;
  user_id: number;
  brand_name: string;
  website_url: string;
  competitors: string[];
  brand_category: BrandCategory;
  created_at: string;
}

export interface SaveBrandResponse extends ApiSuccessMessage {
  brand_profile_id: number;
  brand_category: BrandCategory;
}

export interface BrandResponse {
  success: true;
  brand_profile: BrandProfile | null;
  message?: string;
}

export interface RunAnalysisAsyncResponse {
  success: true;
  job_id: string;
  scan_context_id: string;
  est_duration_sec: number;
  status: string;
}

export interface ScanHistoryItem {
  scan_id: number;
  keyword: string;
  timestamp: string;
  las_score: number;
  trust_score: number;
  citation_authority?: number;
  screenshot_url?: string | null;
  overview_source_type?: string | null;
  overview_fetch_mode?: string | null;
  extraction_method?: string | null;
}

export interface ScanHistoryResponse {
  success: true;
  total_scans: number;
  scans: ScanHistoryItem[];
}

export interface DashboardStatsResponse {
  success: true;
  stats: {
    total_scans: number;
    avg_las_score: number;
    avg_trust_score: number;
    avg_citation_authority?: number;
    last_scan: string | null;
  };
}

export interface PillarAveragesResponse {
  success: true;
  pillar_averages: {
    visibility: number;
    content: number;
    technical: number;
    visual: number;
  };
}

export interface DashboardInsightsResponse {
  success: true;
  insights: {
    scan_id: number;
    keyword: string;
    timestamp: string;
    screenshot_captured: boolean;
    overview_source_type?: string | null;
    overview_fetch_mode?: string | null;
    overview_confidence?: string | null;
    extraction_method?: string | null;
    stored_records: {
      scan_metrics: number;
      scan_citations: number;
      prompt_observations: number;
      scan_run_events: number;
      competitor_domains: number;
    };
    analysis_artifacts: {
      action_plan_items: number;
      technical_audit_items: number;
      diagnostics_items: number;
      executive_summary_items: number;
    };
    raw_report_present: boolean;
    breakdown_present: boolean;
  } | null;
}

export interface TrendPoint {
  recorded_at: string;
  value: number;
}

export interface TrendsResponse {
  success: true;
  metric: string;
  window: string;
  points: TrendPoint[];
}

export interface CitationDomain {
  domain: string;
  mentions: number;
  share_pct: number;
}

export interface CitationsResponse {
  success: true;
  window: string;
  domains: CitationDomain[];
}

export interface ScanResultResponse {
  success: true;
  scan_id: number;
  brand_profile_id: number;
  keyword: string;
  timestamp?: string;
  las_score: number;
  trust_score: number;
  citation_authority?: number;
  screenshot_url?: string | null;
  overview_source_type?: string | null;
  overview_fetch_mode?: string | null;
  overview_confidence?: string | null;
  extraction_method?: string | null;
  breakdown?: Record<string, unknown>;
  full_report?: Record<string, unknown>;
}

export interface AnalysisStatusResponse {
  success: true;
  job_id: string;
  scan_context_id?: string;
  est_duration_sec?: number;
  status: string;
  stage_label?: string | null;
  progress?: number;
  screenshot_url?: string | null;
  captured_at?: string | null;
  dom_loaded_ms?: number | null;
  overview_source_type?: string | null;
  overview_fetch_mode?: string | null;
  extraction_method?: string | null;
  error?: string | null;
  result?: Record<string, unknown> | null;
}
