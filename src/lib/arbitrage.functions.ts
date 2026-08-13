import { createServerFn } from "@tanstack/react-start";

export const listArbitrage = createServerFn({ method: "GET" }).handler(async () => {
  const { listArbitrageIdeas } = await import("./arbitrage.server");
  return listArbitrageIdeas();
});

export const scanArbitrage = createServerFn({ method: "GET" }).handler(async () => {
  const { scanArbitrageIdeas } = await import("./arbitrage.server");
  return scanArbitrageIdeas();
});
