"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type Photo = { path: string; url: string };
type Profile = {
  displayName: string;
  branch: string;
  academicYear: string;
  instagramUsername: string;
  photos: Photo[];
};
type NewPhoto = { file: File; preview: string };

const maxPhotoBytes = 2 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProfileSetupForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({
    displayName: "",
    branch: "",
    academicYear: "",
    instagramUsername: "",
    photos: [],
  });
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    const urls = previewUrls.current;
    fetch("/api/profile")
      .then(async (response) => {
        const body = await response.json() as { profile?: Profile | null; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Couldn't load your profile.");
        if (active && body.profile) {
          setProfile(body.profile);
          setProfileReady(true);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Couldn't load your profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const availableSlots = 2 - profile.photos.length - newPhotos.length;

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setMessage("");
    const selected = Array.from(event.target.files ?? []);
    const remaining = 2 - profile.photos.length - newPhotos.length;
    const accepted: NewPhoto[] = [];
    for (const file of selected) {
      if (!acceptedTypes.has(file.type) || file.size > maxPhotoBytes) {
        setError("Choose JPEG, PNG or WebP photos up to 2 MB each.");
        continue;
      }
      if (accepted.length >= remaining) {
        setError("You can upload up to two photos.");
        break;
      }
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      accepted.push({ file, preview });
    }
    setNewPhotos((current) => [...current, ...accepted]);
    event.target.value = "";
  }

  function removeExistingPhoto(path: string) {
    setProfile((current) => ({ ...current, photos: current.photos.filter((photo) => photo.path !== path) }));
  }

  function removeNewPhoto(preview: string) {
    URL.revokeObjectURL(preview);
    previewUrls.current.delete(preview);
    setNewPhotos((current) => current.filter((photo) => photo.preview !== preview));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const formData = new FormData();
    formData.set("displayName", profile.displayName);
    formData.set("branch", profile.branch);
    formData.set("academicYear", profile.academicYear);
    formData.set("instagramUsername", profile.instagramUsername);
    formData.set("retainedPhotoPaths", JSON.stringify(profile.photos.map((photo) => photo.path)));
    newPhotos.forEach(({ file }) => formData.append("photos", file));

    try {
      const response = await fetch("/api/profile", { method: "PUT", body: formData });
      const body = await response.json() as { profile?: Profile; error?: string; warning?: string };
      if (!response.ok || !body.profile) throw new Error(body.error ?? "Couldn't save your profile.");
      setProfile(body.profile);
      setProfileReady(true);
      newPhotos.forEach(({ preview }) => {
        URL.revokeObjectURL(preview);
        previewUrls.current.delete(preview);
      });
      setNewPhotos([]);
      setMessage(body.warning ?? "Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const instagramUsername = profile.instagramUsername.trim().replace(/^@/, "");
  const instagramUrl = /^[A-Za-z0-9._]{1,30}$/.test(instagramUsername)
    ? `https://www.instagram.com/${encodeURIComponent(instagramUsername)}/`
    : null;
  const continueToPreferences = () => router.push("/?onboarding=preferences");

  return (
    <main className="auth-screen profile-setup-screen">
      <header className="auth-header">
        <Link className="brand" href="/">
          <span className="brand-mark">g<span>✳</span></span>
          <span>garba<span className="brand-light">match</span></span>
        </Link>
        <Link className="auth-link" href="/">Back to home</Link>
      </header>
      <section className="profile-setup-content">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR PROFILE</div>
        <h1>Introduce<br /><em>yourself.</em></h1>
        <p className="auth-description">You’re signed in. Add a few details for your campus profile; photos and Instagram are optional.</p>

        {loading ? <p className="form-status" role="status">Loading your profile…</p> : (
          <form className="profile-form" onSubmit={saveProfile}>
            <label>
              Display name
              <input autoComplete="name" maxLength={80} required value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="What should we call you?" />
            </label>
            <div className="form-field-row">
              <label>
                Branch
                <input maxLength={100} required value={profile.branch} onChange={(event) => setProfile({ ...profile, branch: event.target.value })} placeholder="Enter your branch" />
              </label>
              <label>
                Academic year
                <input maxLength={40} required value={profile.academicYear} onChange={(event) => setProfile({ ...profile, academicYear: event.target.value })} placeholder="e.g. 2nd year" />
              </label>
            </div>
            <label>
              Instagram username <span className="optional-label">OPTIONAL</span>
              <div className="instagram-input"><span>@</span><input autoCapitalize="none" autoComplete="off" maxLength={254} value={profile.instagramUsername} onChange={(event) => setProfile({ ...profile, instagramUsername: event.target.value })} placeholder="your.username" /></div>
              <small>We’ll make a link to your Instagram profile. Your username stays private until you choose to share it after a match.</small>
            </label>
            {instagramUrl && <a className="instagram-preview" href={instagramUrl} target="_blank" rel="noopener noreferrer">Preview link: instagram.com/{instagramUsername} ↗</a>}

            <div className="photo-upload-section">
              <div className="photo-section-heading"><div><span>Profile photos</span><small>OPTIONAL · UP TO 2 PHOTOS · 2 MB EACH</small></div><span>{profile.photos.length + newPhotos.length}/2</span></div>
              <div className="photo-grid">
                {profile.photos.map((photo) => (
                  <div className="photo-tile" key={photo.path}>
                    <div className="photo-image" role="img" aria-label="Your profile photo" style={{ backgroundImage: `url("${photo.url}")` }} />
                    <button type="button" onClick={() => removeExistingPhoto(photo.path)} aria-label="Remove profile photo">×</button>
                  </div>
                ))}
                {newPhotos.map(({ file, preview }) => (
                  <div className="photo-tile" key={preview}>
                    <div className="photo-image" role="img" aria-label={`New photo: ${file.name}`} style={{ backgroundImage: `url("${preview}")` }} />
                    <button type="button" onClick={() => removeNewPhoto(preview)} aria-label={`Remove ${file.name}`}>×</button>
                  </div>
                ))}
                {availableSlots > 0 && (
                  <button className="photo-add" type="button" onClick={() => fileInput.current?.click()}>
                    <span>＋</span><small>Add photo</small>
                  </button>
                )}
              </div>
              <input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} />
              <p className="upload-help">Stored in a private Supabase bucket. Only you can view your profile draft photos here.</p>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="form-success" role="status">{message}</p>}
            <div className="profile-form-actions">
              <button className="button button-primary profile-save-button" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save profile"} <span>→</span>
              </button>
              {profileReady && (
                <button className="continue-profile-button" type="button" onClick={continueToPreferences}>
                  Continue to Garba preferences <span>→</span>
                </button>
              )}
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
