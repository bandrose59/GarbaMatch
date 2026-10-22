import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

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

  redirect(`/?tab=${memberSection}`);
}
