import type { Database } from "@business-operations/supabase/types";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient(accessToken?: string) {
  return createSupabaseClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      global: { headers: { "x-local-rest-key": process.env.INTERNAL_API_KEY || "" } },
      accessToken() {
        return Promise.resolve(accessToken || "");
      },
    },
  );
}

export async function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { global: { headers: { "x-local-rest-key": process.env.INTERNAL_API_KEY || "" } } },
  );
}
