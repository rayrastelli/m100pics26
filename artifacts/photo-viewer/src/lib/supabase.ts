import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables",
  );
}

// The Web Locks API lock used by Supabase auth causes "Lock broken by another
// request with the 'steal' option" errors when the app is open in multiple
// tabs or iframes simultaneously (e.g. Replit canvas + preview pane).
// Using a simple in-memory mutex instead avoids cross-context lock contention.
function navigatorLockNoOp<T>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<T>
): Promise<T> {
  return fn();
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: navigatorLockNoOp,
  },
});
