import { toNumber, toRecord } from "@/lib/utils";

export interface ChartSeries {
  labels: string[];
  values: number[];
}

interface ChartsShape {
  pillar_bar?: unknown;
  sentiment_donut?: unknown;
  priority_stack?: unknown;
  authority_vs_visibility?: unknown;
}

function normalizeSeries(source: unknown, fallbackLabels: string[]): ChartSeries {
  const value = toRecord(source);
  const labelsRaw = Array.isArray(value.labels) ? value.labels : fallbackLabels;
  const valuesRaw = Array.isArray(value.values) ? value.values : [];

  const labels = labelsRaw.map((label) => String(label));
  const values = labels.map((_, index) => toNumber(valuesRaw[index], 0));

  return { labels, values };
}

export function normalizeCharts(
  chartsInput: unknown,
  citationAuthority: number,
  visibility: number
) {
  const charts = toRecord(chartsInput) as ChartsShape;

  return {
    pillarBar: normalizeSeries(charts.pillar_bar, [
      "Visibility",
      "Content",
      "Technical",
      "Visual",
    ]),
    sentimentDonut: normalizeSeries(charts.sentiment_donut, [
      "Positive",
      "Neutral",
      "Negative",
    ]),
    priorityStack: normalizeSeries(charts.priority_stack, ["High", "Medium", "Low"]),
    authorityVsVisibility: normalizeSeries(charts.authority_vs_visibility, [
      "Citation Authority",
      "Visibility",
    ]).values.some((value) => value > 0)
      ? normalizeSeries(charts.authority_vs_visibility, [
          "Citation Authority",
          "Visibility",
        ])
      : {
          labels: ["Citation Authority", "Visibility"],
          values: [citationAuthority, visibility],
        },
  };
}
