import { auth } from "@clerk/nextjs/server";
import { getOnboardingStatus } from "@/lib/onboarding-status";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const photoBucket = "profile-photos";

type MatchRow = {
  other_user_id: string;
  display_name: string;
  branch: string;
  academic_year: string;
  photo_paths: string[] | null;
  instagram_username: string | null;
  connection_interests: string[];
  matched_at: string;
};

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return response({ error: "Sign in to view matches." }, 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) return response({ error: "Matching storage is not configured yet." }, 503);

  const { result: onboarding, error: statusError } = await getOnboardingStatus(supabase, userId);
  if (statusError) {
    console.error("Unable to verify match access:", statusError.message);
    return response({ error: "Couldn't verify your setup. Please retry." }, 503);
  }
  if (onboarding?.status !== "complete") {
    return response({ error: "Finish your student profile and matching preferences first." }, 409);
  }

  const { data, error } = await supabase.rpc("get_student_matches", { p_actor_id: userId });
  if (error) {
    console.error("Unable to load student matches:", error.message);
    return response({ error: "Couldn't load matches. Please try again." }, 500);
  }

  const matches = await Promise.all(((data ?? []) as MatchRow[]).map(async (match) => {
    const paths: string[] = match.photo_paths ?? [];
    const photos = await Promise.all(paths.map(async (path) => {
      if (!path.startsWith(`${match.other_user_id}/`)) {
        console.error("A matched profile photo path does not belong to its profile owner.");
        return null;
      }
      const { data: signed, error: signError } = await supabase.storage
        .from(photoBucket)
        .createSignedUrl(path, 60 * 60);
      if (signError) {
        console.error("Unable to sign a matched profile photo:", signError.message);
        return null;
      }
      return signed.signedUrl;
    }));
    return {
      userId: match.other_user_id,
      displayName: match.display_name,
      branch: match.branch,
      academicYear: match.academic_year,
      photos,
      instagramUsername: typeof match.instagram_username === "string"
        && /^[A-Za-z0-9._]{1,30}$/.test(match.instagram_username)
        ? match.instagram_username
        : null,
      connectionInterests: match.connection_interests,
      matchedAt: match.matched_at,
    };
  }));

  if (matches.some((match) => match.photos.some((photo) => photo === null))) {
    return response({ error: "Couldn't display a matched profile photo. Please try again." }, 500);
  }

  return response({ matches });
}
