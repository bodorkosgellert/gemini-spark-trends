import { Link } from "@tanstack/react-router";
import { GeoPicker } from "@/components/GeoPicker";

const links = [
  { to: "/radar", label: "Radar" },
  { to: "/discover", label: "Discover" },
  { to: "/arbitrage", label: "Market Gaps" },
  { to: "/crosswalk", label: "Crosswalk" },
  { to: "/store", label: "Store" },
  { to: "/graph", label: "Connections" },
  { to: "/suggest", label: "Suggest" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-display text-lg font-extrabold tracking-tight">TrendSpark</span>
        </Link>
        <div className="ml-auto">
          <GeoPicker />
        </div>
        <nav className="flex w-full flex-wrap items-center gap-1 border-t border-border pt-2 lg:ml-auto lg:w-auto lg:border-0 lg:pt-0">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="whitespace-nowrap rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&.active]:bg-secondary [&.active]:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
