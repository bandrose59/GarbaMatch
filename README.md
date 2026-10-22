# GarbaMatch

GarbaMatch is a mobile-first campus discovery and mutual-matching experience using Clerk authentication and Supabase.

## Run locally

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Discovery and matching

- Matching preferences (gender identity, who the student wants to meet, and connection interests) are saved in `student_profiles`. Gender and preference data stay private and are used only by server-side matching functions.
- Discovery returns only real profiles that have completed their student profile and matching preferences. There is no campus-verification gate: any registered account that completes setup can be discoverable.
- Discovery returns one eligible, un-swiped profile at a time. Likes and passes are persisted; a match is created once, transactionally, only after mutual likes and compatible preferences in both directions.
- Gender identities are never inferred from names or photos. Non-binary and self-described identities map to the `self_described_prefer_not` meet category only when the other student explicitly selects that category.
- Connection interests need not be shared for a match. Each person's connection interests remain private until a mutual match, when the matched person's interests are shown.
- Romantic interest is available without age confirmation, as requested. The product currently has no age verification or age-based matching restriction; assess this limitation before admitting minors or launching publicly.
- The Events screen displays a date, venue and registration link; confirm all three with the event organizer before publishing.
- Clerk handles sign-up, sign-in and user sessions. Supabase matching reads and writes run only in authenticated server routes using the server-only service-role key.
- Guests land on the public welcome page and can view public event details. Authenticated users get Discover, Matches, Events and Profile navigation after Clerk verifies their session.
- Direct `/discover`, `/matches` and `/profile` URLs require a valid Clerk session; the profile API also authenticates every request.
- New Clerk sign-ups go to profile setup for display name, branch and academic year, then can continue to Garba-preferences onboarding. Up to two optional profile photos and an optional Instagram username are supported.
- Existing sign-ins return directly to Discover. Signed-in users can update profile details and preferences in Profile, where they can also sign out.
- Profile drafts are private: photos use signed URLs and an Instagram link is generated for the username, but matching/consent-based handle sharing is not implemented.
- College verification, moderation, blocking/reporting, and admin operations are not implemented.

## Supabase profile storage

1. Create a Supabase project and apply every SQL migration in `supabase/migrations/` in filename order using the Supabase SQL Editor. These create the profile table, private `profile-photos` Storage bucket, and matching schema/functions.
2. Copy `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY` into the ignored `.env.local` file. Never expose the service-role key with a `NEXT_PUBLIC_` variable.
3. Restart the Next.js server. Profile reads and writes are authenticated through Clerk; uploads are limited to valid JPEG, PNG or WebP images, 2 MB each, and two per student.
4. Students must complete profile setup and save matching preferences before they appear in discovery. Existing profile records are preserved and remain undiscoverable until their owner saves these new preferences.

The database table has Row Level Security enabled with no browser-accessible policies. The app accesses it only from same-origin, Clerk-authenticated server routes using the Supabase service-role key. Keep that key server-side.

## Clerk and Google sign-in

Clerk development keys are read from the ignored `.env.local` file. To configure another environment, copy `.env.example` to `.env.local` and set the publishable and secret keys from your Clerk application. Never commit real keys.

The sign-in and sign-up pages use Clerk's hosted components. Google appears as a sign-in option after the Google social connection is enabled for your Clerk application:

1. Claim the newly created development application by running `npx -y clerk@latest auth login` and follow Clerk's account flow.
2. In the Clerk Dashboard, open **SSO connections**, add **Google** for all users, and enable it for sign-up and sign-in.
3. For production, configure your own Google OAuth client credentials in Clerk and add the production domain and redirect URIs.

The development application was created with local development keys. Do not use development keys or shared Google OAuth credentials for production.

## Deploying with Vercel

Vercel can build and deploy this Next.js app directly when the GitHub repository is connected; no GitHub Actions workflow or custom `vercel.json` is required. Use Node.js 22 or a newer supported LTS release.

### Vercel project

1. Import the GitHub repository in Vercel and select the Next.js framework preset. Keep the default build command (`npm run build`).
2. Add these environment variables in Vercel for each environment you intend to use:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding/profile`
   - `NEXT_PUBLIC_APP_URL` set to the canonical HTTPS production URL
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never use a `NEXT_PUBLIC_` prefix)
3. Apply the Supabase SQL migrations in filename order before testing profile saves. Use separate Clerk and Supabase development projects for preview deployments where possible; do not connect untrusted preview deployments to production student data.
4. Enable Google sign-in and configure production OAuth credentials/redirect URLs in Clerk. Configure the canonical domain in Clerk and verify sign-up, email verification, sign-in, and sign-out on the deployed domain.

`npm audit --omit=dev --audit-level=high` currently reports no production dependency vulnerabilities. Run lint, type-checking and the production build locally before pushing; Vercel runs the production build during deployment. Supabase credentials are server-only and are not needed to compile the app.

## Launch blockers

This is deployable for a controlled setup, but is not yet ready for an unrestricted public launch. Adding credentials alone does not finish these product requirements:

- Decide whether to add campus eligibility/verification; current product behavior intentionally permits all registered accounts.
- Age safety review: romantic interest has no age confirmation or age-based restriction.
- Consent-gated Instagram sharing, blocking, reporting, moderator/admin controls, and audit trails.
- Confirm that the event date, venue and registration link displayed in the app are current and organizer-approved.
- Privacy policy, terms, community guidelines, account deletion, backup/retention policy, and a responsible moderation contact.
- Campus-approved branch/year choices and end-to-end verification with multiple real accounts.
- Image processing to strip EXIF/location metadata before approved profile photos are ever shown to other students.

Do not publicly recruit students until these launch blockers and the institution's data/privacy requirements are addressed.

Do not treat client-side development preview state as authoritative or deploy it as a student service.
