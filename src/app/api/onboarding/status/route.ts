import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return response({ error: "Sign in to check onboarding status." }, 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) return response({ error: "Profile storage is not configured yet." }, 503);

  const { data, error } = await supabase
    .from("student_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to check onboarding status:", error.message);
    return response({ error: "Couldn't check onboarding status. Please try again." }, 500);
  }

  return response({ profileComplete: data !== null });
}
