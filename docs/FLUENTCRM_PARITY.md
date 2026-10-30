# FluentCRM parity map

Reference: the locally installed FluentCRM Pro workspace at `bakhtech.local/wp-admin/admin.php?page=fluentcrm-admin#/` and the `fluent-crm` plus `fluentcampaign-pro` plugin source. The observed WordPress navigation includes Dashboard, Contacts, Emails, Forms, Automations, Reports, Settings, Addons, and Help. This is a feature map, not a claim of full plugin equivalence.

The CRM mark in `frontend/public/fluentcrm-logo.svg` was copied from the locally installed FluentCRM 3.0.2 plugin (`assets/images/fluentcrm-logo.svg`). The plugin header identifies it as GPLv2 or later, authored by WP Email Newsletter Team – FluentCRM.

| Reference section | Bakhtech state |
| --- | --- |
| Dashboard | Native metrics, growth, recent records, setup checklist, email performance, and quick links. Dedicated FluentCRM-style shell. |
| Contacts, Lists, Tags, Segments | Native contact profiles, search/filter, CSV import/export, subscription status, lists/tags, saved segments, and linked business records. Advanced custom fields, merge, bulk deletion, and complete FluentCRM filter logic remain. |
| Email Campaigns | Native draft/setup, audience, sending, deliveries, three distinct email editors, templates, patterns, and activities. Open/click tracking and all WordPress editor blocks remain. |
| Recurring Campaigns, Sequences | Native scheduled sends, step delays, enrollment, history, pause, duplicate, and retry. Advanced scheduling rules and plugin-specific triggers remain. |
| Automations | Native contact-created and stage-changed triggers with ordered list/tag and task actions. Funnel list has search, filters, run counts, activity history, duplicate, and pause/run. Conditional branching, waits, benchmarks, email actions, and the full WordPress trigger/action library remain. |
| Reports | Native CRM overview, contact growth, email delivery/activity, and business revenue/lead summaries. Plugin engagement reports that require open/click tracking remain. |
| Forms | The reference page is an integration view over Fluent Forms WordPress data. Bakhtech now shows its contact, quote, and booking forms with real submission counts and links to source contacts. It does not provide the separate Fluent Forms builder. |
| Settings | Native CRM page for SMTP sender configuration, test email, and delivery history, backed by the site's existing mail API. FluentCRM-specific compliance, custom fields, import, and integration settings remain. |
| Addons, Help | WordPress add-on management and in-product help screens remain. |

## Architecture decision

The WordPress plugin cannot run inside Laravel without WordPress bootstrap, hooks, authentication, and database tables. Embedding its admin page would keep a separate authenticated WordPress workspace and separate customer data. The current implementation uses Laravel tables, the existing admin token and roles, and the existing mail transport. Copying bundled plugin JavaScript into React would not make its actions work against the Laravel API.

## Verification

The CRM feature tests cover contacts, campaigns, ordered automation actions, recurring sends, sequences, permissions, subscription exclusions, and idempotent scheduling. The frontend production build checks TypeScript and bundles. The locally running app and scheduler can be inspected at `http://127.0.0.1:5173/admin/dashboard`; production requires the Laravel scheduler to run every minute.
