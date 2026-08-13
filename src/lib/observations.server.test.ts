import { describe, expect, it } from "vitest";

import { classifyEvidence, evidenceHash } from "./observations.server";
import { provenanceLabel } from "./observations.types";

describe("observation evidence", () => {
  it.each([
    ["I keep all the bookings in a Google Sheets spreadsheet", "workaround"],
    ["Why isn't there an app for this painful workflow?", "complaint"],
    ["We switch between three tools and stitch the output", "fragmentation"],
    ["Coordinating volunteer availability takes all week", "coordination"],
    ["A new API makes these sensor readings available", "new-capability"],
    ["The new invoice regulation changes the workflow", "new-constraint"],
    ["We retype every paper form manually", "manual-workflow"],
    ["Where can I find a local directory?", "discovery"],
  ])("classifies %s", (text, expected) => {
    expect(classifyEvidence(text)).toBe(expected);
  });

  it("hashes duplicate evidence deterministically", () => {
    const hit = { source: "Hacker News", url: "https://example.test/1", text: "I use Excel" };
    expect(evidenceHash(hit)).toBe(evidenceHash(hit));
    expect(evidenceHash({ ...hit, text: "I use Notion" })).not.toBe(evidenceHash(hit));
  });

  it("labels provenance without blurring evidence and interpretation", () => {
    expect(provenanceLabel("measured")).toContain("source evidence");
    expect(provenanceLabel("derived")).toContain("interpretation");
  });
});
