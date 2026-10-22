import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/onboarding-status";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const protectedSections = new Set(["discover", "matches", "profile"]);

export default async function ProtectedSectionPage({
  params,
}: {
  params: Promise<{ memberSection: string }>;
}) {
  const { memberSection } = await params;
  if (!protectedSections.has(memberSection)) notFound();

  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    await redirectToSignIn({ returnBackUrl: `/${memberSection}` });
  }
  if (!userId) return <OnboardingCheckError />;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return <OnboardingCheckError />;
  }
  const { result, error } = await getOnboardingStatus(supabase, userId);
  if (error) {
    console.error("Unable to verify onboarding before protected route:", error.message);
    return <OnboardingCheckError />;
  }
  if (result?.status === "profile_missing") {
    redirect(`/onboarding/profile?next=${memberSection}`);
  }
  if (result?.status === "preferences_missing") {
    redirect(`/?onboarding=preferences&next=${memberSection}`);
  }

  redirect(`/?tab=${memberSection}`);
}

function OnboardingCheckError() {
  return (
    <main className="app">
      <section className="empty-state">
        <h1>We couldn’t verify your setup.</h1>
        <p>Your account wasn’t changed. Try again when your connection is available.</p>
        <Link className="button button-primary" href="/">Retry <span>→</span></Link>
      </section>
    </main>
  );
}
