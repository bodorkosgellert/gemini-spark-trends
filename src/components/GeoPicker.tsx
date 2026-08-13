import { useEffect, useRef, useState } from "react";

import { useGeo } from "@/components/geo-context";
import { COUNTRY_OPTIONS, geoLabel } from "@/lib/geo.types";

export function GeoPicker() {
  const { selection, ready, setManual, resetDetection } = useGeo();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(selection.city ?? "");
  const [country, setCountry] = useState(selection.countryCode);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCity(selection.city ?? "");
    setCountry(selection.countryCode);
  }, [selection]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!dialogRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={dialogRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-8 max-w-48 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="truncate">{ready ? geoLabel(selection) : "Locating…"}</span>
        <span aria-hidden className="text-muted-foreground">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose market"
          className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-2rem))] border border-border bg-popover p-4 text-popover-foreground shadow-lg"
        >
          <p className="font-display text-base font-bold">Where should the wire look?</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Approximate only. Your override stays in this browser; TrendSpark does not store your
            IP.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setManual(city, country);
              setOpen(false);
            }}
          >
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                City (optional)
              </span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Berlin"
                maxLength={80}
                className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Country
              </span>
              <select
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="mt-1 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {COUNTRY_OPTIONS.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  void resetDetection();
                  setOpen(false);
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Use approximate
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Set market
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
