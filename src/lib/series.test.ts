import { describe, expect, it } from "vitest";

import { seriesDelta } from "./series";

describe("seriesDelta", () => {
  it("returns null until there are enough points", () => {
    expect(seriesDelta([1, 2, 3])).toBeNull();
  });

  it("compares the recent window to the earlier window of the same series", () => {
    const rising = [10, 10, 10, 10, 20, 20, 20, 20];
    expect(seriesDelta(rising)?.pct).toBe(100);
  });
});
