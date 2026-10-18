import Link from "next/link";
import { AppHeader, EmptyState, MatchCard, PageContainer, PrimaryButton } from "@/components/app-shell";
import { demoMatches } from "@/lib/demo-data";

export default function MatchesPage() {
  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-800">
      <AppHeader title="Matches" subtitle="Your mutual connections" />
      <PageContainer>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Mutual vibes</h2>
          <Link href="/discover"><PrimaryButton className="px-4 py-2 text-xs">Discover more</PrimaryButton></Link>
        </div>

        {demoMatches.length === 0 ? (
          <EmptyState
            title="No matches yet"
            description="Start swiping to discover students who match your Garba mood."
            action={<Link href="/discover"><PrimaryButton>Back to Discover</PrimaryButton></Link>}
          />
        ) : (
          <div className="space-y-4">
            {demoMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
