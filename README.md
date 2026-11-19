<div align="center">

# Frugl

**A more thoughtful way to buy and sell pre-loved laptops.**

A laptop marketplace that brings useful product details, seller notes, and AI-assisted listing tools together.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-14-FF0055?style=flat)

</div>

---

## 📸 Screenshots

draft.

---

## 📖 About

**Frugl** is a marketplace for pre-loved laptops. Buyers can browse listings with the information that helps them compare devices, while sellers can publish and manage their own listings.

The listing flow can use AI to identify a laptop from photos and suggest a price based on its model and condition. Sellers review the suggested details before publishing; AI suggestions are not a substitute for checking the device information.

---

## ✨ Features

### For Visitors

- 🌐 Explore the marketplace and featured laptop listings
- 🔍 Search listings by keyword and browse available laptop brands
- 📄 View laptop listing details and seller profiles
- 🔐 Register or sign in to use member features

### For Buyers

- 🧰 Browse and filter listings by relevant laptop details, condition, and availability
- ❤️ Save listings to revisit them later
- 💬 Contact sellers through conversations and messages
- 🤝 Send and manage offers
- 🔔 Receive notifications about marketplace activity
- ⭐ Rate the seller after a completed sale and view mutual post-sale reviews
- 👤 Manage account, profile details, and avatar
- 🗑️ Permanently delete your account and its marketplace data from account settings

### For Sellers

- 💻 Create, edit, and publish laptop listings
- 🛡️ Submit new listings for admin approval; update and resubmit listings that need changes
- 🤖 Use AI-assisted laptop identification from photos and review the suggested specifications
- 💡 Get a price suggestion using the selected model and condition
- 🖼️ Add and manage listing photos
- 📊 Manage listings and track their available, reserved, or sold status from the dashboard
- 🤝 Reserve an item for a person who messaged about it, or complete a sale by selecting a buyer
- ⭐ Rate the selected buyer from 1–5 stars when recording a sale
- 🔄 Return a sold listing to available status
- 💬 Respond to buyer conversations and offers
- 🔔 Receive listing and offer notifications

### For Admins

- 🛡️ Approve or reject new listings with seller-facing feedback
- 🚩 Review reported listings, suspicious user activity, and scam-detection alerts
- 🗂️ Manage listing visibility and featured status
- 👥 Verify sellers, suspend accounts, and manage administrator access
- 💾 Create and download private PostgreSQL `.sql` backups
- 🗺️ Toggle buyer and seller heatmaps aggregated by city and region
- 📈 Monitor marketplace activity from the admin dashboard

---

## 🛠️ Tech Stack

| Layer            | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Web framework    | Next.js 16 App Router, Route Handlers, and Turbopack         |
| UI               | React 19                                                     |
| Language         | TypeScript                                                   |
| Styling          | Tailwind CSS 4, shadcn theme utilities, and project CSS      |
| UI primitives    | Radix UI, with locally composed shadcn-style components      |
| Icons            | Font Awesome 6 (solid and regular icon sets)                 |
| Database         | Supabase PostgreSQL, row-level security, and SQL scripts     |
| Authentication   | Supabase Auth: email/password and optional Google OAuth      |
| Server clients   | Supabase JavaScript client and `@supabase/ssr`               |
| File storage     | Supabase Storage for listing photos, hint images, and chat attachments |
| Realtime         | Supabase Realtime for chat messages and notifications        |
| Maps             | Leaflet with OpenStreetMap map tiles                         |
| Geocoding        | Photon, with Nominatim as a location-search fallback         |
| AI               | Google Gemini API via `@google/genai`                        |
| Image processing | Sharp for server-side image normalization, resizing, and JPEG encoding |
| Animation        | Motion for React                                             |
| Testing          | Vitest                                                       |
| Code quality     | ESLint and TypeScript checks                                  |
| Deployment       | Next.js production build; compatible with Vercel             |

---

## 🗂️ User Roles

| Role       | Description                                                               |
| ---------- | ------------------------------------------------------------------------- |
| `guest`     | Browses public marketplace content and listing details                    |
| `buyer`     | Uses buyer features, including saved listings, offers, and conversations   |
| `seller`    | Creates and manages listings and responds to buyers                        |
| `moderator` | Reviews marketplace reports and safety activity                            |
| `admin`     | Oversees users, listings, reports, and marketplace settings                |

> Access to protected features is enforced by the application and Supabase row-level security policies.

### Sessions and Account Security

