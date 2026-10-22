import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getOnboardingStatus } from "@/lib/onboarding-status";

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return response({ error: "Sign in to continue." }, 401);
  const supabase = getSupabaseAdmin();
  if (!supabase) return response({ error: "Profile storage is not configured yet." }, 503);

  const { result, error } = await getOnboardingStatus(supabase, userId);
  if (error) {
    console.error("Unable to verify onboarding status:", { code: error.code, message: error.message });
    if (["42703", "42P01", "PGRST204", "PGRST205"].includes(error.code)) {
      return response({
        error: "The Supabase onboarding schema is incomplete. Apply the GarbaMatch migrations, then retry.",
        diagnostic: "SUPABASE_SCHEMA_NOT_READY",
      }, 503);
    }
    if (error.code === "42501") {
      return response({
        error: "Supabase denied the onboarding lookup. Check the server-side database key and permissions.",
        diagnostic: "SUPABASE_PERMISSION_DENIED",
      }, 503);
    }
    if (error.code === "NETWORK_ERROR") {
      return response({
        error: "GarbaMatch could not reach Supabase. Check the database URL and network, then retry.",
        diagnostic: "SUPABASE_UNREACHABLE",
      }, 503);
    }
    return response({
      error: "Supabase could not verify your saved setup. Check server logs and retry.",
      diagnostic: `SUPABASE_QUERY_${error.code}`,
    }, 503);
  }
  return response(result);
}
