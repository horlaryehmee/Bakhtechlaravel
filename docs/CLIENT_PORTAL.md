# Client portal implementation

## Audit — 4 November 2026

- Laravel 13.13, PHP 8.3, React 19, Vite 8, Tailwind 4; MySQL reachable.
- Existing public portfolio `projects` must remain separate from client delivery projects.
- Admin authentication uses `admins`, `admin_sessions`, `AdminToken`, and role middleware.
- Existing CRM, invoices, booking, public pages and user workspace edits must be preserved.
- React compiles into public assets; no production Node process required.

## Implementation checklist

- [x] Audit existing architecture and record implementation plan.
- [ ] Add reversible portal schema, models and ownership authorization.
- [ ] Add client authentication and reuse admin authentication.
- [ ] Add admin clients/projects, milestones and requirements.
- [ ] Add responsive client workspace with real database summaries.
- [ ] Add product draft/submission/review workflows.
- [ ] Add CSV/XLSX import, preview, image ZIP matching and retry protection.
- [ ] Add dynamic content submission and review.
- [ ] Add private files and authorized downloads.
- [ ] Add notifications and activity history.
- [ ] Test isolation, validation, workflows, frontend build and runtime.
- [ ] Document deployment and outstanding limitations.

## Design

Light neutral canvas, white work surfaces, charcoal navigation, yellow brand accents,
compact readable tables, consistent status badges, accessible forms and responsive navigation.
Empty states reflect actual data; no seeded client or project metrics.

## Google sign-in and testing — 4 November 2026

- Portal sign-in and sidebar now use the existing `whiteBakhtechLogo` brand asset.
- Existing administrators sign in at `/admin/login`, then select **Client projects**.
- Create client credentials under **Client projects → Clients & team → Add client**.
- `php artisan portal:test-client` creates a local-only test account and prints its generated password once. It does not reset existing accounts or add fictitious projects. No password is stored in this document.
- Configure Google under `/admin/client-projects/settings`. Only administrators can read or edit these settings.
- Google OAuth Client Secret is encrypted with Laravel's application key in the dedicated `portal_auth_settings` table, excluded from all settings responses and from public settings.
- Create a Google OAuth **Web application** client, configure its consent screen, and register the exact callback shown in the settings page. Local default: `http://127.0.0.1:8000/auth/google/callback`.
- Use the same hostname as `APP_URL` to preserve the browser-bound OAuth session. For production, set `APP_URL` to the HTTPS site URL and register its callback with Google. Keep `APP_KEY` stable to decrypt the stored secret.
- Sign-in uses server-side code exchange, PKCE, a browser-session-bound state with a ten-minute expiry, Google UserInfo verification and a one-use short-lived session handoff. Provider tokens and portal tokens are never placed in redirect URLs.
- Only active existing clients may sign in. Initial email matching is restricted to verified Gmail or Google Workspace identities; later logins use Google's stable subject identifier. Unknown users are not auto-registered. Admin sign-in remains unchanged, including existing two-factor authentication.
- Changing a client's email unlinks the prior Google identity and revokes portal sessions. Password changes and deactivation through client management also revoke sessions.
- Google sign-in stays hidden until an administrator saves credentials and enables it. Live provider verification requires the owner's Google Cloud credentials and consent; automated tests fake Google responses.
- Validation: 7 portal/auth tests, 71 assertions passed, covering permissions, workflow isolation, encrypted settings, state rejection, inactive/unknown/unverified identities, and one-use session completion.

## CRM onboarding and passwordless invitations

Client create/edit and account profile validation accept full name, company name,
or both, rejecting submissions with neither. Company-only accounts use the company
as their display name in the existing non-null name field and new CRM contact.
Passwordless links retain their 30-day expiry: indefinite bearer links would add
ongoing access risk if copied or leaked. Revocation and password setup still disable them.

### Paid invoice qualification

Confirmed positive invoice payments now qualify a client for the portal, including
part-payments. Manual payment recording and verified gateway reconciliation invoke
`PaidInvoiceClientService`; a minute-by-minute `portal:sync-paid-clients` scheduled
command also reconciles imported/historical payments and retries missed provisioning.
Run that command manually after importing invoice data. Qualification accepts a
successful positive payment record or a partial/paid invoice with positive amount_paid;
unpaid invoices, quotes, cancelled/rejected invoices and missing/invalid emails are skipped.

