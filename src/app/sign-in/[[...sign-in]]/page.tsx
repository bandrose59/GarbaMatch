import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
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
        <h1>Good to have<br /><em>you back.</em></h1>
        <p className="auth-description">Sign in to pick up where your Garba story left off.</p>
        <SignIn fallbackRedirectUrl="/" />
        <p className="auth-provider-note">Google sign-in is available when the Google provider is enabled in your Clerk settings.</p>
      </section>
    </main>
  );
}
