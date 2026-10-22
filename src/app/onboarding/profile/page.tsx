import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileSetupForm from "./profile-setup-form";
import { getOnboardingStatus } from "@/lib/onboarding-status";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const memberDestinations = new Set(["discover", "matches", "profile"]);

export default async function ProfileSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; next?: string }>;
}) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    await redirectToSignIn({ returnBackUrl: "/onboarding/profile" });
  }
  if (!userId) {
    return (
      <main className="auth-screen">
        <section className="empty-state"><p>Sign in to continue to profile setup.</p></section>
      </main>
    );
  }

  const query = await searchParams;
  const destination = memberDestinations.has(query.next ?? "") ? query.next! : "discover";
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return (
      <main className="auth-screen">
        <section className="empty-state">
          <h1>Profile storage is unavailable.</h1>
          <p>We couldn’t verify or save your student profile. Check the app configuration and try again.</p>
          <Link className="button button-primary" href="/">Back to home <span>→</span></Link>
        </section>
      </main>
    );
  }

  const { result, error } = await getOnboardingStatus(supabase, userId);
  if (error) {
    console.error("Unable to verify onboarding before profile setup:", error.message);
    return (
      <main className="auth-screen">
        <section className="empty-state">
          <h1>We couldn’t verify your setup.</h1>
          <p>Your account data wasn’t changed. Retry from the home page when your connection is available.</p>
          <Link className="button button-primary" href="/">Back to home <span>→</span></Link>
        </section>
      </main>
    );
  }

  if (query.edit !== "1" && result?.status === "preferences_missing") {
    redirect(`/?onboarding=preferences&next=${destination}`);
  }
  if (query.edit !== "1" && result?.status === "complete") {
    redirect(`/?tab=${destination}`);
  }

  return <ProfileSetupForm />;
}
