import { describe, expect, it } from "vitest";

import {
  evidenceSummary,
  isUnavailableDetail,
  metricLabel,
  parseTrendsPayload,
} from "./evidence-display";

describe("evidence display", () => {
  it("pretty-prints metric keys", () => {
    expect(metricLabel("monthly_searches")).toBe("monthly searches");
    expect(metricLabel("interest_last_12m")).toBe("interest last 12m");
  });

  it("does not use parser junk as the summary", () => {
    expect(isUnavailableDetail('unavailable: Unexpected token \'l\', "lang="en"')).toBe(true);
    expect(
      evidenceSummary({
        source: "Google Trends",
        detail: "unavailable: Unexpected token 'l'",
      }),
    ).toMatch(/explore link/i);
  });

  it("rejects HTML from Google Trends instead of parsing it", () => {
    expect(() => parseTrendsPayload('<html lang="en"><body>blocked</body></html>')).toThrow(
      /blocked/i,
    );
  });
});
