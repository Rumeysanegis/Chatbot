import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Single source of truth for the server-side Supabase client.
// Route handlers and services must import `getSupabase()` from here —
// never call `createClient(...)` elsewhere.

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY is missing",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Dev-only diagnostic: print what role the key resolves to. Helps catch
  // "I pasted the anon key into SUPABASE_SERVICE_KEY by accident".
  if (process.env.NODE_ENV !== "production") {
    console.log("[supabase] key prefix:", serviceKey.slice(0, 12) + "...");
    if (serviceKey.startsWith("eyJ")) {
      try {
        const payload = JSON.parse(
          Buffer.from(serviceKey.split(".")[1], "base64").toString(),
        );
        const urlProjectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        console.log(
          "[supabase] JWT role:", payload.role,
          "| JWT ref:", payload.ref,
          "| URL ref:", urlProjectRef,
          payload.ref === urlProjectRef ? "(match ✓)" : "(MISMATCH ✗)",
        );
      } catch {
        console.log("[supabase] (JWT decode failed)");
      }
    } else if (serviceKey.startsWith("sb_secret_")) {
      console.log("[supabase] new-format secret key (OK)");
    } else if (serviceKey.startsWith("sb_publishable_")) {
      console.log("[supabase] new-format publishable key (WRONG — this is the public key)");
    }
  }

  return cached;
}
