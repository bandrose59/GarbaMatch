import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="auth-screen">
      <header className="auth-header">
        <Link className="brand" href="/">
          <span className="brand-mark">g<span>✳</span></span>
          <span>garba<span className="brand-light">match</span></span>
        </Link>
        <Link className="auth-link" href="/">Back to home</Link>
      </header>
      <section className="auth-content">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR CAMPUS. YOUR PEOPLE.</div>
        <h1>Find your<br /><em>people.</em></h1>
        <p className="auth-description">Create your account, then we’ll help you find your campus Garba vibe.</p>
        <SignUp fallbackRedirectUrl="/onboarding/profile" />
        <p className="auth-provider-note">Google sign-in is available when the Google provider is enabled in your Clerk settings.</p>
      </section>
    </main>
  );
}
