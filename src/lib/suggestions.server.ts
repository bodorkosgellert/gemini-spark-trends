import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import seedFile from "@/data/idea-suggestions.json";

export type IdeaSuggestion = {
  id: string;
  title: string;
  pitch: string;
  city: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type SubmitIdeaInput = {
  title: string;
  pitch: string;
  city?: string;
  contactEmail?: string;
  /** Honeypot — must stay empty. */
  website?: string;
};

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const localPath = join(root, "server/idea-suggestions.local.json");

function seedApproved(): IdeaSuggestion[] {
  return (seedFile as { suggestions: IdeaSuggestion[] }).suggestions.filter(
    (s) => s.status === "approved",
  );
}

async function readLocal(): Promise<IdeaSuggestion[]> {
  try {
    const raw = await readFile(localPath, "utf8");
    const parsed = JSON.parse(raw) as { suggestions?: IdeaSuggestion[] };
    return parsed.suggestions ?? [];
  } catch {
    return [];
  }
}

async function appendLocal(row: IdeaSuggestion): Promise<void> {
  const existing = await readLocal();
  existing.unshift(row);
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(
    localPath,
    JSON.stringify({ updatedAt: new Date().toISOString(), suggestions: existing }, null, 2),
    "utf8",
  );
}

function clean(input: SubmitIdeaInput): {
  title: string;
  pitch: string;
  city?: string;
  contactEmail?: string;
} {
  const title = input.title?.trim() ?? "";
  const pitch = input.pitch?.trim() ?? "";
  const city = input.city?.trim();
  const contactEmail = input.contactEmail?.trim();
  if (title.length < 3 || title.length > 120) throw new Error("Title must be 3–120 characters.");
  if (pitch.length < 10 || pitch.length > 800) throw new Error("Pitch must be 10–800 characters.");
  if (city && city.length > 80) throw new Error("City is too long.");
  if (contactEmail && contactEmail.length > 160) throw new Error("Email is too long.");
  return {
    title,
    pitch,
    ...(city ? { city } : {}),
    ...(contactEmail ? { contactEmail } : {}),
  };
}

/** Approved wall: seed + local approved + Supabase approved (best-effort). */
export async function listApprovedIdeas(): Promise<IdeaSuggestion[]> {
  const byId = new Map<string, IdeaSuggestion>();
  for (const s of seedApproved()) byId.set(s.id, s);
  for (const s of await readLocal()) {
    if (s.status === "approved") byId.set(s.id, s);
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (url && key) {
      const client = createClient(url, key);
      const { data } = await client
        .from("idea_suggestions")
        .select("id, title, pitch, city, status, created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(40);
      for (const row of data ?? []) {
        byId.set(row.id, row as IdeaSuggestion);
      }
    }
  } catch {
    // Table may not be migrated yet — seed + local still demo.
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function submitIdea(input: SubmitIdeaInput): Promise<{ id: string; stored: string }> {
  if (input.website?.trim()) {
    // Silent success for bots
    return { id: "ignored", stored: "honeypot" };
  }
  const cleaned = clean(input);
  const row: IdeaSuggestion = {
    id: crypto.randomUUID(),
    title: cleaned.title,
    pitch: cleaned.pitch,
    city: cleaned.city ?? null,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (url && key) {
      const client = createClient(url, key);
      const { data, error } = await client
        .from("idea_suggestions")
        .insert({
          title: cleaned.title,
          pitch: cleaned.pitch,
          city: cleaned.city ?? null,
          contact_email: cleaned.contactEmail ?? null,
          status: "pending",
        })
        .select("id")
        .single();
      if (!error && data?.id) {
        return { id: data.id as string, stored: "supabase" };
      }
    }
  } catch {
    // fall through to file
  }

  await appendLocal(row);
  return { id: row.id, stored: "local" };
}
