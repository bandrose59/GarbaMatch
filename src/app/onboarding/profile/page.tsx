import { auth } from "@clerk/nextjs/server";
import ProfileSetupForm from "./profile-setup-form";

export default async function ProfileSetupPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    await redirectToSignIn({ returnBackUrl: "/onboarding/profile" });
  }

  return <ProfileSetupForm />;
}
