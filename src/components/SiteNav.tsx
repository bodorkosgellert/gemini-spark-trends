import { Link } from "@tanstack/react-router";

const links = [
  { to: "/radar", label: "Radar" },
  { to: "/crosswalk", label: "Crosswalk" },
  { to: "/store", label: "Store" },
  { to: "/graph", label: "Graph" },
  { to: "/suggest", label: "Suggest" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-display text-lg font-extrabold tracking-tight">TrendSpark</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}