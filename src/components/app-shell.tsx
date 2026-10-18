import Link from "next/link";
import type { ReactNode } from "react";

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-rose-100 bg-[#fffaf5]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-500">GarbaMatch</p>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        </div>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">{children}</main>;
}

export function BottomNavigation() {
  const links = [
    { href: "/discover", label: "Discover", icon: "✦" },
    { href: "/matches", label: "Matches", icon: "❤" },
    { href: "/events", label: "Events", icon: "◌" },
    { href: "/profile", label: "Profile", icon: "◍" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-rose-100 bg-[#fffaf5]/95 px-3 py-2 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <span className="text-base">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function ProgressHeader({
  current,
  total,
  title,
  subtitle,
}: {
  current: number;
  total: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        <span>Step {current} of {total}</span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-rose-100">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#f43f5e,#ec4899,#c084fc)]"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  return (
    <button
      {...props}
      className={
        `inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.24)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-pink-200 disabled:cursor-not-allowed disabled:opacity-60 ${className}`
      }
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function SelectionCard({
  title,
  subtitle,
  selected,
  onClick,
}: {
  title: string;
  subtitle?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        `w-full rounded-3xl border p-4 text-left transition ${
          selected
            ? "border-rose-400 bg-rose-50 shadow-[0_12px_20px_rgba(244,63,94,0.12)]"
            : "border-slate-200 bg-white hover:border-rose-200 hover:bg-[#fff4f5]"
        }`
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
        </div>
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
            selected ? "border-rose-500 bg-rose-500 text-white" : "border-slate-300 bg-white text-transparent"
          }`}
        >
          ✓
        </span>
      </div>
    </button>
  );
}

export function InterestChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
        selected
          ? "border-rose-500 bg-rose-500 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:bg-rose-50"
      }`}
    >
      {label}
    </button>
  );
}

export function ProfileCard({
  profile,
  onLike,
  onPass,
  onView,
}: {
  profile: {
    name: string;
    branch: string;
    year: string;
    bio: string;
    avatar: string;
    interests: string[];
    experience: string;
    style: string;
    preferredTiming?: string[];
    matchScore?: number;
  };
  onLike?: () => void;
  onPass?: () => void;
  onView?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-rose-100 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
      <div className="relative">
        <img src={profile.avatar} alt={profile.name} className="h-80 w-full object-cover" />
        <div className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-rose-600">
          {profile.matchScore ?? 86}% match
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{profile.name}</h3>
            <p className="text-sm text-slate-500">{profile.branch} · {profile.year}</p>
          </div>
          <button type="button" onClick={onView} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
            View profile
          </button>
        </div>

        <p className="text-sm leading-6 text-slate-600">{profile.bio}</p>

        <div className="flex flex-wrap gap-2">
          {profile.interests.map((interest) => (
            <span key={interest} className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
              {interest}
            </span>
          ))}
        </div>

        <div className="rounded-2xl bg-[#fff8ef] p-3 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">Garba vibe</div>
          <div>{profile.experience} · {profile.style}</div>
          {profile.preferredTiming ? <div className="mt-1 text-slate-500">Prefers {profile.preferredTiming.join(", ")}</div> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onPass}
            className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Pass
          </button>
          <button
            type="button"
            onClick={onLike}
            className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(236,72,153,0.25)]"
          >
            Like
          </button>
        </div>
      </div>
    </div>
  );
}

export function MatchCard({
  match,
}: {
  match: {
    id: string;
    name: string;
    branch: string;
    year: string;
    avatar: string;
    mutualInterests: string[];
    timestamp: string;
    connectionStatus: string;
  };
}) {
  return (
    <Link href={`/matches/${match.id}`} className="block rounded-[1.5rem] border border-rose-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <img src={match.avatar} alt={match.name} className="h-14 w-14 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{match.name}</p>
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-600">
              {match.connectionStatus}
            </span>
          </div>
          <p className="text-sm text-slate-500">{match.branch} · {match.year}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {match.mutualInterests.map((interest) => (
          <span key={interest} className="rounded-full bg-[#fff1f8] px-2 py-1 text-[11px] font-medium text-rose-700">
            {interest}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{match.timestamp}</span>
        <span className="font-semibold text-rose-600">View details</span>
      </div>
    </Link>
  );
}

export function EventCard({
  event,
}: {
  event: {
    slug: string;
    name: string;
    date: string;
    time: string;
    venue: string;
    address: string;
    price?: string;
    image: string;
  };
}) {
  return (
    <Link href={`/events/${event.slug}`} className="overflow-hidden rounded-[1.75rem] border border-rose-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <img src={event.image} alt={event.name} className="h-48 w-full object-cover" />
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{event.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{event.date} · {event.time}</p>
        </div>
        <p className="text-sm text-slate-600">{event.venue}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">{event.price ?? "Free"}</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">Book</span>
        </div>
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-rose-200 bg-[#fffaf5] p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl">☆</div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ text = "Loading..." }: { text?: string }) {
  return <div className="rounded-3xl border border-rose-100 bg-white p-6 text-sm text-slate-600">{text}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmText,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 rounded-full bg-rose-500 px-4 py-3 font-semibold text-white">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-5 shadow-2xl">
        <h3 className="text-xl font-bold text-slate-900">Report user</h3>
        <p className="mt-2 text-sm text-slate-600">We take campus safety seriously. Reported content is reviewed by the admin team.</p>
        <textarea
          rows={4}
          className="mt-4 w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-rose-400"
          defaultValue="Please describe what happened."
        />
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">
            Close
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-full bg-rose-500 px-4 py-3 font-semibold text-white">
            Send report
          </button>
        </div>
      </div>
    </div>
  );
}