Email matching reuses existing CRM contacts and portal accounts. CRM becomes won;
existing contact details/notes, passwords and deactivation are preserved. New accounts
are passwordless and receive one queued invitation. Payment processing is not rolled
back if provisioning fails. Existing `portal:send-invitations` delivers the outbox.
No project scope or delivery dates are guessed from payment: staff assign projects.

Validation: 12 focused payment-qualification/invitation tests, 81 assertions passed.
Local reconciliation found zero qualifying invoices; the inspected local database
contained one invoice document and no invoice payment records.

### Admin dashboard integration

Client directory now provides **Copy passwordless link** (administrator only) and
**View projects** with per-client counts. Project lists support a client filter;
project detail includes a switcher limited to that client's accessible projects.
The switcher keeps the selected tab, except that Products falls back to Overview
for non-ecommerce projects.

To support copying after email delivery, invitation secrets are additionally
stored encrypted using Laravel Crypt; verification still uses their SHA-256 hashes.
The copy endpoint is authenticated, administrator-only, rate-limited and no-store.
It reuses unexpired recoverable secrets, recovers older pending email secrets,
or creates a fresh 30-day link without invalidating previously emailed links.
Revocation/password setup erases encrypted secrets and invalidates access.
No email is sent by copying. Clipboard-denied browsers show a selectable private
link instead. The private link panel is cleared on navigation.
Validation: frontend production build and 16 tests / 137 assertions passed.

Client project management is embedded in the existing admin dashboard at
`/admin/dashboard/client-projects`, alongside CRM. The existing sidebar includes
Overview, All projects, Clients & team, and Google sign-in submenu entries.
Project details keep the main admin sidebar and header; the standalone portal
sidebar/header are omitted in embedded mode. Existing `/admin/client-projects/*`
links redirect to the matching dashboard location. Client-facing `/portal` stays
independent. TypeScript and the production build passed; dashboard, nested project,
legacy and client routes returned HTTP 200. Visual browser verification was not performed.

- Admin **Clients & team → Add client → Find existing details** searches by exact email across portal accounts, CRM contacts, invoice clients, enquiries and bookings. Existing accounts are updated rather than duplicated. A new portal client is linked to an existing CRM contact or creates one. Existing CRM notes and field values are preserved; this is explicit onboarding, not automatic bidirectional overwriting.
- Leave the optional password blank for new passwordless clients. Saving a new active client creates an invitation and attempts email delivery through the existing configured mail transport. Add/assign their project in the existing project form.
- Client rows show invitation delivery status and errors and provide **Send/Resend invitation** and **Revoke links**. Full administrators manage onboarding; assigned staff with `can_manage` may invoke the client invitation endpoint for their assigned project only.
- The invitation contains a **See my dashboard** button and a notice that anyone holding its link can access the portal. The 256-bit random secret is stored as a SHA-256 digest for verification. The link is reusable for 30 days, unless replaced, revoked, deactivated or disabled by a password.
- The secret is carried in a URL fragment, immediately removed from browser history, then exchanged via POST. It is not included in HTTP URLs or referrers. Successful exchange issues a separate hashed portal session token valid for 12 hours.
- Existing accounts retain their password-based behavior. New passwordless clients may set a password without an unknown current password; users who already have a password must supply it when changing passwords. Setting a password atomically revokes all invitation links and other portal sessions. Reopening an old link shows sign-in instead of granting access.
- Google sign-in remains available when configured, using the client's matching Gmail/Google Workspace identity. Connecting Google does not automatically turn off passwordless access; setting a password does.
- Invitation outbox payloads are encrypted with Laravel `APP_KEY`. Payloads are erased after successful mail transport acceptance or cancellation. Email log bodies omit credential-bearing links. `sent` means the mail transport accepted the message, not a guarantee it reached the recipient's inbox.
- Offline delivery or SMTP failures remain retryable and visible. Log/array transports are not treated as real delivery outside tests. `php artisan portal:send-invitations` retries due invitations in bounded batches. The Laravel scheduler runs this every minute; cPanel must run `php /path/to/artisan schedule:run` every minute. No permanent queue worker or Node server is needed.
- A localhost link only works on the same machine. For real clients, deploy the app, use an HTTPS `APP_URL` reachable by those clients, configure SMTP, and issue fresh invitations. Keep `APP_KEY` backed up and unchanged.
- Never store invitation secrets or test passwords in documentation, commits, public logs or CRM notes.
- Verification: production frontend build passed; new React components passed ESLint; 14 portal/auth/invitation tests passed with 119 assertions. Outbound mail was exercised with fake/array transports in isolated tests, not sent to real clients.
