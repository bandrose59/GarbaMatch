"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Candidate = {
  userId: string;
  displayName: string;
  branch: string;
  academicYear: string;
  photos: string[];
};

type Match = Candidate & {
  connectionInterests: string[];
  matchedAt: string;
};

type Preferences = {
  genderIdentity: string;
  genderSelfDescription: string;
  meetGenders: string[];
  connectionInterests: string[];
};

type ApiError = { error?: string };

const genderOptions = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "self_describe", label: "I describe my gender" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const meetOptions = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "self_described_prefer_not", label: "Non-binary, self-described, or prefer not to say" },
];

const connectionOptions = [
  { value: "garba_partner", label: "Garba partner" },
  { value: "friendship", label: "Friendship" },
  { value: "romantic", label: "Romantic connection" },
];

async function readResponse<T>(response: Response): Promise<T & ApiError> {
  return await response.json() as T & ApiError;
}

function ToggleGroup({
  title,
  description,
  options,
  selected,
  onToggle,
}: {
  title: string;
  description: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <section className="matching-field">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="chips matching-chips">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={`chip ${isSelected ? "chip-selected" : ""}`}
              aria-pressed={isSelected}
              onClick={() => onToggle(option.value)}
            >
              {isSelected && <span>✓ </span>}
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function MatchingPreferencesPanel({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [preferences, setPreferences] = useState<Preferences>({
    genderIdentity: "",
    genderSelfDescription: "",
    meetGenders: [],
    connectionInterests: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/matching/preferences", { cache: "no-store" })
      .then(readResponse<{ preferences: Preferences | null }>)
      .then((result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        else if (result.preferences) setPreferences(result.preferences);
      })
      .catch(() => {
        if (active) setError("Couldn't load your preferences. Check your connection and retry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function toggle(field: "meetGenders" | "connectionInterests", value: string) {
    setPreferences((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNeedsProfile(false);
    try {
      const result = await readResponse<{ saved: boolean }>(await fetch("/api/matching/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      }));
      if (!result.saved) {
        setError(result.error ?? "Couldn't save your preferences. Please try again.");
        setNeedsProfile(result.error?.includes("Create your student profile") ?? false);
        return;
      }
      onSaved();
    } catch {
      setError("Couldn't save your preferences. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-section content-page matching-preferences">
      <div className="page-heading">
        <button className="back-link" type="button" onClick={onCancel}>← Back</button>
        <span className="step-count">PRIVATE <i>· YOUR CHOICE</i></span>
      </div>
      <div className="eyebrow"><span className="eyebrow-line" /> YOUR DISCOVERY PREFERENCES</div>
      <h1>Meet your <em>kind of people.</em></h1>
      <p className="section-lede">These answers stay private and are used only to find mutually compatible people.</p>

      {loading ? (
        <div className="empty-state" role="status"><p>Loading your preferences…</p></div>
      ) : (
        <form className="matching-form" onSubmit={savePreferences}>
          {error && <p className="matching-error" role="alert">{error}</p>}
          {needsProfile && <Link className="button button-outline" href="/onboarding/profile">Create your student profile →</Link>}
          <fieldset className="matching-fieldset">
            <legend>Your gender</legend>
            <p>This is private and is never shown on discovery cards.</p>
            <div className="chips matching-chips">
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`chip ${preferences.genderIdentity === option.value ? "chip-selected" : ""}`}
                  aria-pressed={preferences.genderIdentity === option.value}
                  onClick={() => setPreferences((current) => ({
                    ...current,
                    genderIdentity: option.value,
                    genderSelfDescription: option.value === "self_describe" ? current.genderSelfDescription : "",
                  }))}
                >
                  {preferences.genderIdentity === option.value && <span>✓ </span>}
                  {option.label}
                </button>
              ))}
            </div>
            {preferences.genderIdentity === "self_describe" && (
              <label className="matching-label">
                Describe your gender
                <input
                  className="matching-input"
                  maxLength={60}
                  value={preferences.genderSelfDescription}
                  onChange={(event) => setPreferences((current) => ({
                    ...current,
                    genderSelfDescription: event.target.value,
                  }))}
                  required
                />
              </label>
            )}
          </fieldset>
          <ToggleGroup
            title="Who would you like to meet?"
            description="People are included only when both sides choose compatible preferences."
            options={meetOptions}
            selected={preferences.meetGenders}
            onToggle={(value) => toggle("meetGenders", value)}
          />
          <ToggleGroup
            title="What connections interest you?"
            description="At least one shared interest is not required for a match. Your choices are revealed only after a mutual match."
            options={connectionOptions}
            selected={preferences.connectionInterests}
            onToggle={(value) => toggle("connectionInterests", value)}
          />
          <div className="matching-actions">
            <button className="button button-outline" type="button" onClick={onCancel}>Cancel</button>
            <button className="button button-primary" disabled={saving || !preferences.genderIdentity || !preferences.meetGenders.length || !preferences.connectionInterests.length}>
              {saving ? "Saving…" : "Save preferences"} <span>→</span>
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function DiscoveryPanel({ onPreferences }: { onPreferences: () => void }) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [matched, setMatched] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [needsPreferences, setNeedsPreferences] = useState(false);

  const loadCandidate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await readResponse<{ candidate: Candidate | null; needsProfile?: boolean; needsPreferences?: boolean }>(
        await fetch("/api/discovery", { cache: "no-store" }),
      );
      if (result.error) setError(result.error);
      else {
        setCandidate(result.candidate);
        setNeedsProfile(result.needsProfile ?? false);
        setNeedsPreferences(result.needsPreferences ?? false);
      }
    } catch {
      setError("Couldn't load students. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/discovery", { cache: "no-store" })
      .then(readResponse<{ candidate: Candidate | null; needsProfile?: boolean; needsPreferences?: boolean }>)
      .then((result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        else {
          setCandidate(result.candidate);
          setNeedsProfile(result.needsProfile ?? false);
          setNeedsPreferences(result.needsPreferences ?? false);
        }
      })
      .catch(() => {
        if (active) setError("Couldn't load students. Check your connection and retry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function respond(action: "like" | "pass") {
    if (!candidate || saving) return;
    setSaving(true);
    setError("");
    setMatched(false);
    try {
      const result = await readResponse<{ matched: boolean }>(await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: candidate.userId, action }),
      }));
      if (result.error) {
        setError(result.error);
      } else {
        if (result.matched) setMatched(true);
        setCandidate(null);
        void loadCandidate();
      }
    } catch {
      setError("Couldn't save your response. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="discover page-section">
      <div className="discover-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS, YOUR CALL</div><h1>Find your <em>people.</em></h1><p>Good energy is a great place to start.</p></div>
        <button className="filter-button" type="button" onClick={onPreferences}>☷ <span>Preferences</span></button>
      </div>
      {matched && <div className="matching-success" role="status">It’s a mutual match! <Link href="/matches">See your matches →</Link></div>}
      {error && <div className="matching-error" role="alert">{error}<button type="button" onClick={() => void loadCandidate()}>Retry</button></div>}
      {loading ? (
        <div className="empty-state" role="status"><p>Finding compatible students…</p></div>
      ) : candidate ? (
        <div className="discovery-layout">
          <article className="profile-card">
            <div
              className="profile-photo"
              role="img"
              aria-label={`${candidate.displayName}'s profile photo`}
              style={candidate.photos[0] ? { backgroundImage: `url("${candidate.photos[0]}")` } : undefined}
            >
              {!candidate.photos[0] && <span className="candidate-initial" aria-hidden="true">{candidate.displayName.charAt(0).toUpperCase()}</span>}
              <div className="profile-gradient" />
              <div className="profile-card-info">
                <div className="profile-location"><span>✳</span> SGGSIE&T · NANDED</div>
                <h2>{candidate.displayName}</h2>
                <p>{candidate.branch} <span>·</span> {candidate.academicYear}</p>
              </div>
            </div>
            {candidate.photos.length > 1 && (
              <div className="candidate-photo-count" aria-label={`${candidate.photos.length} profile photos`}>
                {candidate.photos.length} photos
              </div>
            )}
          </article>
          <aside className="discovery-aside">
            <span className="aside-kicker">A NEW CAMPUS CONNECTION</span>
            <h2>Good things<br />start with hello.</h2>
            <p>Your matching preferences stay private. You’ll only match if you both choose to connect.</p>
            <p className="swipe-hint">Choose your response</p>
            <div className="matching-swipe-actions">
              <button className="action-circle action-pass" type="button" disabled={saving} aria-label="Pass" onClick={() => void respond("pass")}>×</button>
              <button className="action-circle action-like" type="button" disabled={saving} aria-label="Like" onClick={() => void respond("like")}>♡</button>
            </div>
          </aside>
        </div>
      ) : !error ? (
        <div className="empty-state">
          <span className="empty-icon">✳</span>
          <h2>{needsProfile ? "Create your student profile." : needsPreferences ? "Set your discovery preferences." : "You’re all caught up."}</h2>
          <p>{needsProfile
            ? "Add your name, branch, and academic year before discovering other students."
            : needsPreferences
              ? "Choose who you want to meet and what kinds of connections interest you. These answers stay private."
              : "New compatible student profiles will appear here when they join. Your responses are saved, so you can return anytime."}</p>
          {needsProfile
            ? <Link className="button button-primary" href="/onboarding/profile">Create student profile <span>→</span></Link>
            : <button className="button button-primary" type="button" onClick={onPreferences}>{needsPreferences ? "Set preferences" : "Review preferences"} <span>→</span></button>}
        </div>
      ) : null}
    </section>
  );
}

export function MatchesPanel({ onDiscover }: { onDiscover: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await readResponse<{ matches: Match[] }>(await fetch("/api/matches", { cache: "no-store" }));
      if (result.error) setError(result.error);
      else setMatches(result.matches);
    } catch {
      setError("Couldn't load matches. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/matches", { cache: "no-store" })
      .then(readResponse<{ matches: Match[] }>)
      .then((result) => {
        if (!active) return;
        if (result.error) setError(result.error);
        else setMatches(result.matches);
      })
      .catch(() => {
        if (active) setError("Couldn't load matches. Check your connection and retry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="page-section content-page">
      <div className="eyebrow"><span className="eyebrow-line" /> THE GOOD STUFF</div><h1>Your <em>matches.</em></h1>
      <p className="section-lede">A match happens when you both say yes. No rush, no pressure.</p>
      {error && <div className="matching-error" role="alert">{error}<button type="button" onClick={() => void loadMatches()}>Retry</button></div>}
      {loading ? (
        <div className="empty-state" role="status"><p>Loading your matches…</p></div>
      ) : matches.length ? (
        <div className="matches-grid">
          {matches.map((match) => (
            <article className="match-card" key={match.userId}>
              {match.photos[0]
                ? <div className="match-photo" role="img" aria-label={`${match.displayName}'s profile photo`} style={{ backgroundImage: `url("${match.photos[0]}")` }} />
                : <div className="match-photo match-photo-placeholder" aria-hidden="true">{match.displayName.charAt(0).toUpperCase()}</div>}
              <div className="match-card-info">
                <span className="aside-kicker">✳ MUTUAL MATCH</span>
                <h2>{match.displayName}</h2>
                <p>{match.branch} · {match.academicYear}</p>
                <div className="profile-interests">
                  {match.connectionInterests.map((interest) => (
                    <span key={interest}>{connectionOptions.find((option) => option.value === interest)?.label ?? interest}</span>
                  ))}
                </div>
                <small>Matched {new Date(match.matchedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</small>
              </div>
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className="empty-state matches-empty"><span className="empty-icon">♡</span><h2>No matches yet.</h2><p>Keep discovering compatible students. A match appears here when you both like each other.</p><button className="button button-primary" type="button" onClick={onDiscover}>Back to discovering <span>→</span></button></div>
      ) : null}
    </section>
  );
}
