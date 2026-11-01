import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Full-access client. Only for trusted server code, never sent to the browser. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
