import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { hasSameOrigin } from "@/lib/api-security";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const genderIdentities = new Set([
  "woman",
  "man",
  "non_binary",
  "self_describe",
  "prefer_not_to_say",
]);
const meetOptions = new Set(["women", "men", "self_described_prefer_not"]);
const connectionOptions = new Set(["garba_partner", "friendship", "romantic"]);

function response(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return response({ error: "Sign in to view matching preferences." }, 401);

  const supabase = getSupabaseAdmin();
  if (!supabase) return response({ error: "Matching storage is not configured yet." }, 503);

  const { data, error } = await supabase
    .from("student_profiles")
    .select("gender_identity, gender_self_description, meet_genders, connection_interests")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load matching preferences:", error.message);
    return response({ error: "Couldn't load matching preferences. Please try again." }, 500);
  }

  return response({
    preferences: data?.gender_identity
      ? {
          genderIdentity: data.gender_identity,
          genderSelfDescription: data.gender_self_description ?? "",
          meetGenders: data.meet_genders ?? [],
          connectionInterests: data.connection_interests ?? [],
        }
      : null,
  });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return response({ error: "Sign in to save matching preferences." }, 401);
  if (!hasSameOrigin(request)) return response({ error: "This request must come from the app." }, 403);

  const supabase = getSupabaseAdmin();
  if (!supabase) return response({ error: "Matching storage is not configured yet." }, 503);

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return response({ error: "Submit valid matching preferences." }, 400);
  }
  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return response({ error: "Submit valid matching preferences." }, 400);
  }
  const body = parsedBody as Record<string, unknown>;

  const genderIdentity = body.genderIdentity;
  const genderSelfDescription = body.genderSelfDescription;
  const meetGenders = body.meetGenders;
  const connectionInterests = body.connectionInterests;
  if (typeof genderIdentity !== "string" || !genderIdentities.has(genderIdentity)) {
    return response({ error: "Choose a valid gender identity." }, 400);
  }
  if (typeof genderSelfDescription !== "string"
    || (genderIdentity === "self_describe"
      ? genderSelfDescription.trim().length < 1 || genderSelfDescription.trim().length > 60
      : genderSelfDescription.length !== 0)) {
    return response({ error: "Enter a self-description of up to 60 characters." }, 400);
  }
  if (!isStringArray(meetGenders)
    || meetGenders.length === 0
    || new Set(meetGenders).size !== meetGenders.length
    || meetGenders.some((value) => !meetOptions.has(value))) {
    return response({ error: "Choose at least one valid group you want to meet." }, 400);
  }
  if (!isStringArray(connectionInterests)
    || connectionInterests.length === 0
    || new Set(connectionInterests).size !== connectionInterests.length
    || connectionInterests.some((value) => !connectionOptions.has(value))) {
    return response({ error: "Choose at least one connection interest." }, 400);
  }

  const { error } = await supabase.rpc("save_matching_preferences", {
    p_actor_id: userId,
    p_gender_identity: genderIdentity,
    p_gender_self_description: genderIdentity === "self_describe" ? genderSelfDescription.trim() : null,
    p_meet_genders: meetGenders,
    p_connection_interests: connectionInterests,
  });
  if (error) {
    if (error.code === "P0002") {
      return response({ error: "Create your student profile before setting matching preferences." }, 409);
    }
    console.error("Unable to save matching preferences:", error.message);
    return response({ error: "Couldn't save matching preferences. Please try again." }, 500);
  }

  return response({ saved: true });
}
