import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AskInput = z.object({ question: z.string().min(4).max(400) });

export const askTrendGraph = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }) => {
    const { askGraph } = await import("./cognee.server");
    try {
      return await askGraph(data.question);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("COGNEE_API_KEY")) {
        throw new Error("The graph is not connected yet.");
      }
      throw new Error(`The graph could not answer that: ${message}`);
    }
  });