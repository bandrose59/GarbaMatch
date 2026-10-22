import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { hasSameOrigin } from "@/lib/api-security";
import { getOnboardingStatus } from "@/lib/onboarding-status";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const photoBucket = "profile-photos";

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

async function signPhotos(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>, userId: string, paths: string[]) {
  const results = await Promise.all(paths.map(async (path) => {
    if (!path.startsWith(`${userId}/`)) {
      console.error("A discovery photo path does not belong to its profile owner.");
      return null;
    }
    const { data, error } = await supabase.storage.from(photoBucket).createSignedUrl(path, 60 * 60);
    if (error) {
      console.error("Unable to sign a discovery profile photo:", error.message);
      return null;
    }
    return data.signedUrl;
  }));
  return results;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return response({ error: "Sign in to discover students." }, 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) return response({ error: "Matching storage is not configured yet." }, 503);

  const { result: onboarding, error: profileError } = await getOnboardingStatus(supabase, userId);
  if (profileError) {
    console.error("Unable to check discovery setup:", profileError.message);
    return response({ error: "Couldn't load your discovery setup. Please try again." }, 500);
  }
  if (onboarding?.status === "profile_missing") return response({ candidate: null, needsProfile: true });
  if (onboarding?.status === "preferences_missing") return response({ candidate: null, needsPreferences: true });

  const { data, error } = await supabase.rpc("get_discovery_candidates", { p_actor_id: userId });
  if (error) {
    console.error("Unable to load discovery candidate:", error.message);
    return response({ error: "Couldn't load students. Please try again." }, 500);
  }

  const candidate = data?.[0];
  if (!candidate) return response({ candidate: null });

  const photoUrls = await signPhotos(supabase, candidate.user_id, candidate.photo_paths ?? []);
  if (photoUrls.some((url) => url === null)) {
    return response({ error: "Couldn't display this student's photos. Please try again." }, 500);
  }

  return response({
    candidate: {
      userId: candidate.user_id,
      displayName: candidate.display_name,
      branch: candidate.branch,
      academicYear: candidate.academic_year,
      photos: photoUrls,
    },
  });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return response({ error: "Sign in to respond to a profile." }, 401);
  if (!hasSameOrigin(request)) return response({ error: "This request must come from the app." }, 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return response({ error: "Matching storage is not configured yet." }, 503);

  const { result: onboarding, error: statusError } = await getOnboardingStatus(supabase, userId);
  if (statusError) {
    console.error("Unable to verify swipe access:", statusError.message);
    return response({ error: "Couldn't verify your setup. Please retry." }, 503);
  }
  if (onboarding?.status !== "complete") {
    return response({ error: "Finish your student profile and matching preferences first." }, 409);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return response({ error: "Submit a valid profile response." }, 400);
  }
  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return response({ error: "Submit a valid profile response." }, 400);
  }
  const body = parsedBody as Record<string, unknown>;

  if (typeof body.targetId !== "string" || body.targetId.length < 1 || body.targetId.length > 255
    || (body.action !== "like" && body.action !== "pass")) {
    return response({ error: "Choose a valid profile response." }, 400);
  }

  const { data, error } = await supabase.rpc("record_student_swipe", {
    p_actor_id: userId,
    p_target_id: body.targetId,
    p_action: body.action,
  });
  if (error) {
    if (error.code === "22023") return response({ error: "This profile is no longer available." }, 409);
    console.error("Unable to save discovery response:", error.message);
    return response({ error: "Couldn't save your response. Please try again." }, 500);
  }

  return response({ matched: data === true });
}
