import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function normalizeInstagramUsername(value: string): string | null | undefined {
  const input = value.trim();
  if (!input) return null;

  const withoutAt = input.startsWith("@") ? input.slice(1) : input;
  const urlMatch = withoutAt.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)\/?$/i);
  const username = urlMatch ? urlMatch[1] : withoutAt;

  if (!/^[A-Za-z0-9._]{1,30}$/.test(username)) {
    return undefined;
  }

  return username;
}
