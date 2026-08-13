import { readFileSync } from "node:fs";

const TABLES = ["signal_market_snapshots", "signal_observations", "app_seeds"];

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((entry) => entry.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function supabaseHeaders(key) {
  const headers = {
    accept: "application/json",
    apikey: key,
    prefer: "count=exact",
  };
  if (!key.startsWith("sb_")) headers.authorization = `Bearer ${key}`;
  return headers;
}

function countFromRange(value) {
  const total = value?.split("/")[1];
  return total && total !== "*" ? Number(total) : null;
}

function assertExpectedProject(supabaseUrl) {
  const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const expected = config.match(/project_id\s*=\s*"([^"]+)"/)?.[1];
  if (!expected) throw new Error("supabase/config.toml has no project_id");

  const hostname = new URL(supabaseUrl).hostname;
  const actual = hostname.endsWith(".supabase.co")
    ? hostname.slice(0, -".supabase.co".length)
    : null;
  if (actual !== expected) {
    throw new Error(
      `Safety stop: SUPABASE_URL targets ${actual ?? hostname}, but supabase/config.toml identifies ${expected}. No migration or backfill was attempted.`,
    );
  }
  return { expected, hostname };
}

async function verifySchema(supabaseUrl, publishableKey) {
  const counts = {};
  for (const table of TABLES) {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}?select=id&limit=1`,
      { headers: supabaseHeaders(publishableKey) },
    );
    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Supabase rejected the publishable key for ${new URL(supabaseUrl).hostname} (${response.status}). The URL and key likely belong to different projects. ${detail.slice(0, 180)}`,
        );
      }
      throw new Error(
        `${table} is unavailable (${response.status}). Apply the city-first migration to the existing TrendSpark project first. ${detail.slice(0, 180)}`,
      );
    }
    counts[table] = countFromRange(response.headers.get("content-range"));
  }

  const briefResponse = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/signal_briefs?select=geo_key,observation_set_hash,direction_hash,cache_key&limit=1`,
    { headers: supabaseHeaders(publishableKey) },
  );
  if (!briefResponse.ok) {
    throw new Error(
      `signal_briefs does not expose the city-first cache columns (${briefResponse.status}).`,
    );
  }

  return counts;
}

async function backfill() {
  const baseUrl = argument("base-url", process.env.ROLLOUT_BASE_URL)?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error(
      "Backfill requested without --base-url=https://your-deployment.example or ROLLOUT_BASE_URL.",
    );
  }
  const secret = requiredEnvironment("INGEST_HOOK_SECRET");
  const limit = Math.max(1, Math.min(20, Number(argument("limit", "5")) || 5));
  const countryCode = argument("country", "DE").toUpperCase();
  const city = argument("city", "Berlin");
  const languageCode = argument("language", "de");
  const loomKeywords = [
    "heat pump installer",
    "balcony solar",
    "mcp server",
    "ai receptionist",
    "e invoicing germany",
  ];
  const keywords = process.argv.includes("--loom")
    ? loomKeywords
    : argument("keywords", "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const response = await fetch(`${baseUrl}/api/public/hooks/ingest`, {
    method: "POST",
    headers: {
      accept: "application/json",
      apikey: secret,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      limit,
      countryCode,
      city,
      languageCode,
      ...(keywords.length ? { keywords } : {}),
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Bounded ingest failed (${response.status}): ${JSON.stringify(body).slice(0, 300)}`,
    );
  }
  if (body.snapshotWrites === 0) {
    throw new Error(
      `Ingest processed ${body.processed ?? 0} signals but wrote no market snapshots.`,
    );
  }
  return body;
}

async function main() {
  const supabaseUrl = requiredEnvironment("SUPABASE_URL");
  const publishableKey = requiredEnvironment("SUPABASE_PUBLISHABLE_KEY");
  const project = assertExpectedProject(supabaseUrl);
  const countsBefore = await verifySchema(supabaseUrl, publishableKey);
  console.log(
    JSON.stringify(
      {
        step: "schema_verified",
        projectRef: project.expected,
        projectHost: project.hostname,
        counts: countsBefore,
      },
      null,
      2,
    ),
  );

  if (!process.argv.includes("--backfill")) return;

  const ingest = await backfill();
  const countsAfter = await verifySchema(supabaseUrl, publishableKey);
  console.log(
    JSON.stringify(
      {
        step: "berlin_backfill_complete",
        market: ingest.market,
        measurementScope: ingest.measurementScope,
        processed: ingest.processed,
        snapshotWrites: ingest.snapshotWrites,
        failed: ingest.failed,
        counts: countsAfter,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`[city-first-rollout] ${error.message}`);
  process.exitCode = 1;
});
