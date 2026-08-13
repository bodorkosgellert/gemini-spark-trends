import { describe, expect, it } from "vitest";

import { resolveCitedUrl } from "./ai-citation-gap";

describe("resolveCitedUrl", () => {
  it("links known product homepages", () => {
    expect(resolveCitedUrl("Solakon")).toBe("https://solakon.de");
    expect(resolveCitedUrl("Docker MCP Gateway")).toBe(
      "https://docs.docker.com/ai/mcp-catalog-and-toolkit/",
    );
    expect(resolveCitedUrl("Portkey MCP Gateway")).toBe("https://portkey.ai");
    expect(resolveCitedUrl("MintMCP")).toBe("https://www.mintmcp.com");
  });

  it("uses a domain written in parentheses", () => {
    expect(resolveCitedUrl("Vitas (telefonassistent.de)")).toBe("https://telefonassistent.de");
    expect(resolveCitedUrl("reparatur-initiativen.de")).toBe("https://reparatur-initiativen.de");
  });

  it("leaves vague demo strings unlinked", () => {
    expect(resolveCitedUrl("generic energy blogs")).toBeNull();
    expect(resolveCitedUrl("US voice-agent SaaS")).toBeNull();
  });
});
