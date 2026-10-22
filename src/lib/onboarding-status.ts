import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const genderIdentities = new Set([
  "woman",
  "man",
  "non_binary",
  "self_describe",
  "prefer_not_to_say",
]);
const meetOptions = new Set(["women", "men", "self_described_prefer_not"]);
const connectionOptions = new Set(["garba_partner", "friends"]);

export type OnboardingStatus =
  | { status: "profile_missing" }
  | { status: "preferences_missing" }
  | { status: "complete" };

export async function getOnboardingStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ result: OnboardingStatus | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("student_profiles")
    .select("display_name, branch, academic_year, gender_identity, gender_self_description, meet_genders, connection_interests, onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { result: null, error: new Error(error.message) };
  if (!data
    || !data.display_name?.trim()
    || !data.branch?.trim()
    || !data.academic_year?.trim()) {
    return { result: { status: "profile_missing" }, error: null };
  }

  const meetGenders = data.meet_genders ?? [];
  const interests = data.connection_interests ?? [];
  const hasCompletePreferences = data.onboarding_completed_at !== null
    && genderIdentities.has(data.gender_identity ?? "")
    && (data.gender_identity !== "self_describe"
      || Boolean(data.gender_self_description?.trim()))
    && meetGenders.length > 0
    && meetGenders.every((value: string) => meetOptions.has(value))
    && interests.length > 0
    && interests.every((value: string) => connectionOptions.has(value));

  return {
    result: { status: hasCompletePreferences ? "complete" : "preferences_missing" },
    error: null,
  };
}
