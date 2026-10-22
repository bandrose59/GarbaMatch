"use client";

import { Show, SignOutButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DiscoveryPanel, MatchingPreferencesPanel, MatchesPanel } from "@/app/matching/matching-panels";

type Screen = "home" | "onboarding" | "discover" | "matches" | "events" | "profile";
type OnboardingState = "loading" | "complete" | "profile_missing" | "preferences_missing" | "error" | "redirecting";
const memberDestinations = new Set(["discover", "matches", "profile"]);

const tabs: { id: Screen; label: string; icon: string }[] = [
  { id: "discover", label: "Discover", icon: "✳" },
  { id: "matches", label: "Matches", icon: "♡" },
  { id: "events", label: "Events", icon: "▦" },
  { id: "profile", label: "Profile", icon: "◉" },
];

export default function Home() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("home");
  const [preferencesReturnScreen, setPreferencesReturnScreen] = useState<"discover" | "matches" | "profile">("discover");
  const [onboardingState, setOnboardingState] = useState<OnboardingState>("loading");
  const [onboardingError, setOnboardingError] = useState("");
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const [statusRetry, setStatusRetry] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      if (new URLSearchParams(window.location.search).get("tab") === "events") {
        const timeoutId = window.setTimeout(() => setScreen("events"), 0);
        return () => window.clearTimeout(timeoutId);
      }
      return;
    }
    if (!userId) return;
    let active = true;
    void fetch("/api/onboarding/status", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { status?: OnboardingState; error?: string; diagnostic?: string };
        if (!response.ok || !body.status
          || !["profile_missing", "preferences_missing", "complete"].includes(body.status)) {
          const failure = new Error(body.error ?? "Couldn't verify your setup.");
          Object.assign(failure, { diagnostic: body.diagnostic });
          throw failure;
        }
        if (!active) return;

        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        const tab = params.get("tab");
        const destination = memberDestinations.has(next ?? "")
          ? next as "discover" | "matches" | "profile"
          : memberDestinations.has(tab ?? "")
            ? tab as "discover" | "matches" | "profile"
            : "discover";

        setVerifiedUserId(userId);
        if (body.status === "profile_missing") {
          const query = new URLSearchParams({ next: destination });
          setOnboardingState("redirecting");
          router.replace(`/onboarding/profile?${query.toString()}`);
          return;
        }
        if (body.status === "preferences_missing") {
          setOnboardingState("preferences_missing");
          setPreferencesReturnScreen(destination);
          setScreen("onboarding");
          return;
        }

        setOnboardingState("complete");
        if (params.get("onboarding") === "preferences") {
          setScreen(destination);
        } else if (tab === "events") {
          setScreen("events");
        } else if (memberDestinations.has(tab ?? "")) {
          setScreen(tab as "discover" | "matches" | "profile");
        } else {
          setScreen("discover");
        }
      })
      .catch((statusError: unknown) => {
        if (!active) return;
        console.error("Unable to verify onboarding before showing member pages:", statusError);
        setOnboardingError(statusError instanceof Error
          ? statusError.message
          : "The onboarding verification request failed. Retry to check Supabase and your connection.");
        setVerifiedUserId(userId);
        setOnboardingState("error");
      });
    return () => { active = false; };
  }, [isLoaded, isSignedIn, router, statusRetry, userId]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });
      return;
    }

    let active = true;
    navigator.serviceWorker.getRegistrations()
      .then(async (registrations) => {
        const appRegistrations = registrations.filter((registration) => {
          const worker = registration.active ?? registration.waiting ?? registration.installing;
          return worker ? new URL(worker.scriptURL).pathname === "/sw.js" : false;
        });
        if (appRegistrations.length === 0) return;

        const hadController = navigator.serviceWorker.controller !== null;
        await Promise.all(appRegistrations.map((registration) => registration.unregister()));
        const reloadKey = "garbamatch-dev-service-worker-cleared";
        if (active && hadController && !sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "true");
          window.location.reload();
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to clear the development service worker:", error);
      });

    return () => { active = false; };
  }, []);

  function openPreferences(returnScreen: "discover" | "profile") {
    setPreferencesReturnScreen(returnScreen);
    setScreen("onboarding");
  }

  if (!isLoaded || (isSignedIn && (!userId || verifiedUserId !== userId
    || onboardingState === "loading" || onboardingState === "redirecting"))) {
    return <main className="app"><div className="empty-state" role="status"><p>Checking your account setup…</p></div></main>;
  }

  if (isSignedIn && onboardingState === "error") {
    return (
      <main className="app">
        <div className="empty-state">
          <h2>We couldn’t verify your setup.</h2>
          <p>{onboardingError || "Your account data wasn’t changed. Retry to check your connection and Supabase configuration."}</p>
          <button className="button button-primary" type="button" onClick={() => {
            setOnboardingState("loading");
            setVerifiedUserId(null);
            setOnboardingError("");
            setStatusRetry((value) => value + 1);
          }}>Retry <span>→</span></button>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("home")} aria-label="GarbaMatch home">
          <span className="brand-mark">g<span>✳</span></span>
          <span>garba<span className="brand-light">match</span></span>
        </button>
        <div className="topbar-right">
          <span className="campus-pill"><span className="live-dot" /> SGGSIE&T · Nanded</span>
          <Suspense fallback={<Link className="auth-link" href="/sign-in">Sign in</Link>}>
            <Show when="signed-out">
              <Link className="auth-link" href="/sign-in">Sign in</Link>
              <Link className="auth-join" href="/sign-up">Join free <span>↗</span></Link>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </Suspense>
        </div>
      </header>

      {screen === "home" && (
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS. YOUR PEOPLE.</div>
            <h1>Find your<br /><em>rhythm.</em><br />Find your people.</h1>
            <p className="hero-description">The dhol is calling. Meet the people who’ll make this Garba night one to remember.</p>
            <div className="hero-actions">
              <Suspense fallback={<Link className="button button-primary" href="/sign-up">Create your account <span>↗</span></Link>}>
                <Show when="signed-out">
                <Link className="button button-primary" href="/sign-up">Create your account <span>↗</span></Link>
                </Show>
                <Show when="signed-in">
                  <Link className="button button-primary" href="/onboarding/profile?edit=1">Edit your profile <span>↗</span></Link>
                </Show>
              </Suspense>
              <Link className="text-button" href="/events">View campus event details <span>→</span></Link>
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="hero-photo" role="img" aria-label="Colorful Garba celebration" />
            <div className="photo-caption"><span className="caption-icon">✳</span><span><b>Your people are out there</b><small>Find your Garba crew</small></span><span className="caption-arrow">↗</span></div>
            <div className="floating-note"><span>✦</span> one great night<br />starts with a hello</div>
            <div className="hero-stamp">GARBA<br />TOGETHER</div>
          </div>
          <div className="hero-bottom"><span>01 / 04</span><span>SCROLL TO FIND YOUR PEOPLE <span className="down-arrow">↓</span></span><span>MADE FOR YOUR CAMPUS</span></div>
        </section>
      )}

      {isLoaded && isSignedIn && screen === "onboarding" && (
        <MatchingPreferencesPanel
          mandatory={onboardingState === "preferences_missing"}
          onCancel={() => setScreen(preferencesReturnScreen)}
          onSaved={() => {
            setOnboardingState("complete");
            setVerifiedUserId(userId ?? null);
            setScreen(preferencesReturnScreen);
          }}
        />
      )}

      {isLoaded && isSignedIn && screen === "discover" && (
        <DiscoveryPanel onPreferences={() => openPreferences("discover")} />
      )}

      {isLoaded && isSignedIn && screen === "matches" && (
        <MatchesPanel onDiscover={() => setScreen("discover")} />
      )}


{screen === "events" && (
  <section className="page-section content-page">
    <div className="eyebrow">
      <span className="eyebrow-line" />
      SAVE THE DATE
    </div>

    <h1>
      One campus.
      <br />
      <em>One big night.</em>
    </h1>

    <div className="event-card">
      <div className="event-art">
        <span>NAVRATRI</span>
        <b>✳</b>
        <small>THE CAMPUS GARBA NIGHT</small>
      </div>

      <div className="event-info">
        <span className="aside-kicker">
          SGGSIE&T · OFFICIAL COLLEGE EVENT
        </span>

        <h2>The College Garba Night</h2>

        <p>
          Get ready for a night of Garba, music, festive vibes,
          and unforgettable memories with your campus community.
        </p>

        <div className="event-details">
          <div className="event-detail">

            <div>
              <small>📅 DATE :</small>
              <strong>24 October 2026</strong>
            </div>
          </div>
<br/>
          <div className="event-detail">
            <div>
              <small>📍VENUE :</small>
              <strong>
                In Front of the Admin Building,
                SGGSIE&T, Nanded
              </strong>
            </div>
          </div>
        </div>
<br></br>
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLScY7IIeTA0cp3ZXX2C2ude6DfRxzFxUGgN0MBkMFl2zzqya_w/viewform"
          target="_blank"
          rel="noopener noreferrer"
          className="button button-primary"
        >
          Get Your Ticket <span aria-hidden="true">↗</span>
        </a>

        <small>
          Click above to register through the official event form.
        </small>
      </div>
    </div>
  </section>
)}


      {isLoaded && isSignedIn && screen === "profile" && (
        <section className="page-section content-page">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR SPACE</div><h1>Make it <em>you.</em></h1>
          <div className="profile-settings">
            <div className="settings-avatar">G<span>✳</span></div><div><span className="aside-kicker">YOUR PROFILE</span><h2>Manage your student details.</h2><p>Update your profile and private matching preferences.</p></div>
            <div className="settings-row"><span>Discovery access</span><span>Available to registered students</span></div>
            <div className="settings-row"><span>Student profile</span><Link href="/onboarding/profile?edit=1">Edit photos and details →</Link></div>
            <div className="settings-row"><span>Discovery preferences</span><button onClick={() => openPreferences("profile")}>Edit your preferences →</button></div>
            <div className="settings-row"><span>Privacy & account</span><span>Managed by Clerk</span></div>
            <Show when="signed-in">
              <div className="settings-row"><span>Account</span><SignOutButton redirectUrl="/"><button className="sign-out-button" type="button">Sign out</button></SignOutButton></div>
            </Show>
            <Show when="signed-out">
              <div className="settings-row profile-auth-actions"><span>Account</span><span><Link href="/sign-in">Sign in</Link><Link href="/sign-up">Create account</Link></span></div>
            </Show>
          </div>
        </section>
      )}

      {isLoaded && isSignedIn && screen !== "onboarding" && (
        <nav className="bottom-nav" aria-label="Main navigation">
          {tabs.map((tab) => <button key={tab.id} className={screen === tab.id ? "nav-active" : ""} onClick={() => setScreen(tab.id)} aria-current={screen === tab.id ? "page" : undefined}><span>{tab.icon}</span>{tab.label}</button>)}
        </nav>
      )}
      <footer className="site-footer"><span>GARBA MATCH <b>✳</b> CAMPUS EDITION</span><span>Made for the moments between the beats.</span></footer>
    </main>
  );
}
