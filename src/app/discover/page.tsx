"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader, EmptyState, ErrorState, LoadingState, PageContainer, PrimaryButton, ProfileCard } from "@/components/app-shell";
import { currentUser, demoProfiles } from "@/lib/demo-data";

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState(demoProfiles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<{ name: string; avatar: string } | null>(null);

  const handlePass = (id: string) => {
    setLoading(true);
    setTimeout(() => {
      setProfiles((items) => items.filter((profile) => profile.id !== id));
      setLoading(false);
    }, 350);
  };

  const handleLike = (id: string) => {
    const target = profiles.find((profile) => profile.id === id);
    if (!target) return;
    setLoading(true);
    setTimeout(() => {
      setProfiles((items) => items.filter((profile) => profile.id !== id));
      setMatchState({ name: target.name, avatar: target.avatar });
      setLoading(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-800">
      <AppHeader title="Discover" subtitle={`${currentUser.name} is live`} />
      <PageContainer>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">Campus matches</p>
            <h2 className="text-2xl font-bold text-slate-900">Your next dandiya vibe</h2>
          </div>
          <Link href="/preferences" className="rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600">
            Preferences
          </Link>
        </div>

        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingState text="Checking compatibility..." /> : null}

        {!loading && profiles.length === 0 ? (
          <EmptyState
            title="No more profiles right now"
            description="You’ve seen everyone available for the moment. Check back soon or tweak your filters."
            action={<Link href="/preferences"><PrimaryButton>Update preferences</PrimaryButton></Link>}
          />
        ) : null}

        {!loading && profiles.length > 0 ? (
          <div className="space-y-6">
            {profiles.slice(0, 1).map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onPass={() => handlePass(profile.id)}
                onLike={() => handleLike(profile.id)}
                onView={() => setError(null)}
              />
            ))}
          </div>
        ) : null}

        {matchState ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-4 border-rose-100">
                <img src={matchState.avatar} alt={matchState.name} className="h-full w-full object-cover" />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">It’s a Match!</p>
              <h3 className="mt-2 text-3xl font-black text-slate-900">You matched with {matchState.name}</h3>
              <p className="mt-2 text-sm text-slate-600">Want to send a quick IG intro after both of you opt in? Keep exploring or connect when you’re ready.</p>
              <div className="mt-5 flex gap-3">
                <Link href="/matches" className="flex-1">
                  <PrimaryButton className="w-full">View matches</PrimaryButton>
                </Link>
                <button type="button" onClick={() => setMatchState(null)} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">
                  Keep exploring
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
}
