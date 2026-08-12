import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { listIdeas, postIdea } from "@/lib/suggestions.functions";

export const Route = createFileRoute("/suggest")({
  component: SuggestPage,
  head: () => ({
    meta: [
      { title: "Post an idea — TrendSpark" },
      {
        name: "description",
        content:
          "Suggest a local demand gap TrendSpark should watch. Short pitches only — no login required.",
      },
    ],
  }),
});

function SuggestPage() {
  const runList = useServerFn(listIdeas);
  const runPost = useServerFn(postIdea);
  const { data: ideas = [], refetch, isFetching } = useQuery({
    queryKey: ["idea-suggestions"],
    queryFn: () => runList(),
    staleTime: 30_000,
  });

  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await runPost({
        data: { title, pitch, city, contactEmail, website },
      });
      setTitle("");
      setPitch("");
      setCity("");
      setContactEmail("");
      setWebsite("");
      setMessage(
        "Filed. New posts stay private until approved — the wall below shows curated ideas for the pitch.",
      );
      await refetch();
    } catch (err) {
      setError((err as Error).message || "Could not file this idea.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          Archive · no login
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
          Post an idea
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Spot a local gap the Radar should watch? One short pitch. We keep a public wall of
          approved suggestions — the archive grows even before a full community ships.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5 border-t border-border pt-6">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Working title
            </span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Repair-café scheduler for Berlin"
              className="mt-2 w-full border-b-2 border-primary bg-transparent pb-2 font-display text-xl outline-none placeholder:text-muted-foreground/50"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Pitch
            </span>
            <textarea
              required
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              maxLength={800}
              rows={4}
              placeholder="Who needs it, in which city, and why nothing good exists yet."
              className="mt-2 w-full resize-y border border-border bg-transparent p-3 text-[15px] leading-6 outline-none focus:border-primary"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                City / region (optional)
              </span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={80}
                className="mt-2 w-full border-b border-border bg-transparent pb-2 outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Email (optional, never shown)
              </span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                maxLength={160}
                className="mt-2 w-full border-b border-border bg-transparent pb-2 outline-none focus:border-primary"
              />
            </label>
          </div>
          {/* Honeypot */}
          <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Filing…" : "File suggestion"}
          </button>
          {message ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{message}</p>
          ) : null}
          {error ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-destructive">{error}</p>
          ) : null}
        </form>

        <section className="mt-14 border-t border-border pt-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-bold">On the wall</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {isFetching ? "Refreshing…" : `${ideas.length} approved`}
            </span>
          </div>
          <ul className="mt-6 space-y-6">
            {ideas.map((idea) => (
              <li key={idea.id} className="border-b border-dotted border-border pb-5">
                <h3 className="font-display text-lg font-bold leading-snug">{idea.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{idea.pitch}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  {idea.city ? `${idea.city} · ` : ""}
                  {new Date(idea.created_at).toUTCString().slice(5, 16)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
