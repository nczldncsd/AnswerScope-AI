import { describe, expect, it } from "vitest";

import {
  ANALYSIS_POLL_INTERVAL_MS,
  getAnalysisStatusRefetchInterval,
} from "@/hooks/api/use-analysis";

describe("getAnalysisStatusRefetchInterval", () => {
  it("polls every 2 seconds while running", () => {
    expect(
      getAnalysisStatusRefetchInterval({
        success: true,
        job_id: "job-1",
        status: "running",
      })
    ).toBe(ANALYSIS_POLL_INTERVAL_MS);
  });

  it("stops polling on terminal states", () => {
    expect(
      getAnalysisStatusRefetchInterval({
        success: true,
        job_id: "job-1",
        status: "completed",
      })
    ).toBe(false);
    expect(
      getAnalysisStatusRefetchInterval({
        success: true,
        job_id: "job-1",
        status: "failed",
      })
    ).toBe(false);
  });
});
