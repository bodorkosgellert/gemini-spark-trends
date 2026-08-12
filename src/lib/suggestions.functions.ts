import { createServerFn } from "@tanstack/react-start";

import type { IdeaSuggestion, SubmitIdeaInput } from "./suggestions.server";

export const listIdeas = createServerFn({ method: "GET" }).handler(
  async (): Promise<IdeaSuggestion[]> => {
    const { listApprovedIdeas } = await import("./suggestions.server");
    return listApprovedIdeas();
  },
);

export const postIdea = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = data as SubmitIdeaInput;
    if (!d || typeof d !== "object") throw new Error("Invalid payload");
    const out: SubmitIdeaInput = {
      title: String(d.title ?? ""),
      pitch: String(d.pitch ?? ""),
    };
    if (d.city != null && String(d.city).length > 0) out.city = String(d.city);
    if (d.contactEmail != null && String(d.contactEmail).length > 0) {
      out.contactEmail = String(d.contactEmail);
    }
    if (d.website != null && String(d.website).length > 0) out.website = String(d.website);
    return out;
  })
  .handler(async ({ data }) => {
    const { submitIdea } = await import("./suggestions.server");
    return submitIdea(data);
  });
