import { createMiddleware } from "@tanstack/react-start";

/**
 * Attach a Supabase session token to server functions when one exists.
 * Public pages (Discover, Radar, Connections) must not crash if Cloud env
 * is unset — there is no login on those routes.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return next({ headers: {} });
    }
    try {
      const { supabase } = await import("./client");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      return next({ headers: {} });
    }
  },
);
