import Link from "next/link";
import { AppHeader, PageContainer, PrimaryButton, SecondaryButton } from "@/components/app-shell";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-800">
      <AppHeader title="Welcome back" subtitle="Demo mode" />
      <PageContainer>
        <div className="mx-auto max-w-md rounded-[2rem] border border-rose-100 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl">🎵</div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in to GarbaMatch</h2>
          </div>

          <form className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">College email</span>
              <input className="w-full rounded-2xl border border-slate-200 bg-[#fffdfb] px-4 py-3 text-slate-800 outline-none focus:border-rose-400" placeholder="you@sggs.ac.in" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input type="password" className="w-full rounded-2xl border border-slate-200 bg-[#fffdfb] px-4 py-3 text-slate-800 outline-none focus:border-rose-400" placeholder="••••••••" />
            </label>

            <div className="flex items-center justify-between text-sm text-slate-600">
              <label className="flex items-center gap-2"><input type="checkbox" /> Remember me</label>
              <Link href="/auth/recover" className="font-semibold text-rose-600">Forgot password?</Link>
            </div>

            <Link href="/discover">
              <PrimaryButton className="w-full">Continue</PrimaryButton>
            </Link>
            <Link href="/onboarding">
              <SecondaryButton className="w-full">Create account</SecondaryButton>
            </Link>
          </form>
        </div>
      </PageContainer>
    </div>
  );
}
