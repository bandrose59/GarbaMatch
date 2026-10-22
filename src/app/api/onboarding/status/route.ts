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
    console.error("Unable to verify onboarding status:", error.message);
    return response({ error: "Couldn't verify your setup. Check your connection and retry." }, 503);
  }
  return response(result);
}