- 🔐 Protected requests validate a server-tracked session tied to the signed-in Supabase user
- ⏱️ Sessions expire after 30 minutes of inactivity or a 24-hour absolute limit
- 🚪 Signing out ends the application session; suspending an account or changing its role revokes its active sessions
- 📝 After a sale, the seller and buyer can submit separate ratings and reviews through the review dialog

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or later and npm
- A Supabase project
- A Google Gemini API key for AI-assisted identification and related AI features
- Google OAuth credentials only if you want to test Google sign-in

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/TristanJamesTorres/Frugl.git
cd Frugl
```

**2. Install JavaScript dependencies**

```bash
npm ci
```

**3. Configure the environment**

Copy `.env.example` to `.env.local` and add the values for your development project.

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configure these variables in `.env.local`:

| Variable                              | Purpose |
| ------------------------------------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`| Public/publishable key used by the browser client |
| `SUPABASE_SECRET_KEY`                 | Server-only Supabase secret key; never expose it to client code |
| `GEMINI_API_KEY`                      | API key for Gemini-powered features |
| `GEMINI_MODEL`                        | Gemini model identifier used by the application |
| `NEXT_PUBLIC_SITE_URL`                | Base URL for the application, such as `http://localhost:3000` |
| `CRON_SECRET`                         | Long random secret used to protect the scheduled reservation-cleanup endpoint |
| `GITHUB_ACTIONS_TOKEN`                | Server-only fine-grained GitHub token with Actions write access for admin-triggered backups |
| `GITHUB_REPOSITORY`                   | Repository containing the backup workflow, in `owner/repository` format |
| `GITHUB_BACKUP_REF`                   | Branch or tag from which to dispatch backups; defaults to `main` |

The Supabase and site URL values are required for normal local use. AI features require a valid Gemini API key and model. `CRON_SECRET` is needed when configuring scheduled cleanup. The GitHub values are required only to trigger backups from the admin dashboard. Keep server secrets out of `NEXT_PUBLIC_*` variables and do not commit `.env.local`.

**4. Set up the Supabase database**

The database setup is provided as numbered SQL scripts in `supabase/`, rather than a Supabase CLI migrations directory. For a new development project, apply the scripts in numerical order using the Supabase SQL Editor:

```text
01_schema.sql
02_policies.sql
03_seed.sql
04_admin_marketplace_restrictions.sql
05_demo_laptops_seed.sql
06_saved_listing_sold_notifications.sql
07_message_attachments.sql
08_listing_published_notifications.sql
09_public_seller_contact_email.sql
10_secure_scheduled_functions.sql
11_auth_authorization_and_indexes.sql
12_public_profile_details.sql
13_admin_review_and_backups.sql
14_location_coordinates.sql
15_chat_alert_status.sql
16_listing_sales_and_reviews.sql
17_session_lifecycle.sql
18_conversation_insert_policy.sql
```

Do not rerun the base schema scripts against a project that has already been initialized. Scripts `11`–`18` are follow-up authorization, profile, listing-review, backup-storage, location-coordinate, chat-alert, listing-sale/review, session-lifecycle, and conversation-policy changes; apply them once after scripts `01`–`10`.

Script `13_admin_review_and_backups.sql` already provides listing moderation. Script `15_chat_alert_status.sql` adds the status and staff moderation policy for chat scam alerts.
Script `16_listing_sales_and_reviews.sql` adds buyer selection, sale transactions, and mutual post-sale reviews.
Script `17_session_lifecycle.sql` adds server-tracked sessions with a 30-minute inactivity timeout, a 24-hour absolute limit, and revocation when an account is suspended or its role changes. Apply it once before deploying the matching application code.
Existing sign-ins are not registered in the new session table, so users will need to sign in again after deployment.
Script `18_conversation_insert_policy.sql` hardens direct authenticated conversation inserts for installations that use the Supabase client path.

The demo listings in `05_demo_laptops_seed.sql` reference static photos under `public/demo-listing-photos/`. Include those assets in the deployed app, then rerun `05_demo_laptops_seed.sql` to add the photo records if the demo listings were seeded earlier. The photo inserts are idempotent.

If applying scripts from a machine with `psql`, use your Supabase database connection string:

```powershell
psql "<SUPABASE_DATABASE_CONNECTION_STRING>" -v ON_ERROR_STOP=1 -f supabase\01_schema.sql
```

Repeat for the remaining scripts in order. Never put a real database connection string in source control or in this README.

The location map uses city-level coordinates stored on profiles and listings. After applying `14_location_coordinates.sql`, review the Photon backfill candidates without making network requests or database writes:

```powershell
npx tsx scripts/backfill-location-geocodes.ts --dry-run
```

The script loads `.env.local` when present. If `tsx` is not installed, add it with `npm install --save-dev tsx`. The backfill sends only sanitized city/region labels to Photon, waits at least one second between requests, and does not write unless run with `--apply`. Use `--apply` only after reviewing the dry-run and confirming the target Supabase project.

**5. Configure Supabase Auth**

For local development, use a development Supabase project rather than a production project.

1. In Supabase Auth settings, set the **Site URL** to `http://localhost:3000`.
2. Add `http://localhost:3000/**` to the redirect URL allowlist for local development.
3. Configure the email provider and its confirmation behavior to suit your project.
4. To enable Google sign-in, configure a Web OAuth client in Google Auth Platform, then add its client ID and secret under Supabase Auth > Providers > Google.
5. Add `http://localhost:3000` as an authorized JavaScript origin in Google and use the exact Supabase callback URL shown in the Google provider settings as an authorized redirect URI.

Use the exact deployed callback URL and site URL in production; do not carry the local wildcard into production. Google may require brand verification. A Supabase custom Auth domain is needed if the Google consent screen should use a Frugl domain instead of the default Supabase project domain.

**6. Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Create an account through the app to test member features. If email confirmation is enabled, follow the link sent by Supabase and return to the local application.

---

### Seeded Test Accounts

The repository does not document default test-account credentials. Create accounts through the registration flow in your development environment, and assign or configure administrator access only through the project’s authorized Supabase setup.

---

## 💻 Laptop Brands

The home page highlights these laptop brands:

| Brand  | Brand  | Brand  |
| ------ | ------ | ------ |
| Acer   | Apple  | ASUS   |
| Dell   | HP     | Lenovo |

Listings also surface model and device details, condition, seller-provided notes, photos, and availability so buyers can compare the information provided by each seller.

---

## 🗄️ Database Schema (Core Tables)

The Supabase schema includes the following core tables:

```text
profiles              — Public account profile, role, and account status
profile_private       — Private account details
laptop_models         — Laptop model catalog used by listing and price tools
price_reports         — Model/condition price data used for suggestions
listings              — Seller listings and marketplace status
listing_photos        — Photos associated with listings
identification_results— AI-assisted laptop identification records
seller_hints          — Seller-provided hints used during identification
condition_reports     — Condition details associated with a listing
offers                — Buyer offers and seller responses
saved_listings        — Listings saved by members
conversations         — Buyer/seller conversation records
messages              — Conversation messages and attachments
chat_alerts           — Messages flagged for administrator safety review
reviews               — Marketplace reviews
reports               — User-submitted marketplace reports
notifications         — User notification records
usage_counters        — Usage limits for protected application features
audit_log             — Administrative and security-relevant activity
```

The SQL scripts also define database functions, indexes, and row-level security policies. Review the policies and migrations together when changing access rules.

---

## 🤖 AI Features

Frugl uses the **Google Gemini API** for AI-assisted seller tools:

- **Laptop identification** — Sellers can submit laptop photos and optional identifying hints to get model/specification suggestions.
- **Price suggestions** — The application can suggest a price using the selected laptop model and condition data.
- **Seller review** — AI-provided identification is presented as assistance; sellers can check and correct listing information before publication.

AI features require `GEMINI_API_KEY` and `GEMINI_MODEL`. Availability and usage limits are enforced by the application.

---

## ⏱️ Scheduled Reservation Cleanup

Frugl exposes a protected endpoint at `/api/cron/release-reservations` to release expired listing reservations. The GitHub Actions workflow at `.github/workflows/ci-and-keepalive.yml` calls it every 15 minutes.

To enable scheduled cleanup in the deployed environment:

1. Set `CRON_SECRET` in the production environment.
2. Add a GitHub Actions repository secret named `CRON_SECRET` with the same long random value.
3. Add a repository variable named `PRODUCTION_SITE_URL` containing the deployed site URL.

The workflow also performs a periodic Supabase keep-alive query. Configure the required Supabase URL and publishable-key repository secrets for that scheduled job.

---

## 💾 Admin Database Backups

The admin dashboard can dispatch `.github/workflows/database-backup.yml`, which runs `pg_dump` on GitHub Actions and uploads the plain SQL snapshot to a private `admin-backups` Supabase Storage bucket. Administrators can list and download completed backups from `/admin/backups`; each download URL is short-lived and issued only after an active admin check.

To enable this feature:

1. Apply `supabase/13_admin_review_and_backups.sql` to create the private storage bucket and listing-review fields.
2. Add GitHub repository secrets named `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SECRET_KEY`. Use a direct PostgreSQL connection string for `SUPABASE_DB_URL` (not a transaction-mode pooler connection).
3. Configure the application environment with `GITHUB_REPOSITORY`, `GITHUB_BACKUP_REF` (usually `main`), and `GITHUB_ACTIONS_TOKEN`. The fine-grained token needs Actions: write permission for this repository.
4. Ensure `.github/workflows/database-backup.yml` is present on the selected ref and trigger a backup from the admin dashboard.

The SQL dump includes sensitive database contents, including authentication records. Keep the GitHub secrets and downloaded files private. Backups remain in the private bucket until an authorized operator removes them.

---

## 📁 Project Structure (Highlights)

```text
src/
  app/                                  — Next.js App Router routes and layouts
    @authModal/                         — Intercepted authentication and post-sale review dialogs
      (.)login/page.tsx
      (.)reviews/new/page.tsx           — Intercepted post-sale review dialog
      (.)register/page.tsx
      (.)forgot-password/page.tsx
      [...catchAll]/page.tsx
    account/
      page.tsx                          — Account settings route
      AccountForm.tsx                   — Profile, contact, and account form
    account-suspended/page.tsx          — Suspended-account information
    admin/                              — Staff dashboard and moderation tools
      page.tsx                          — Admin overview
      layout.tsx                        — Admin shell and navigation
      loading.tsx                       — Admin route loading state
      AdminSidebar.tsx
      AdminActivityCountBadge.tsx
      AdminActivityViewed.tsx
      AdminPagination.tsx
      activity-actions.ts
      alerts/page.tsx                   — Scam and chat safety alerts
      backups/page.tsx                  — Database backup history and trigger
      backups/AdminBackupsPanel.tsx
      listings/page.tsx                 — Listing approval and visibility controls
      listings/AdminListingReviewActions.tsx
      listings/AdminListingToggle.tsx
      reports/page.tsx                  — User report queue
      reports/ReportQueueItem.tsx
      users/page.tsx                    — User administration
      users/AdminUserRow.tsx
      LocationHeatmapPanel.tsx
      LocationHeatmapPanelLoader.tsx
      error.tsx
    api/                                — Next.js route handlers for application APIs
      auth/session/route.ts             — Create or validate the application session
      auth/session/heartbeat/route.ts   — Extend the idle timeout after user activity
      account/avatar/route.ts           — Account avatar upload
      admin/backups/route.ts            — List backups and dispatch backup jobs
      admin/backups/[filename]/route.ts — Authenticated private backup download
      admin/listings/[id]/review/route.ts — Approve or reject a listing
      admin/users/[id]/route.ts         — Manage roles, verification, and account status
      cron/release-reservations/route.ts — Protected expired-reservation cleanup
      identify/route.ts                 — AI-assisted laptop identification
      listings/route.ts                 — Listing collection operations
      listings/[id]/route.ts            — Individual listing operations
      listings/[id]/photos/route.ts     — Listing photo operations
      listings/[id]/publish/route.ts    — Submit a listing for administrator review
      listings/[id]/status/route.ts     — Listing status changes
      listings/[id]/view/route.ts       — Listing view tracking
      locations/route.ts                — Location suggestions
      messages/route.ts                 — Message operations
      models/route.ts                   — Laptop model lookups
      price-suggestion/route.ts         — Model and condition price suggestions
      search/suggestions/route.ts       — Search autocomplete suggestions
    auth/
      callback/route.ts                 — Supabase authentication callback
      signout/route.ts                  — Sign-out handler
    dashboard/
      page.tsx                          — Seller listing dashboard
      loading.tsx
      ListingActionsMenu.tsx
      ListingStatusNav.tsx
    laptops/
      page.tsx                          — Searchable marketplace catalog
      BrowseIntroShowcase.tsx
      [id]/page.tsx                     — Listing detail page
    messages/
      layout.tsx                        — Messaging layout
      page.tsx                          — Inbox
      InboxShell.tsx
      [id]/page.tsx                     — Conversation route
      [id]/ChatRoom.tsx
    notifications/page.tsx
    offers/page.tsx
    saved/page.tsx                      — Saved listings
    reviews/
      new/page.tsx
      new/ReviewContent.tsx
      new/LeaveReviewForm.tsx
    sellers/[id]/
      page.tsx                          — Public seller profile
      SellerListings.tsx
    sell/
      page.tsx                          — Create-listing flow
      SellForm.tsx
      [id]/page.tsx                     — Edit an existing draft
      [id]/EditDraftForm.tsx
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    verify/page.tsx
    privacy/page.tsx
    safety/page.tsx
    terms/page.tsx
    page.tsx                            — Home page
    layout.tsx                          — Root document, fonts, and providers
    template.tsx                        — Route transition wrapper
    loading.tsx                         — Branded full-page loading state
    error.tsx
    not-found.tsx
    globals.css                         — Global tokens, resets, and shared styles
    styles/                             — Styles grouped by page or UI area
      admin-and-account.css
      auth.css
      final-overrides.css
      home-and-browse.css
      listing-detail.css
      marketplace-pages.css
      responsive-overrides.css
      sell-flow.css
      seller-dashboard.css
      site-shell.css
  components/                           — Reusable UI shared across routes
    AuthForm.tsx
    AuthModalDialog.tsx
    AuthModalLink.tsx
    AuthModalRoute.tsx
    AuthPage.tsx
    BottomBar.tsx
    EmptyState.tsx
    Footer.tsx
    GoogleSignInButton.tsx
    HeaderNavIcons.tsx
    HeaderSearch.tsx
    HeroListingCarousel.tsx
    ListingActions.tsx
    ListingCard.tsx
    ListingCardSaveButton.tsx
    ListingCardSkeleton.tsx
    ListingDetails.tsx
    LocationAutocomplete.tsx
    NotificationBell.tsx
    ProfileMenu.tsx
    ReviewModal.tsx                     — Modal shell for post-sale ratings
    SessionHeartbeat.tsx                — Renews sessions after user activity
    SearchBox.tsx
    SellListingPreview.tsx
    TimeAgo.tsx
    TopBar.tsx
    icons.tsx                           — Shared icon exports
    motion/                             — Shared animation primitives
      MotionProvider.tsx
      BrandLoader.tsx
      PageTransition.tsx
      Reveal.tsx
      Stagger.tsx
      StaggerItem.tsx
      Popover.tsx
      Modal.tsx
      Collapse.tsx
      Toast.tsx
      Chevron.tsx
      TabIndicator.tsx
      Skeleton.tsx
      Banner.tsx
    ui/                                 — Small reusable UI primitives
      badge.tsx
      button.tsx
      card.tsx
      input.tsx
      label.tsx
      textarea.tsx
  lib/                                  — Shared application logic and integrations
    admin/
      location-aggregates.ts
      activity.ts
      member-locations.ts
      pagination.ts
    ai/
      gemini.ts
      match.ts
      prefill.ts
      tier.ts
      types.ts
    auth/
      redirect.ts
      session.ts                        — Server-side session lifecycle helpers
    listings/
      status.ts
      validation.ts
    messages/
      attachments.ts
    supabase/
      admin.ts                          — Server-only privileged client
      client.ts                         — Browser client
      proxy.ts                          — Session and request proxy helpers
      server.ts                         — Server-rendered route client
    api.ts
    auth.ts
    client-image.ts
    condition.ts
    constants.ts
    description.ts
    format.ts
    location-validation.ts
    images.ts
    motion.ts                           — Shared animation tokens and variants
    price.ts
    queries.ts
    saved-listings-events.ts
    scam.ts
    supabase.ts
    ui.ts
    usage-policy.ts
    usage.ts
    utils.ts
supabase/                               — Ordered database setup and update scripts
  01_schema.sql
  02_policies.sql
  03_seed.sql
  04_admin_marketplace_restrictions.sql
  05_demo_laptops_seed.sql
  06_saved_listing_sold_notifications.sql
  07_message_attachments.sql
  08_listing_published_notifications.sql
  09_public_seller_contact_email.sql
  10_secure_scheduled_functions.sql
  11_auth_authorization_and_indexes.sql
  12_public_profile_details.sql
  13_admin_review_and_backups.sql
  14_location_coordinates.sql
  15_chat_alert_status.sql
  16_listing_sales_and_reviews.sql
  17_session_lifecycle.sql
  18_conversation_insert_policy.sql
scripts/
  backfill-location-geocodes.ts         — Dry-run-first Photon location cache backfill
test/
  admin-pagination.test.ts
  core.test.ts
  location-aggregates.test.ts
.github/
  workflows/
    ci-and-keepalive.yml                — Lint, test, build, keep-alive, and cron jobs
    database-backup.yml                 — Manual PostgreSQL dump and private Storage upload
```

At a glance, `app/` owns route-specific pages and UI, `components/` contains shared interface building blocks, and `lib/` holds reusable business logic and integrations. The numbered `supabase/` scripts define the database setup sequence; `test/` contains the Vitest suite.

---

## 🧪 Development Checks

```bash
npm run lint
npm test
npm run build
```

---

## 📄 License

No license file is currently included in this repository. Do not assume that the source code is licensed for redistribution or reuse; check with the project owner before doing so.
